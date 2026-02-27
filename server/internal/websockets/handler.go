package websockets

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
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

	// Query DB for all servers this user is actively a member of
	var userServers []uint64
	err := database.DB.Model(&models.ServerMember{}).
		Where("user_id = ? AND left_at IS NULL", userID).
		Pluck("server_id", &userServers).Error

	if err != nil {
		log.Printf("Warning: Failed to fetch servers for user %d: %v", userID, err)
		// Default to an empty slice so the WebSocket connection still succeeds (for DMs, etc.)
		userServers = []uint64{}
	}

	ws, upgradeErr := upgrader.Upgrade(c.Writer, c.Request, nil)
	if upgradeErr != nil {
		log.Println("Failed to set websocket upgrade:", upgradeErr)
		return
	}

	client := &Client{
		Conn:      ws,
		UserID:    userID,
		ServerIDs: userServers,
		Send:      make(chan WsMessage, 256),
	}

	// Register with the global Hub
	Manager.Register <- client

	// Start the read and write pumps in independent background goroutines
	go client.writePump()
	go client.readPump()
}
