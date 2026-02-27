package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/utils"
	"github.com/jonahgcarpenter/hermes/server/internal/websockets"
)

// Helper function to verify the channelID provided in the URL actually belongs to the serverID
func verifyChannel(c *gin.Context) (uint64, uint64, error) {
	serverID, _ := strconv.ParseUint(c.Param("serverID"), 10, 64)
	channelID, _ := strconv.ParseUint(c.Param("channelID"), 10, 64)

	var channel models.Channel
	// Ensure the channel exists AND belongs to the server in the URL path
	if err := database.DB.Where("id = ? AND server_id = ?", channelID, serverID).First(&channel).Error; err != nil {
		return 0, 0, err
	}

	return serverID, channelID, nil
}

func ListMessages(c *gin.Context) {
	_, channelID, err := verifyChannel(c)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found in this server"})
		return
	}

	var messages []models.Message
	// Preload author so the frontend gets the author's username and avatar right away,
	if err := database.DB.Preload("Author").
		Where("channel_id = ?", channelID).
		Order("created_at asc").
		Limit(50).
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, messages)
}

type SendMessagePayload struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

func SendMessage(c *gin.Context) {
	serverID, channelID, err := verifyChannel(c)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found in this server"})
		return
	}

	var payload SendMessagePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	// Create the message object
	message := models.Message{
		ID:        utils.GenerateID(),
		ChannelID: channelID,
		AuthorID:  userID,
		Content:   payload.Content,
	}

	// Save to the database
	if err := database.DB.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Fetch the message again to populate the Preloaded Author data before broadcasting.
	database.DB.Preload("Author").First(&message, message.ID)

	// Broadcast the new message to the WebSocket Hub so everyone in the channel sees it instantly.
	websockets.Manager.Broadcast <- websockets.WsMessage{
		TargetServerID:  serverID,
		TargetChannelID: channelID,
		Event:           "MESSAGE_CREATE",
		Data:            message,
	}

	c.JSON(http.StatusCreated, message)
}

type EditMessagePayload struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

func EditMessage(c *gin.Context) {
	serverID, channelID, err := verifyChannel(c)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found in this server"})
		return
	}

	// Parse the message ID from the URL (/messages/:messageID)
	messageID, err := strconv.ParseUint(c.Param("messageID"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID format"})
		return
	}

	var payload EditMessagePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch the original message
	var message models.Message
	if err := database.DB.Where("id = ? AND channel_id = ?", messageID, channelID).First(&message).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	// Only the original author can edit their own message
	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	if message.AuthorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only edit your own messages"})
		return
	}

	// Update the specific field in the database
	if err := database.DB.Model(&message).Update("content", payload.Content).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update message"})
		return
	}

	// Preload the author again so the broadcast contains the full object
	database.DB.Preload("Author").First(&message, message.ID)

	// Broadcast the UPDATE event to the WebSocket Hub.
	websockets.Manager.Broadcast <- websockets.WsMessage{
		TargetServerID:  serverID,
		TargetChannelID: channelID,
		Event:           "MESSAGE_UPDATE",
		Data:            message,
	}

	c.JSON(http.StatusOK, message)
}

func DeleteMessage(c *gin.Context) {
	serverID, channelID, err := verifyChannel(c)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found in this server"})
		return
	}

	messageID, err := strconv.ParseUint(c.Param("messageID"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID format"})
		return
	}

	var message models.Message
	if err := database.DB.Where("id = ? AND channel_id = ?", messageID, channelID).First(&message).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	// Grab user identity and their server role from the Gin context
	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	// c.GetString safely returns an empty string if it isn't found
	serverRole := c.GetString("server_role")

	// Can this user delete this message?
	// They must either be the Author, OR have admin/owner privileges in this server.
	if message.AuthorID != userID && serverRole != "admin" && serverRole != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to delete this message"})
		return
	}

	// Soft delete
	if err := database.DB.Delete(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete message"})
		return
	}

	// Broadcast the DELETE event.
	deletePayload := gin.H{"id": strconv.FormatUint(messageID, 10)}

	websockets.Manager.Broadcast <- websockets.WsMessage{
		TargetServerID:  serverID,
		TargetChannelID: channelID,
		Event:           "MESSAGE_DELETE",
		Data:            deletePayload,
	}

	c.JSON(http.StatusNoContent, nil) // 204 No Content is the standard for a successful delete
}
