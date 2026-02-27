package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/webrtc"
)

type VoiceMemberResponse struct {
	ID        uint64 `json:"id"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

func VoiceMembers(c *gin.Context) {
	channelIDStr := c.Param("channelID")
	channelID, err := strconv.ParseUint(channelIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	var activeUserIDs []uint64

	// Find all users currently in this channel via the WebRTC VoiceRegistry
	webrtc.VoiceRegistry.RLock()
	for userID, client := range webrtc.VoiceRegistry.Clients {
		if client.ActiveChannelID == channelID {
			activeUserIDs = append(activeUserIDs, userID)
		}
	}
	webrtc.VoiceRegistry.RUnlock()

	// If no one is in the channel, return an empty array (not null)
	if len(activeUserIDs) == 0 {
		c.JSON(http.StatusOK, []VoiceMemberResponse{})
		return
	}

	// Fetch user details from the database in a single query
	var users []models.User
	if err := database.DB.Select("id", "display_name", "avatar_url").
		Where("id IN ?", activeUserIDs).
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user details"})
		return
	}

	// Map to the response struct
	var response []VoiceMemberResponse
	for _, u := range users {
		response = append(response, VoiceMemberResponse{
			ID:        u.ID,
			Name:      u.DisplayName,
			AvatarURL: u.AvatarURL,
		})
	}

	c.JSON(http.StatusOK, response)
}
