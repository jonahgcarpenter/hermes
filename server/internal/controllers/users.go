package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	
	"github.com/jonahgcarpenter/hermes/server/internal/database" 
	"github.com/jonahgcarpenter/hermes/server/internal/models"   
)

type UpdateUserPayload struct {
	Username    *string `json:"username" binding:"omitempty,min=3,max=32"`
	Email       *string `json:"email" binding:"omitempty,email"`
	DisplayName *string `json:"display_name" binding:"omitempty,min=1,max=32"`
	AvatarURL   *string `json:"avatar_url" binding:"omitempty,url"`
	Status      *string `json:"status" binding:"omitempty"`
}

func GetCurrentUser(c *gin.Context) {
	// Grab User from middleware context
	userObj, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Type assert the interface{} back into a models.User
	user := userObj.(models.User)

	c.JSON(http.StatusOK, user)
}

func UpdateCurrentUser(c *gin.Context) {
	// Grab UserID from middleware context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var payload UpdateUserPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	// Lookup user by ID
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Update only the fields that were provided in the request
	updates := make(map[string]interface{})
	if payload.Username != nil {
		updates["username"] = *payload.Username
	}
	if payload.Email != nil {
		updates["email"] = *payload.Email 
	}
	if payload.DisplayName != nil {
		updates["display_name"] = *payload.DisplayName
	}
	if payload.AvatarURL != nil {
		updates["avatar_url"] = *payload.AvatarURL
	}
	if payload.Status != nil {
		updates["status"] = *payload.Status
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
			return
		}
	}

	c.JSON(http.StatusOK, user)
}

func DeleteCurrentUser(c *gin.Context) {
	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	idStr := strconv.FormatUint(userID, 10)
	ghostUpdates := map[string]interface{}{
		"username":     "ghost_" + idStr,
		"email":        "deleted_" + idStr + "@hermes.local",
		"display_name": "Deleted User",
		"avatar_url":   "",
		"status":       "Offline",
	}

	// Just update the user
	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(ghostUpdates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to ghost user"})
		return
	}

	// Scramble the password so they can never log back in
	database.DB.Model(&models.User{}).Where("id = ?", userID).Update("password_hash", "DELETED_ACCOUNT")

	c.JSON(http.StatusNoContent, nil) 
}

func GetUserProfile(c *gin.Context) {
	userIDStr := c.Param("userID")
	
	// Convert string ID from URL to uint64
	userID, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID format"})
		return
	}

	var user models.User
	// Fetch user by ID
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}
