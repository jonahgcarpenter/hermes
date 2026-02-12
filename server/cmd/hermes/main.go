package main

import (
	"github.com/gin-gonic/gin"

	"github.com/jonahgcarpenter/hermes/server/internal/auth"
	"github.com/jonahgcarpenter/hermes/server/internal/config"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
)

func main() {
	cfg := config.Load()

	database.Connect(cfg)

	auth.Setup(cfg)

	r := gin.Default()

	api := r.Group("/api")
	{
			api.GET("/auth/:provider", auth.BeginAuth)
			api.GET("/auth/:provider/callback", func(c *gin.Context) {
					auth.CompleteAuth(c, cfg)
			})
			api.POST("/auth/refresh", func(c *gin.Context) {
					auth.RefreshTokenHandler(c, cfg)
			})
			api.POST("/auth/logout", auth.LogoutHandler)
	}

	r.Run(":" + cfg.Port)
}
