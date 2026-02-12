package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/google"
	"github.com/jonahgcarpenter/hermes/server/internal/config"
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

	// TODO:
	// - Check if user exists in DB

	token, err := CreateToken(user.UserID, cfg)
	if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
	}
	
	c.JSON(http.StatusOK, gin.H{
			"token":  token,
			"user": gin.H{
					"email":  user.Email,
					"name":   user.Name,
					"avatar": user.AvatarURL,
			},
	})
}
