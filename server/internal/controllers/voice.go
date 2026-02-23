package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/websockets"
)

func JoinVoice(c *gin.Context) {
	// Reusing the verifyChannel helper from messages.go to ensure the channel exists in this server
	_, channelID, err := verifyChannel(c)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found in this server"})
		return
	}

	var channel models.Channel
	if err := database.DB.First(&channel, channelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}

	// Verify it is actually a voice channel
	if channel.Type != models.ChannelTypeVoice {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You can only join VOICE type channels"})
		return
	}

	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	// TODO: Add the `VoiceState` record from database (mute/deafen)

	// Broadcast an event to everyone currently in the WebSocket room
	websockets.Manager.Broadcast <- websockets.WsMessage{
		TargetChannelID: channelID,
		Event:           "VOICE_USER_JOINED",
		Data:            gin.H{"user_id": strconv.FormatUint(userID, 10)},
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully joined voice channel"})
}

func LeaveVoice(c *gin.Context) {
	_, channelID, err := verifyChannel(c)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}

	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	// TODO: Delete the `VoiceState` record from database

	// Broadcast that the user left
	websockets.Manager.Broadcast <- websockets.WsMessage{
		TargetChannelID: channelID,
		Event:           "VOICE_USER_LEFT",
		Data:            gin.H{"user_id": strconv.FormatUint(userID, 10)},
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully left voice channel"})
}
