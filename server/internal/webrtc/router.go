// TODO: REMOVE DEBUGGING
package webrtc

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/pion/webrtc/v3"

	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/websockets"
)

// RouteVoiceMessage determines what to do with incoming signaling data.
func RouteVoiceMessage(c *VoiceClient, msg websockets.WsMessage) {
	switch msg.Event {
	case "WEBRTC_OFFER":
		handleOffer(c, msg)
	case "ICE_CANDIDATE":
		handleIceCandidate(c, msg)
	default:
		log.Printf("[WebRTC Router] Unknown voice event type received: %s", msg.Event)
	}
}

// The client proposes connection details (the Offer), and the server Responds.
func handleOffer(c *VoiceClient, msg websockets.WsMessage) {
	log.Printf("[WebRTC Router] Processing WEBRTC_OFFER for User %d", c.UserID)

	// Decode the WebRTC Offer from the JSON payload
	dataBytes, _ := json.Marshal(msg.Data)
	var offer webrtc.SessionDescription
	if err := json.Unmarshal(dataBytes, &offer); err != nil {
		log.Printf("[WebRTC Error] Invalid offer format: %v", err)
		return
	}

	// Fetch User details for the UI
	var user models.User
	database.DB.Select("id", "display_name", "avatar_url").Where("id = ?", c.UserID).First(&user)

	// Fetch Server ID to know who to broadcast to
	var channel models.Channel
	database.DB.Select("server_id").Where("id = ?", msg.TargetChannelID).First(&channel)

	// Save this context to the client so we can use it when they disconnect
	c.ActiveChannelID = msg.TargetChannelID
	c.ActiveServerID = channel.ServerID

	// Broadcast the JOIN event to the Global Hub
	websockets.Manager.Broadcast <- websockets.WsMessage{
		TargetServerID: channel.ServerID,
		Event:          "VOICE_STATE_UPDATE",
		Data: map[string]interface{}{
			"channel_id": fmt.Sprintf("%d", msg.TargetChannelID), 
			"action":     "join",
			"user": map[string]interface{}{
				"id":         user.ID,
				"name":       user.DisplayName,
				"avatar_url": user.AvatarURL,
			},
		},
	}

	// Set up the Pion WebRTC PeerConnection
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	}
	pc, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Printf("[WebRTC Error] Failed to create PeerConnection: %v", err)
		return
	}
	log.Printf("[WebRTC Router] PeerConnection created for User %d", c.UserID)

	// Setup ICE Candidate listener. As the server figures out its network paths, send them to the client
	pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate == nil {
			return
		}
		log.Printf("[WebRTC Router] >>> Sending Server ICE Candidate to User %d", c.UserID)
		c.Send <- websockets.WsMessage{
			TargetChannelID: msg.TargetChannelID,
			Event:           "ICE_CANDIDATE",
			Data:            candidate.ToJSON(),
		}
	})

	pc.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
		log.Printf("[WebRTC Router] Peer Connection State for User %d has changed: %s", c.UserID, s.String())
	})

	// Register the newly created PeerConnection with the SFU Room Manager
	room := Manager.GetOrCreateRoom(msg.TargetChannelID)
	room.AddPeer(c.UserID, pc)

	// Accept the client's offer (Remote Description)
	if err := pc.SetRemoteDescription(offer); err != nil {
		log.Printf("[WebRTC Error] Failed to set remote description: %v", err)
		return
	}
	log.Printf("[WebRTC Router] Remote Description set successfully")

	// Generate the Server's answer (Local Description)
	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		log.Printf("[WebRTC Error] Failed to create answer: %v", err)
		return
	}

	if err := pc.SetLocalDescription(answer); err != nil {
		log.Printf("[WebRTC Error] Failed to set local description: %v", err)
		return
	}
	log.Printf("[WebRTC Router] Local Description (Answer) set successfully")

	// Send the Answer back to the client over the WebSocket
	log.Printf("[WebRTC Router] >>> Sending WEBRTC_ANSWER to User %d", c.UserID)
	c.Send <- websockets.WsMessage{
		TargetChannelID: msg.TargetChannelID,
		Event:           "WEBRTC_ANSWER",
		Data:            answer,
	}
}

// Receives network routing information from the client and gives it to Pion WebRTC.
func handleIceCandidate(c *VoiceClient, msg websockets.WsMessage) {
	dataBytes, _ := json.Marshal(msg.Data)
	var candidate webrtc.ICECandidateInit
	if err := json.Unmarshal(dataBytes, &candidate); err != nil {
		log.Printf("[WebRTC Error] Invalid ICE candidate format: %v", err)
		return
	}

	room := Manager.GetOrCreateRoom(msg.TargetChannelID)
	
	// Safely retrieve the user's PeerConnection
	room.mu.RLock()
	pc, exists := room.Peers[c.UserID]
	room.mu.RUnlock()

	// If the connection exists, append the new routing candidate
	if exists {
		if err := pc.AddICECandidate(candidate); err != nil {
			log.Printf("[WebRTC Error] Error adding ICE candidate: %v", err)
		} else {
			log.Printf("[WebRTC Router] Successfully added Client ICE Candidate for User %d", c.UserID)
		}
	} else {
		log.Printf("[WebRTC Warning] Received ICE candidate but no PC found for user %d", c.UserID)
	}
}
