package main

import (
	"github.com/gin-gonic/gin"
	"github.com/jonahgcarpenter/hermes/server/internal/auth"
	"github.com/jonahgcarpenter/hermes/server/internal/config"
)

func main() {
	cfg := config.Load()

	auth.Setup(cfg)

	r := gin.Default()

	api := r.Group("/api")
	{
			api.GET("/auth/:provider", auth.BeginAuth)
			api.GET("/auth/:provider/callback", func(c *gin.Context) {
					auth.CompleteAuth(c, cfg)
			})
	}

	r.Run(":" + cfg.Port)
}
