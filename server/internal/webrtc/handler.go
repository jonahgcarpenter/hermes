// TODO: REMOVE DEBUGGING
package webrtc

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/jonahgcarpenter/hermes/server/internal/websockets"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// VoiceClient represents a 1-to-1 WebRTC signaling connection
type VoiceClient struct {
	Conn            *websocket.Conn
	UserID          uint64
	ActiveChannelID uint64
	ActiveServerID  uint64
	Send            chan websockets.WsMessage
}

// VoiceRegistry safely holds all active signaling connections
var VoiceRegistry = struct {
	sync.RWMutex
	Clients map[uint64]*VoiceClient
}{Clients: make(map[uint64]*VoiceClient)}

func ServeVoiceWS(c *gin.Context) {
	// Extract the authenticated user ID from the middleware context
	userIDObj, exists := c.Get("user_id")
	if !exists {
		log.Println("Unauthorized: User ID not found in context")
		return
	}
	userID := userIDObj.(uint64)

	// Upgrade the HTTP connection to a WebSocket connection
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to upgrade voice websocket:", err)
		return
	}

	// Initialize the client wrapper
	client := &VoiceClient{
		Conn:   ws,
		UserID: userID,
		Send:   make(chan websockets.WsMessage, 256), // Buffered channel for outgoing messages
	}

	// Register the client in the global VoiceRegistry
	VoiceRegistry.Lock()
	VoiceRegistry.Clients[userID] = client
	VoiceRegistry.Unlock()

	// Start the read and write pumps in separate goroutines
	go client.writePump()
	go client.readPump()
}

// Continuously listens for incoming WebSocket messages from the client.
func (c *VoiceClient) readPump() {
	defer func() {
		log.Printf("[Voice WS] User %d disconnected. Cleaning up.", c.UserID)
		// Remove the client from the registry
		VoiceRegistry.Lock()
		delete(VoiceRegistry.Clients, c.UserID)
		VoiceRegistry.Unlock()
		c.Conn.Close()

		// Broadcast user leave
		if c.ActiveChannelID != 0 {
			websockets.Manager.Broadcast <- websockets.WsMessage{
				TargetServerID: c.ActiveServerID,
				Event:          "VOICE_STATE_UPDATE",
				Data: map[string]interface{}{
					"channel_id": c.ActiveChannelID,
					"action":     "leave",
					"user_id":    c.UserID,
				},
			}
		}

		// Gather the rooms safely WITHOUT calling RemovePeer yet
		var activeRooms []*Room

		Manager.mu.RLock()
		for _, room := range Manager.Rooms {
			room.mu.RLock()
			_, exists := room.Peers[c.UserID]
			room.mu.RUnlock()

			if exists {
				activeRooms = append(activeRooms, room)
			}
		}
		Manager.mu.RUnlock() // Release the Manager lock entirely

		// Now it is safe to remove the peer
		for _, room := range activeRooms {
			log.Printf("[Voice WS] Removing User %d from Room %d", c.UserID, room.ID)
			room.RemovePeer(c.UserID)
		}
	}()

	log.Printf("[Voice WS] Started read pump for User %d", c.UserID)

	// Infinite loop to read incoming WS messages
	for {
		var msg websockets.WsMessage
		if err := c.Conn.ReadJSON(&msg); err != nil {
			log.Printf("[Voice WS] Read error or disconnect for User %d: %v", c.UserID, err)
			break
		}
		// Pass the message to the WebRTC router
		RouteVoiceMessage(c, msg)
	}
}

// Continuously listens on the client's Send channel and pushes messages to the WebSocket.
func (c *VoiceClient) writePump() {
	defer c.Conn.Close()
	for msg := range c.Send {
		if err := c.Conn.WriteJSON(msg); err != nil {
			break
		}
	}
}
