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
		var token string

		// Try to retrieve from the cookie
		cookie, err := c.Cookie("hermes_session")
		if err == nil {
			token = cookie
		} else {
			// Check the query string (useful for WebSockets)
			token = c.Query("token")
		}

		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}

		// Validate the JWT token (whether it came from cookie or query)
		claims, err := utils.VerifyToken(token)
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

		c.Set("user", user)
		c.Set("user_id", user.ID)

		c.Next()
	}
}
