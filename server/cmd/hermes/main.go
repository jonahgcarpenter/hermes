package main

import (
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"

	"github.com/jonahgcarpenter/hermes/server/internal/auth"
	"github.com/jonahgcarpenter/hermes/server/internal/config"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/controllers"
	"github.com/jonahgcarpenter/hermes/server/internal/ws"
)

func main() {
	cfg := config.Load()

	database.Connect(cfg)

	auth.Setup(cfg)

	hub := ws.NewHub()
	go hub.Run()

	chatController := controllers.NewChatController(hub)

	r := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(corsConfig))

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

			api.GET("/ws", chatController.HandleWS)

			api.GET("/channels/:channelId/messages", chatController.GetMessages)

			protected := api.Group("/")
			protected.Use(auth.Middleware(cfg)) 
			{
					protected.POST("/servers", controllers.CreateServer)
					protected.GET("/servers/invite/:code", controllers.GetServerByInvite)
					protected.POST("/servers/join", controllers.JoinServer)
					protected.GET("/servers", controllers.ListServers)
					protected.GET("/servers/:id", controllers.ServerDetails)
					protected.PUT("/servers/:id", controllers.UpdateServer)
					protected.DELETE("/servers/:id", controllers.DeleteServer)
			}
	}

	r.Run(":" + cfg.Port)
}
