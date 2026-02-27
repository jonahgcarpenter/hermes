package websockets

import (
	"fmt"
	"time"

	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
)

type OfflineRequest struct {
	UserID    uint64
	ServerIDs []uint64
}

type WsMessage struct {
	TargetServerID  uint64      `json:"server_id,string,omitempty"`
	TargetChannelID uint64      `json:"channel_id,string,omitempty"`
	Event           string      `json:"event"`
	Data            interface{} `json:"data"`
}

type RoomUpdate struct {
	UserID   uint64
	ServerID uint64
}

type Hub struct {
	Clients         map[uint64]map[*Client]bool
	ServerRooms     map[uint64]map[*Client]bool
	Broadcast       chan WsMessage
	Register        chan *Client
	Unregister      chan *Client
	JoinRoom        chan RoomUpdate
	LeaveRoom       chan RoomUpdate
	OfflineTimers   map[uint64]*time.Timer
	FinalizeOffline chan OfflineRequest
}

var Manager = Hub{
	Clients:         make(map[uint64]map[*Client]bool),
	ServerRooms:     make(map[uint64]map[*Client]bool),
	Broadcast:       make(chan WsMessage),
	Register:        make(chan *Client),
	Unregister:      make(chan *Client),
	JoinRoom:        make(chan RoomUpdate),
	LeaveRoom:       make(chan RoomUpdate),
	OfflineTimers:   make(map[uint64]*time.Timer),
	FinalizeOffline: make(chan OfflineRequest),
}

