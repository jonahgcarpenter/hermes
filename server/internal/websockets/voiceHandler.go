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

	// Register this user with our SFU Room Manager
	room := sfu.Manager.GetOrCreateRoom(channelID)
	room.AddPeer(userID, peerConnection)

	defer room.RemovePeer(userID)

	// Handle Pion generating local ICE candidates
	peerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			return
		}
		ws.WriteJSON(WsMessage{
			Event: "ICE_CANDIDATE",
			Data:  c.ToJSON(),
		})
	})

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
			ws.WriteJSON(WsMessage{
				Event: "WEBRTC_ANSWER",
				Data:  answer,
			})

		case "ICE_CANDIDATE":
			// Browser found a networking route, feed it to Pion
			candidateStr, _ := json.Marshal(incomingMsg.Data)
			var candidate webrtc.ICECandidateInit
			json.Unmarshal(candidateStr, &candidate)

			peerConnection.AddICECandidate(candidate)
		}
	}
}
