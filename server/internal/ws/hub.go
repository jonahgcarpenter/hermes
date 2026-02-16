package ws

import (
	"sync"
	"log"

	"github.com/jonahgcarpenter/hermes/server/internal/sfu"
)

type WSMessage struct {
	Type       string      `json:"type"`
	ChannelID  uint        `json:"channel_id"`
	UserID     uint        `json:"user_id"`
	Content    string      `json:"content"`
	ID         string      `json:"id"`
	Username   string      `json:"username"`
	UserAvatar string      `json:"user_avatar"`
	Data       interface{} `json:"data,omitempty"`
}

type Hub struct {
	clients    map[*Client]bool
	channels   map[uint]map[*Client]bool
	broadcast  chan WSMessage
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	SFU        *sfu.SFU
}

func NewHub() *Hub {
	h := &Hub{
		broadcast:  make(chan WSMessage),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		channels:   make(map[uint]map[*Client]bool),
	}

	signalSender := func(targetUserID uint, data interface{}) {
		h.mu.RLock()
		defer h.mu.RUnlock()

		for client := range h.clients {
			if client.UserID == targetUserID {
				msg := WSMessage{
					Type: "signal",
					Data: data,
				}

				select {
				case client.send <- msg:
				default:
					close(client.send)
					delete(h.clients, client)
				}
				return
			}
		}
	}

	h.SFU = sfu.NewSFU(signalSender)
	return h
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
				// TODO: Notify SFU of leave
				// h.SFU.Leave(client.UserID)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			if message.Type == "join_voice" {
				h.SFU.Join(message.ChannelID, message.UserID)

				h.mu.Lock()
				var joiningClient *Client
				for c := range h.clients {
					if c.UserID == message.UserID {
						joiningClient = c
						break
					}
				}
				if joiningClient != nil {
					if _, ok := h.channels[message.ChannelID]; !ok {
						h.channels[message.ChannelID] = make(map[*Client]bool)
					}
					h.channels[message.ChannelID][joiningClient] = true
				}
				h.mu.Unlock()

				broadcastMsg := message
				broadcastMsg.Type = "user_joined_voice"
				
				h.mu.RLock()
				if subscribers, ok := h.channels[message.ChannelID]; ok {
					for client := range subscribers {
						select {
						case client.send <- broadcastMsg:
						default:
							close(client.send)
							delete(h.clients, client)
						}
					}
				}
				h.mu.RUnlock()
				continue
			} else if message.Type == "offer" || message.Type == "answer" || message.Type == "ice_candidate" {
				log.Printf("[Hub] Routing signal %s from User %d to SFU", message.Type, message.UserID)
				h.SFU.HandleSignal(message.UserID, message.Type, message.Data)
				continue
			}

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
