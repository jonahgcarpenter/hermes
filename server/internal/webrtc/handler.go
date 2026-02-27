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
	Conn   *websocket.Conn
	UserID uint64
	Send   chan websockets.WsMessage
}

// VoiceRegistry safely holds all active signaling connections
var VoiceRegistry = struct {
	sync.RWMutex
	Clients map[uint64]*VoiceClient
}{Clients: make(map[uint64]*VoiceClient)}

func ServeVoiceWS(c *gin.Context) {
	userIDObj, exists := c.Get("user_id")
	if !exists {
		log.Println("Unauthorized: User ID not found in context")
		return
	}
	userID := userIDObj.(uint64)

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to upgrade voice websocket:", err)
		return
	}

	client := &VoiceClient{
		Conn:   ws,
		UserID: userID,
		Send:   make(chan websockets.WsMessage, 256),
	}

	VoiceRegistry.Lock()
	VoiceRegistry.Clients[userID] = client
	VoiceRegistry.Unlock()

	go client.writePump()
	go client.readPump()
}

func (c *VoiceClient) readPump() {
	defer func() {
		log.Printf("[Voice WS] User %d disconnected. Cleaning up.", c.UserID)
		VoiceRegistry.Lock()
		delete(VoiceRegistry.Clients, c.UserID)
		VoiceRegistry.Unlock()
		c.Conn.Close()

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
	for {
		var msg websockets.WsMessage
		if err := c.Conn.ReadJSON(&msg); err != nil {
			log.Printf("[Voice WS] Read error or disconnect for User %d: %v", c.UserID, err)
			break
		}
		RouteVoiceMessage(c, msg)
	}
}

func (c *VoiceClient) writePump() {
	defer c.Conn.Close()
	for msg := range c.Send {
		if err := c.Conn.WriteJSON(msg); err != nil {
			break
		}
	}
}
