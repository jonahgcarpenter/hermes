package main

import (
	"net/http"
	"github.com/gin-gonic/gin"

	"github.com/jonahgcarpenter/hermes/server/internal/config"
)

func main() {
	cfg := config.Load()

	r := gin.Default()

	api := r.Group("/api")
	{
			api.GET("/test", func(c *gin.Context) {
				c.String(http.StatusOK, "Test")
			})
	}

	r.Run(":" + cfg.Port)
}
