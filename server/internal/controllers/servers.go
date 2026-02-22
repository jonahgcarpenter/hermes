package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/utils"
)

// Helper to extract "serverID" from URL
func parseServerID(c *gin.Context) (uint64, error) {
	idStr := c.Param("serverID")
	return strconv.ParseUint(idStr, 10, 64)
}

func ListServers(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var memberships []models.ServerMember
	// Fetch active memberships and preload the Server data
	if err := database.DB.Preload("Server").
		Where("user_id = ? AND left_at IS NULL", userID).
		Find(&memberships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch servers"})
		return
	}

	// Extract the servers to return
	var servers []models.Server
	for _, m := range memberships {
		servers = append(servers, m.Server)
	}

	c.JSON(http.StatusOK, servers)
}

func ListServerMembers(c *gin.Context) {
	// Get the Server ID from the URL parameters
	serverID, err := parseServerID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	// Fetch all members where LeftAt is NULL
	var members []models.ServerMember
	
	// We use Preload("User") to include the actual profile data for each member
	// We filter by left_at IS NULL to ensure we only get active participants
	result := database.DB.Preload("User").
		Where("server_id = ? AND left_at IS NULL", serverID).
		Find(&members)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch server members"})
		return
	}

	c.JSON(http.StatusOK, members)
}

type CreateServerPayload struct {
	Name    string `json:"name" binding:"required,min=2,max=100"`
	IconURL string `json:"icon_url" binding:"omitempty,url"`
}

func CreateServer(c *gin.Context) {
	// Extract the user ID from  middleware
	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	var payload CreateServerPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate Snowflake ID
	serverID := utils.GenerateID() 

	server := models.Server{
		ID: 		 serverID,
		Name:    payload.Name,
		IconURL: payload.IconURL,
		OwnerID: userID,
	}

	// We use a database transaction to ensure both are created 
	tx := database.DB.Begin()

	if err := tx.Create(&server).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create server"})
		return
	}

	// Create the membership record for the owner
	member := models.ServerMember{
		ServerID: server.ID,
		UserID:   userID,
		Role:     "owner",
	}

	if err := tx.Create(&member).Error; err != nil {
		tx.Rollback() // Cancel the transaction
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign server owner"})
		return
	}

	// Create default "general" text channel
	generalChannel := models.Channel{
		ID:       utils.GenerateID(),
		ServerID: server.ID,
		Name:     "general",
		Type:     models.ChannelTypeText,
		Position: 0, // Appears first
	}

	if err := tx.Create(&generalChannel).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create default text channel"})
		return
	}

	// Create default "voice" channel
	voiceChannel := models.Channel{
		ID:       utils.GenerateID(),
		ServerID: server.ID,
		Name:     "voice",
		Type:     models.ChannelTypeVoice,
		Position: 1, // Appears underneath the text channel
	}

	if err := tx.Create(&voiceChannel).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create default voice channel"})
		return
	}

	tx.Commit() // Succeeded

	c.JSON(http.StatusCreated, server)
}

func ServerDetails(c *gin.Context) {
	serverID, err := parseServerID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	var server models.Server
	if err := database.DB.First(&server, serverID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	c.JSON(http.StatusOK, server)
}

type UpdateServerPayload struct {
	Name    *string `json:"name" binding:"omitempty,min=2,max=100"`
	IconURL *string `json:"icon_url" binding:"omitempty,url"`
}

func UpdateServer(c *gin.Context) {
	serverID, err := parseServerID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	var payload UpdateServerPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var server models.Server
	if err := database.DB.First(&server, serverID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Build a map of only the fields the user actually provided in their request
	updates := make(map[string]interface{})
	if payload.Name != nil {
		updates["name"] = *payload.Name
	}
	if payload.IconURL != nil {
		updates["icon_url"] = *payload.IconURL
	}

	// Only hit the database if there's actually something to update
	if len(updates) > 0 {
		if err := database.DB.Model(&server).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server"})
			return
		}
	}

	c.JSON(http.StatusOK, server)
}

func DeleteServer(c *gin.Context) {
	serverID, err := parseServerID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}
	
	// Perform soft delete
	if err := database.DB.Delete(&models.Server{}, serverID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete server"})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func JoinServer(c *gin.Context) {
	serverID, err := parseServerID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	// Before creating a new membership, check if one already exists in the database
	var server models.Server
	if err := database.DB.First(&server, serverID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Check if user is already a member (and hasn't left)
	var existingMember models.ServerMember
	err = database.DB.Where("server_id = ? AND user_id = ?", serverID, userID).First(&existingMember).Error
	if err == nil {
		if existingMember.LeftAt == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "You are already a member of this server"})
			return
		} else {
			// They left previously. Rejoin by clearing LeftAt
			if err := database.DB.Model(&existingMember).Update("left_at", nil).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to rejoin server"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Successfully rejoined the server"})
			return
		}
	}

	// If no record was found, this is a brand new member. Create their membership record.
	newMember := models.ServerMember{
		ServerID: serverID,
		UserID:   userID,
		Role:     "member",
	}

	if err := database.DB.Create(&newMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join server"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully joined the server"})
}

func LeaveServer(c *gin.Context) {
	serverID, err := parseServerID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	// Verify they are actually in the server
	var member models.ServerMember
	if err := database.DB.Where("server_id = ? AND user_id = ? AND left_at IS NULL", serverID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You are not an active member of this server"})
		return
	}

	// Prevent owner from leaving
	var server models.Server
	database.DB.Select("owner_id").First(&server, serverID)
	if server.OwnerID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server owner cannot leave without transferring ownership"})
		return
	}

	// Soft-leave by setting the LeftAt timestamp
	now := time.Now()
	if err := database.DB.Model(&member).Update("left_at", &now).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave server"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully left the server"})
}
