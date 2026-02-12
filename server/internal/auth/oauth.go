package auth

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/google"

	"github.com/jonahgcarpenter/hermes/server/internal/config"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
)

func Setup(cfg *config.Config) {
	goth.UseProviders(
		google.New(cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleCallbackURL, "email", "profile"),
	)
}

func BeginAuth(c *gin.Context) {
	provider := c.Param("provider")
	q := c.Request.URL.Query()
	q.Add("provider", provider)
	c.Request.URL.RawQuery = q.Encode()

	gothic.BeginAuthHandler(c.Writer, c.Request)
}

func CompleteAuth(c *gin.Context, cfg *config.Config) {
	provider := c.Param("provider")
	q := c.Request.URL.Query()
	q.Add("provider", provider)
	c.Request.URL.RawQuery = q.Encode()

	user, err := gothic.CompleteUserAuth(c.Writer, c.Request)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var dbUser models.User

	err = database.DB.Where(models.User{GoogleID: user.UserID}).
		Assign(models.User{
			Name:      user.Name,
			AvatarURL: user.AvatarURL,
			Email:     user.Email,
		}).
		FirstOrCreate(&dbUser).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	accessToken, _ := GenerateAccessToken(fmt.Sprint(dbUser.ID), cfg)
	refreshToken, _ := GenerateRefreshToken(fmt.Sprint(dbUser.ID), cfg)

	database.DB.Model(&dbUser).Update("refresh_token", refreshToken)

	c.JSON(http.StatusOK, gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user":          dbUser,
	})
}
