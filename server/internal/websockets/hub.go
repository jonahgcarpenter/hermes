package websockets

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
	Clients    map[uint64]map[*Client]bool
	ServerRooms map[uint64]map[*Client]bool
	Broadcast  chan WsMessage
	Register   chan *Client
	Unregister chan *Client
	JoinRoom    chan RoomUpdate
	LeaveRoom   chan RoomUpdate
}

var Manager = Hub{
	Clients:    make(map[uint64]map[*Client]bool),
	ServerRooms: make(map[uint64]map[*Client]bool),
	Broadcast:  make(chan WsMessage),
	Register:   make(chan *Client),
	Unregister: make(chan *Client),
	JoinRoom:    make(chan RoomUpdate),
	LeaveRoom:   make(chan RoomUpdate),
}

// Run starts an infinite loop that listens for activity on the Hub's channels.
// This runs in its own background goroutine (started in main.go).
func (h *Hub) Run() {
	for {
		select {

		// Client Connected
		case client := <-h.Register:
			// Register User Connection
			if h.Clients[client.UserID] == nil {
				h.Clients[client.UserID] = make(map[*Client]bool)
			}
			h.Clients[client.UserID][client] = true
            
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
				if len(h.Clients[client.UserID]) == 0 {
					delete(h.Clients, client.UserID)
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
