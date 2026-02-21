package websockets

import (
	"strconv"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	// In production, check if `r.Header.Get("Origin")` matches actual domain
	CheckOrigin: func(r *http.Request) bool {
		return true 
	},
}

func ServeMessageWS(c *gin.Context) {
	// Identity Check
	userIDObj, exists := c.Get("user_id")
	if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
	}
	userID := userIDObj.(uint64)
	
	// Room Check
	channelIDStr := c.Param("channelID")
	channelID, _ := strconv.ParseUint(channelIDStr, 10, 64)

	// The Upgrade
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to set websocket upgrade:", err)
		return
	}

	// Client Creation
	client := &Client{
		Conn:      ws,
		ChannelID: channelID,
		UserID:    userID,
	}

	// Registration
	Manager.Register <- client

	// Cleanup Guarantee
	defer func() {
		Manager.Unregister <- client
	}()

	// The Keep-Alive Loop
	for {
		_, _, err := ws.ReadMessage()
		if err != nil {
			break
		}
	}
}
