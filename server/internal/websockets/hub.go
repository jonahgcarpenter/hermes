package websockets

import (
	"github.com/gorilla/websocket"
)

type Client struct {
	Conn      *websocket.Conn
	UserID    uint64
	Send   chan WsMessage
}

type WsMessage struct {
	TargetServerID  uint64      `json:"server_id,omitempty"`
	TargetChannelID uint64      `json:"channel_id,omitempty"` 
	Event           string      `json:"event"`
	Data            interface{} `json:"data"`
}

type Hub struct {
	Clients    map[uint64]map[*Client]bool
	Broadcast  chan WsMessage
	Register   chan *Client
	Unregister chan *Client
}

var Manager = Hub{
	Clients:    make(map[uint64]map[*Client]bool),
	Broadcast:  make(chan WsMessage),
	Register:   make(chan *Client),
	Unregister: make(chan *Client),
}

// Run starts an infinite loop that listens for activity on the Hub's channels.
// This runs in its own background goroutine (started in main.go).
func (h *Hub) Run() {
	for {
		select {

		// Client Connected
		case client := <-h.Register:
			if h.Clients[client.UserID] == nil {
				h.Clients[client.UserID] = make(map[*Client]bool)
			}
			h.Clients[client.UserID][client] = true
		
		// Client Disconnected
		case client := <-h.Unregister:
			if _, ok := h.Clients[client.UserID][client]; ok {
				delete(h.Clients[client.UserID], client)
				client.Conn.Close()
				if len(h.Clients[client.UserID]) == 0 {
					delete(h.Clients, client.UserID)
				}
			}
		}
	}
}

func (h *Hub) SendToUsers(userIDs []uint64, msg WsMessage) {
	for _, id := range userIDs {
		// If the user is currently online (exists in the Clients map)
		if userConns, ok := h.Clients[id]; ok {
			for client := range userConns {
				// Safely drop the message into the client's write channel
				client.Send <- msg
			}
		}
	}
}
