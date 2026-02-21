package middleware

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
)

func RequireMembership() gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDObj, exists := c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		userID := userIDObj.(uint64)

		serverIDStr := c.Param("serverID")
		serverID, err := strconv.ParseUint(serverIDStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID format"})
			return
		}

		var member models.ServerMember
		// Check if they are in the server AND haven't left
		if err := database.DB.Where("server_id = ? AND user_id = ? AND left_at IS NULL", serverID, userID).First(&member).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "You are not an active member of this server"})
			return
		}

		// Store the user's role in the context so subsequent 
		c.Set("server_role", member.Role)

		c.Next()
	}
}

func RequirePermission(requiredPermission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDObj, exists := c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		userID := userIDObj.(uint64)

		serverIDStr := c.Param("serverID")
		serverID, err := strconv.ParseUint(serverIDStr, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID format"})
			return
		}

		var member models.ServerMember
		if err := database.DB.Where("server_id = ? AND user_id = ? AND left_at IS NULL", serverID, userID).First(&member).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "You must be a member to perform this action"})
			return
		}

		// Check if their role grants them the required permission
		if !hasPermission(member.Role, requiredPermission) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "You do not have permission to do this"})
			return
		}

		c.Set("server_role", member.Role)
		c.Next()
	}
}

func hasPermission(userRole string, required string) bool {
	// Owners can do absolutely anything
	if userRole == "owner" {
		return true
	}

	switch required {
	case "manage_server", "manage_channels", "delete_messages":
		// Only admins and owners can do these destructive/administrative actions
		return userRole == "admin"
	
	case "send_messages", "join_voice":
		// Regular members (and admins/owners) can do basic interactions
		return userRole == "member" || userRole == "admin"
	
	default:
		// If we don't recognize the permission, default to deny for safety
		return false
	}
}
