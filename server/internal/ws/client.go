package ws

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	send   chan WSMessage
	UserID uint
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	for {
		var msg WSMessage
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		msg.UserID = c.UserID

		if msg.Type == "join_channel" {
			c.Hub.Subscribe(c, msg.ChannelID)
		} else if msg.Type == "message" {
			dbMsg := models.Message{
				Content:   msg.Content,
				ChannelID: msg.ChannelID,
				UserID:    c.UserID,
			}

			if result := database.DB.Create(&dbMsg); result.Error != nil {
				log.Printf("Error saving message: %v", result.Error)
				continue
			}

			var user models.User
			if result := database.DB.First(&user, c.UserID); result.Error != nil {
				log.Printf("Error fetching user: %v", result.Error)
				msg.Username = "Unknown"
			} else {
				msg.Username = user.Name
				msg.UserAvatar = user.AvatarURL
			}

			msg.ID = fmt.Sprintf("%d", dbMsg.ID)

			c.Hub.broadcast <- msg
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.WriteJSON(message)

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func ServeWS(hub *Hub, c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}

	// TODO: Retrieve the real UserID from the context or query param
	// For now, hardcoding to 1 for testing
	// userID := c.MustGet("userID").(uint) 
	userID := uint(1)

	client := &Client{Hub: hub, Conn: conn, send: make(chan WSMessage, 256), UserID: userID}
	client.Hub.register <- client

	go client.writePump()
	go client.readPump()
}
