package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/utils"
)

func ListChannels(c *gin.Context) {
	// Grab the :serverID from the URL
	serverID, err := strconv.ParseUint(c.Param("serverID"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	var channels []models.Channel
	// Fetch all channels belonging to this server.
	// Order("position asc, name asc"): First sorts by their UI order (0, 1, 2, 3...). 
	// If two channels have the same position, it breaks the tie alphabetically by name.
	if err := database.DB.Where("server_id = ?", serverID).
		Order("position asc, name asc").
		Find(&channels).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch channels"})
		return
	}

	c.JSON(http.StatusOK, channels)
}

type CreateChannelPayload struct {
	Name string             `json:"name" binding:"required,min=1,max=100"`
	Type models.ChannelType `json:"type" binding:"omitempty,oneof=TEXT VOICE"`
}

func CreateChannel(c *gin.Context) {
	serverID, err := strconv.ParseUint(c.Param("serverID"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	var payload CreateChannelPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default to TEXT if the user didn't explicitly specify a type
	channelType := models.ChannelTypeText
	if payload.Type != "" {
		channelType = payload.Type
	}

	// Dont allow duplicate names within the same type
	var existingChannel models.Channel
	err = database.DB.Where("server_id = ? AND name = ? AND type = ?", serverID, payload.Name, channelType).First(&existingChannel).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "A " + string(channelType) + " channel with that name already exists"})
		return
	}

	// Find the current highest position in the server 
	// so we can put this new channel at the bottom of the list automatically!
	var maxPosition int
	database.DB.Model(&models.Channel{}).Where("server_id = ?", serverID).Select("COALESCE(MAX(position), 0)").Scan(&maxPosition)

	channel := models.Channel{
		ID:       utils.GenerateID(), // Snowflake generator
		ServerID: serverID,
		Name:     payload.Name,
		Type:     channelType,
		Position: maxPosition + 1, // Place it at the end
	}

	if err := database.DB.Create(&channel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create channel"})
		return
	}

	c.JSON(http.StatusCreated, channel)
}

type UpdateChannelPayload struct {
	Name     *string `json:"name" binding:"omitempty,min=1,max=100"`
	Position *int    `json:"position" binding:"omitempty,min=0"`
}

func UpdateChannel(c *gin.Context) {
	// Grab IDs from URL
	serverID, _ := strconv.ParseUint(c.Param("serverID"), 10, 64)
	channelID, err := strconv.ParseUint(c.Param("channelID"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	var payload UpdateChannelPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var channel models.Channel
	// Ensure the channel actually belongs to this specific server before modifying it
	if err := database.DB.Where("id = ? AND server_id = ?", channelID, serverID).First(&channel).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}

	// Look for another channel in this server with the SAME new name and SAME type
	if payload.Name != nil && *payload.Name != channel.Name {
		var existingChannel models.Channel
		err := database.DB.Where("server_id = ? AND name = ? AND type = ?", serverID, *payload.Name, channel.Type).First(&existingChannel).Error
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "A " + string(channel.Type) + " channel with that name already exists"})
			return
		}
	}

	// Create a map to hold only the fields we actually want to change
	updates := make(map[string]interface{})
	if payload.Name != nil {
		updates["name"] = *payload.Name
	}
	if payload.Position != nil {
		updates["position"] = *payload.Position
	}

	// Only hit the database if there's actually something to update
	if len(updates) > 0 {
		if err := database.DB.Model(&channel).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update channel"})
			return
		}
	}

	c.JSON(http.StatusOK, channel)
}

func DeleteChannel(c *gin.Context) {
	serverID, _ := strconv.ParseUint(c.Param("serverID"), 10, 64)
	channelID, err := strconv.ParseUint(c.Param("channelID"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	// Verify the channel belongs to the server
	var channel models.Channel
	if err := database.DB.Where("id = ? AND server_id = ?", channelID, serverID).First(&channel).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}

	// Soft-delete channel, and all messages inside this channel
	if err := database.DB.Delete(&channel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete channel"})
		return
	}

	c.JSON(http.StatusNoContent, nil) // 204 No Content
}
