package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/ws"
)

type ChatController struct {
	Hub *ws.Hub
}

func NewChatController(hub *ws.Hub) *ChatController {
	return &ChatController{Hub: hub}
}

func (cc *ChatController) HandleWS(c *gin.Context) {
	ws.ServeWS(cc.Hub, c)
}

func (cc *ChatController) GetMessages(c *gin.Context) {
	channelID := c.Param("channelId")

	var messages []models.Message

	result := database.DB.Where("channel_id = ?", channelID).
		Preload("User").
		Order("created_at asc").
		Find(&messages)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, messages)
}