// Run starts an infinite loop that listens for activity on the Hub's channels.
// This runs in its own background goroutine (started in main.go).
func (h *Hub) Run() {
	for {
		select {

		// Client Connected
		case client := <-h.Register:
			// Cancel pending offline status
			if timer, exists := h.OfflineTimers[client.UserID]; exists {
				timer.Stop()
				delete(h.OfflineTimers, client.UserID)
			}

			// Check if this is their first active connection before we add them
			isFirstConnection := len(h.Clients[client.UserID]) == 0

			// Register User Connection
			if h.Clients[client.UserID] == nil {
				h.Clients[client.UserID] = make(map[*Client]bool)
			}
			h.Clients[client.UserID][client] = true

			// If this is their FIRST connection, broadcast online
			if isFirstConnection {
				// Update database
				database.DB.Model(&models.User{}).Where("id = ?", client.UserID).Update("status", "online")

				// Broadcast to all their servers using their hydrated ServerIDs array
				for _, serverID := range client.ServerIDs {
					onlineMsg := WsMessage{
						TargetServerID: serverID,
						Event:          "PRESENCE_UPDATE",
						Data: map[string]interface{}{
							"user_id": fmt.Sprintf("%d", client.UserID),
							"status":  "online",
						},
					}

					// Fire in a goroutine to prevent deadlocking the Hub's Run() loop
					go func(msg WsMessage) {
						h.Broadcast <- msg
					}(onlineMsg)
				}
			}

			// Register Server Subscriptions (The Fan-Out Map)
			for _, serverID := range client.ServerIDs {
				if h.ServerRooms[serverID] == nil {
					h.ServerRooms[serverID] = make(map[*Client]bool)
				}
				h.ServerRooms[serverID][client] = true
			}

		// Client Disconnected
		case client := <-h.Unregister:
			if _, ok := h.Clients[client.UserID][client]; ok {
				// Clean up User Connections
				delete(h.Clients[client.UserID], client)

				// If this was their LAST active connection
				if len(h.Clients[client.UserID]) == 0 {
					delete(h.Clients, client.UserID)

					// Instantly set them to "away" in the database
					database.DB.Model(&models.User{}).Where("id = ?", client.UserID).Update("status", "away")

					// Instantly broadcast the "away" status to the UI
					for _, serverID := range client.ServerIDs {
						awayMsg := WsMessage{
							TargetServerID: serverID,
							Event:          "PRESENCE_UPDATE",
							Data: map[string]interface{}{
								"user_id": fmt.Sprintf("%d", client.UserID),
								"status":  "away",
							},
						}
						go func(msg WsMessage) {
							h.Broadcast <- msg
						}(awayMsg)
					}

					// Safely copy the slice so it isn't garbage collected
					userID := client.UserID
					serverIDs := append([]uint64(nil), client.ServerIDs...)

					// Start a 60-second timer
					timer := time.AfterFunc(60*time.Second, func() {
						// Send the request back to the thread-safe Hub loop
						h.FinalizeOffline <- OfflineRequest{
							UserID:    userID,
							ServerIDs: serverIDs,
						}
					})
					h.OfflineTimers[userID] = timer
				}

				// Clean up Server Rooms
				for _, serverID := range client.ServerIDs {
					if _, roomExists := h.ServerRooms[serverID]; roomExists {
						delete(h.ServerRooms[serverID], client)
						// Clean up empty server rooms to save memory
						if len(h.ServerRooms[serverID]) == 0 {
							delete(h.ServerRooms, serverID)
						}
					}
				}
				client.Conn.Close()
			}

		// Execute Delayed Offline
		case req := <-h.FinalizeOffline:
			// Double-check they didn't magically reconnect exactly as the timer fired
			if len(h.Clients[req.UserID]) == 0 {

				database.DB.Model(&models.User{}).Where("id = ?", req.UserID).Update("status", "offline")

				for _, serverID := range req.ServerIDs {
					offlineMsg := WsMessage{
						TargetServerID: serverID,
						Event:          "PRESENCE_UPDATE",
						Data: map[string]interface{}{
							"user_id": fmt.Sprintf("%d", req.UserID),
							"status":  "offline",
						},
					}
					// Use a goroutine to send back into h.Broadcast to avoid deadlocks
					go func(msg WsMessage) {
						h.Broadcast <- msg
					}(offlineMsg)
				}
			}
			// Clean up the timer reference
			delete(h.OfflineTimers, req.UserID)

		// Broadcast triggered by HTTP Controllers or Internal Events
		case msg := <-h.Broadcast:
			// Get the Set of connected clients for this Server
			if roomConns, ok := h.ServerRooms[msg.TargetServerID]; ok {
				// Iterate through only the clients who need this message
				for client := range roomConns {
					// Non-blocking send
					select {
					case client.Send <- msg:
						// Successfully pushed to the client's send buffer
					default:
						// The client's buffer is full (dead or stuck connection).
						// Close the channel. The writePump will error out,
						// close the socket, and trigger the Unregister flow cleanly.
						close(client.Send)

						// Remove them from the routing maps immediately to prevent retries
						delete(h.ServerRooms[msg.TargetServerID], client)
						if _, userOk := h.Clients[client.UserID][client]; userOk {
							delete(h.Clients[client.UserID], client)
						}
					}
				}
			}
		// User joins a new server
		case req := <-h.JoinRoom:
			// Check if this user currently has any active connections
			if userConns, ok := h.Clients[req.UserID]; ok {
				for client := range userConns {
					// Add them to the ServerRooms fan-out map
					if h.ServerRooms[req.ServerID] == nil {
						h.ServerRooms[req.ServerID] = make(map[*Client]bool)
					}
					h.ServerRooms[req.ServerID][client] = true

					// Add to their personal tracker so disconnect cleanup works
					// (Avoid duplicates just in case)
					alreadySubscribed := false
					for _, id := range client.ServerIDs {
						if id == req.ServerID {
							alreadySubscribed = true
							break
						}
					}
					if !alreadySubscribed {
						client.ServerIDs = append(client.ServerIDs, req.ServerID)
					}
				}
			}

		// User leaves a server
		case req := <-h.LeaveRoom:
			if userConns, ok := h.Clients[req.UserID]; ok {
				for client := range userConns {
					// Remove from ServerRooms fan-out map
					if roomConns, exists := h.ServerRooms[req.ServerID]; exists {
						delete(roomConns, client)
						// Memory cleanup
						if len(roomConns) == 0 {
							delete(h.ServerRooms, req.ServerID)
						}
					}

					// Remove from their personal tracker slice
					for i, id := range client.ServerIDs {
						if id == req.ServerID {
							client.ServerIDs = append(client.ServerIDs[:i], client.ServerIDs[i+1:]...)
							break
						}
					}
				}
			}
		}
	}
}
