package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/jonahgcarpenter/hermes/server/internal/config"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
)

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func RefreshTokenHandler(c *gin.Context, cfg *config.Config) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token required"})
		return
	}

	token, err := ValidateToken(req.RefreshToken, cfg)
	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["type"] != "refresh" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token type"})
		return
	}

	var user models.User
	userID := claims["sub"].(string)

	if result := database.DB.Where("id = ? AND refresh_token = ?", userID, req.RefreshToken).First(&user); result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token revoked or expired"})
		return
	}

	newAccessToken, _ := GenerateAccessToken(userID, cfg)
	
	newRefreshToken, _ := GenerateRefreshToken(userID, cfg)
	database.DB.Model(&user).Update("refresh_token", newRefreshToken)

	c.JSON(http.StatusOK, gin.H{
		"access_token": newAccessToken,
		"refresh_token": newRefreshToken,
	})
}

func LogoutHandler(c *gin.Context) {
    var req RefreshRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token required"})
        return
    }

    result := database.DB.Model(&models.User{}).
        Where("refresh_token = ?", req.RefreshToken).
        Update("refresh_token", "")

    if result.Error != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    c.Status(http.StatusOK)
}
