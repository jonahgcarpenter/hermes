package ws

import (
	"sync"
)

type WSMessage struct {
	Type       string `json:"type"`
	ChannelID  uint   `json:"channel_id"`
	UserID     uint   `json:"user_id"`
	Content    string `json:"content"`
	ID         string `json:"id"`
	Username   string `json:"username"`
	UserAvatar string `json:"user_avatar"`
}

type Hub struct {
	clients map[*Client]bool
	channels map[uint]map[*Client]bool
	broadcast chan WSMessage
	register chan *Client
	unregister chan *Client
	mu sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan WSMessage),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		channels:   make(map[uint]map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				for _, subscribers := range h.channels {
					delete(subscribers, client)
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			if subscribers, ok := h.channels[message.ChannelID]; ok {
				for client := range subscribers {
					select {
					case client.send <- message:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Subscribe(client *Client, channelID uint) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	if _, ok := h.channels[channelID]; !ok {
		h.channels[channelID] = make(map[*Client]bool)
	}
	h.channels[channelID][client] = true
}
