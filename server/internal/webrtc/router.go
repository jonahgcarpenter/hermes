package webrtc

import (
	"encoding/json"
	"log"

	"github.com/pion/webrtc/v3"
	"github.com/jonahgcarpenter/hermes/server/internal/websockets"
)

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

func handleOffer(c *VoiceClient, msg websockets.WsMessage) {
	log.Printf("[WebRTC Router] Processing WEBRTC_OFFER for User %d", c.UserID)

	dataBytes, _ := json.Marshal(msg.Data)
	var offer webrtc.SessionDescription
	if err := json.Unmarshal(dataBytes, &offer); err != nil {
		log.Printf("[WebRTC Error] Invalid offer format: %v", err)
		return
	}

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

	room := Manager.GetOrCreateRoom(msg.TargetChannelID)
	room.AddPeer(c.UserID, pc)

	if err := pc.SetRemoteDescription(offer); err != nil {
		log.Printf("[WebRTC Error] Failed to set remote description: %v", err)
		return
	}
	log.Printf("[WebRTC Router] Remote Description set successfully")

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

	log.Printf("[WebRTC Router] >>> Sending WEBRTC_ANSWER to User %d", c.UserID)
	c.Send <- websockets.WsMessage{
		TargetChannelID: msg.TargetChannelID,
		Event:           "WEBRTC_ANSWER",
		Data:            answer,
	}
}

func handleIceCandidate(c *VoiceClient, msg websockets.WsMessage) {
	dataBytes, _ := json.Marshal(msg.Data)
	var candidate webrtc.ICECandidateInit
	if err := json.Unmarshal(dataBytes, &candidate); err != nil {
		log.Printf("[WebRTC Error] Invalid ICE candidate format: %v", err)
		return
	}

	room := Manager.GetOrCreateRoom(msg.TargetChannelID)
	
	room.mu.RLock()
	pc, exists := room.Peers[c.UserID]
	room.mu.RUnlock()

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
