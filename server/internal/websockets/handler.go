package websockets

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ServeGlobalWS upgrades the HTTP request to a WebSocket and initializes the client
func ServeGlobalWS(c *gin.Context) {
	userIDObj, exists := c.Get("user_id")
	if !exists {
		log.Println("Unauthorized: User ID not found in context")
		return
	}
	userID := userIDObj.(uint64)

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to set websocket upgrade:", err)
		return
	}

	client := &Client{
		Conn:   ws,
		UserID: userID,
		Send:   make(chan WsMessage, 256),
	}

	// Register with the global Hub
	Manager.Register <- client //

	// Start the read and write pumps in independent background goroutines
	go client.writePump()
	go client.readPump() 
}
