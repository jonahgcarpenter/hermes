package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/utils"
)

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Retrieve the cookie
		cookie, err := c.Cookie("hermes_session")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}

		// Validate the JWT token stored in the cookie
		claims, err := utils.VerifyToken(cookie)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired session"})
			return
		}

		// Verify user exists in DB
		var user models.User
		if err := database.DB.Where("id = ?", claims.UserID).First(&user).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User no longer exists"})
			return
		}

		// Set the user in the context for subsequent handlers
		c.Set("user", user) // The whole user struct
		c.Set("user_id", user.ID) // Just their ID

		c.Next()
	}
}
