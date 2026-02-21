package websockets

import (
	"log"

	"github.com/gorilla/websocket"
)

type Client struct {
	Conn      *websocket.Conn
	ChannelID uint64
	UserID    uint64
}

type WsMessage struct {
	TargetChannelID uint64      `json:"-"` 
	Event           string      `json:"event"`
	Data            interface{} `json:"data"`
}

type Hub struct {
	Rooms      map[uint64]map[*Client]bool
	Broadcast  chan WsMessage
	Register   chan *Client
	Unregister chan *Client
}

var Manager = Hub{
	Rooms:      make(map[uint64]map[*Client]bool),
	Broadcast:  make(chan WsMessage),
	Register:   make(chan *Client),
	Unregister: make(chan *Client),
}

// Run starts an infinite loop that listens for activity on the Hub's channels.
// This runs in its own background goroutine (started in main.go).
func (h *Hub) Run() {
	for {
		// `select` blocks until one of the cases receives data.
		select {
		case client := <-h.Register:
			// A new user connected
			// If this is the first person to join this ChannelID, we need to initialize the inner map first.
			if h.Rooms[client.ChannelID] == nil {
				h.Rooms[client.ChannelID] = make(map[*Client]bool)
			}
			// Add the client to the room
			h.Rooms[client.ChannelID][client] = true

		case client := <-h.Unregister:
			// A user disconnected
			// Check if they are actually in the room map
			if _, ok := h.Rooms[client.ChannelID][client]; ok {
				// Remove them from the map and close their connection socket
				delete(h.Rooms[client.ChannelID], client)
				client.Conn.Close()
				
				// If the room is now empty, delete the room completely 
				if len(h.Rooms[client.ChannelID]) == 0 {
					delete(h.Rooms, client.ChannelID)
				}
			}

		case message := <-h.Broadcast:
			// The API controllers sent a new message
			// Find the specific room matching the TargetChannelID
			if room, ok := h.Rooms[message.TargetChannelID]; ok {
				// Loop through every connected client in this specific room
				for client := range room {
					// Convert the WsMessage to JSON and send it over the socket
					err := client.Conn.WriteJSON(message)
					if err != nil {
						// If writing fails (e.g., their internet dropped unexpectedly),
						// clean them up forcefully.
						log.Printf("WS error: %v", err)
						client.Conn.Close()
						delete(room, client)
					}
				}
			}
		}
	}
}
