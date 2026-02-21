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

	r := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(corsConfig))

	api := r.Group("/api")
	{
		// Authorization
		authRoute := api.Group("/auth")
		{
			authRoute.GET("/:provider", auth.BeginAuth)
			authRoute.POST("/logout", auth.LogoutHandler)
			authRoute.GET("/:provider/callback", func(c *gin.Context) {
				auth.CompleteAuth(c, cfg)
			})
			authRoute.POST("/refresh", func(c *gin.Context) {
				auth.RefreshTokenHandler(c, cfg)
			})
		}

		// Users
		userRoute := api.Group("/users")
		{
			userRoute.GET("/@me", controllers.GetCurrentUser)
			userRoute.PATCH("/@me", controllers.UpdateCurrentUser)
			userRoute.DELETE("/@me", controllers.DeleteCurrentUser)
			userRoute.GET("/:userID", controllers.GetUserProfile)
		}

		// Servers
		serverRoute := api.Group("/servers")
		{
			serverRoute.GET("/", controllers.ListServers)
			serverRoute.POST("/", controllers.CreateServer)
			serverRoute.GET("/:serverID", controllers.ServerDetails)
			serverRoute.PATCH("/:serverID", controllers.UpdateServer)
			serverRoute.DELETE("/:serverID", controllers.DeleteServer)
			serverRoute.POST("/:serverID/join", controllers.JoinServer)
			serverRoute.DELETE("/:serverID/leave", controllers.LeaveServer)

			// Channels
			channelRoute := serverRoute.Group("/:serverID/channels")
			{
				channelRoute.GET("/", controllers.ListChannels)
				channelRoute.POST("/", controllers.CreateChannel)
				channelRoute.PATCH("/:channelID", controllers.UpdateChannel)
				channelRoute.DELETE("/:channelID", controllers.DeleteChannel)

				// Messages
				messageRoute := channelRoute.Group("/:channelID/messages")
				{
					messageRoute.GET("/", controllers.ListMessages)
					messageRoute.POST("/", controllers.SendMessage)
					messageRoute.PATCH("/:messageID", controllers.EditMessage)
					messageRoute.DELETE("/:messageID", controllers.DeleteMessage)
				}

				// Voice
				voiceRoute := channelRoute.Group("/:channelID/voice")
				{
					voiceRoute.POST("/join", controllers.JoinVoice)
					voiceRoute.POST("/leave", controllers.LeaveVoice)
				}
			}
		}
	}

	r.Run(":" + cfg.Port)
}
