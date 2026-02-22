package websockets

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/pion/webrtc/v3"
	"github.com/jonahgcarpenter/hermes/server/internal/sfu"
)

func ServeVoiceWS(c *gin.Context) {
	userIDObj, exists := c.Get("user_id")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDObj.(uint64)

	channelIDStr := c.Param("channelID")
	channelID, _ := strconv.ParseUint(channelIDStr, 10, 64)

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to set websocket upgrade:", err)
		return
	}
	defer ws.Close()

	// We create a channel to queue outbound messages
	send := make(chan WsMessage, 256)
	go func() {
		for msg := range send {
			if err := ws.WriteJSON(msg); err != nil {
				log.Println("Websocket write error:", err)
				break
			}
		}
	}()
	defer close(send)

	// Initialize Pion WebRTC
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	}
	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Println("Failed to create PeerConnection:", err)
		return
	}

	// Handle Renegotiation
	peerConnection.OnNegotiationNeeded(func() {
		offer, err := peerConnection.CreateOffer(nil)
		if err != nil {
			log.Println("Failed to create offer:", err)
			return
		}
		
		if err = peerConnection.SetLocalDescription(offer); err != nil {
			log.Println("Failed to set local description:", err)
			return
		}

		// Push the new offer down to the client via our safe write channel
		send <- WsMessage{
			Event: "WEBRTC_OFFER",
			Data:  offer,
		}
	})

	// Handle Pion generating local ICE candidates
	peerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			return
		}
		send <- WsMessage{
			Event: "ICE_CANDIDATE",
			Data:  c.ToJSON(),
		}
	})

	// Register this user with our SFU Room Manager
	room := sfu.Manager.GetOrCreateRoom(channelID)
	room.AddPeer(userID, peerConnection)

	defer room.RemovePeer(userID)

	// The WebSocket Listening Loop
	for {
		var incomingMsg WsMessage
		err := ws.ReadJSON(&incomingMsg)
		if err != nil {
			break // Disconnected
		}

		// Instead of broadcasting to the Hub, we feed the signals directly into Pion
		switch incomingMsg.Event {
		
		case "WEBRTC_OFFER":
			// Browser sent an offer. We decode it, set it, and generate an answer.
			offerStr, _ := json.Marshal(incomingMsg.Data)
			var offer webrtc.SessionDescription
			json.Unmarshal(offerStr, &offer)

			peerConnection.SetRemoteDescription(offer)
			
			answer, _ := peerConnection.CreateAnswer(nil)
			peerConnection.SetLocalDescription(answer)

			// Send the answer back to the browser
			send <- WsMessage{
				Event: "WEBRTC_ANSWER",
				Data:  answer,
			}

		case "WEBRTC_ANSWER":
			// Server initiated an offer via OnNegotiationNeeded, and the browser replied
			answerStr, _ := json.Marshal(incomingMsg.Data)
			var answer webrtc.SessionDescription
			json.Unmarshal(answerStr, &answer)

			peerConnection.SetRemoteDescription(answer)

		case "ICE_CANDIDATE":
			// Browser found a networking route, feed it to Pion
			candidateStr, _ := json.Marshal(incomingMsg.Data)
			var candidate webrtc.ICECandidateInit
			json.Unmarshal(candidateStr, &candidate)

			peerConnection.AddICECandidate(candidate)
		}
	}
}
