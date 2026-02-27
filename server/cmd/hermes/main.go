package main

import (
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"

	"github.com/jonahgcarpenter/hermes/server/internal/config"
	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/controllers"
	"github.com/jonahgcarpenter/hermes/server/internal/utils"
	"github.com/jonahgcarpenter/hermes/server/internal/middleware"
	"github.com/jonahgcarpenter/hermes/server/internal/websockets"
	"github.com/jonahgcarpenter/hermes/server/internal/webrtc"
)

func main() {
	cfg := config.Load()

	database.Connect(cfg)

	// NOTE: This number represents server ID
	// Hardcoding "1" is fine until scaled
	utils.InitIDGenerator(1)

	// Set JWTSecret once instead of passing it every time
	utils.InitJWT(cfg.JWTSecret)

	// Websocket start
	go websockets.Manager.Run()

	r := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:5173", "http://localhost:5174"}
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(corsConfig))

	api := r.Group("/api")
	{
		// Global WebSocket Endpoint
    api.GET("/ws", middleware.AuthRequired(), websockets.ServeGlobalWS)

		// Authorization
		authRoute := api.Group("/auth")
		{
			authRoute.POST("/register", controllers.Register)
			authRoute.POST("/login", controllers.Login)
			authRoute.POST("/logout", middleware.AuthRequired(), controllers.Logout) // Requires Auth
		}

		// Users
		userRoute := api.Group("/users", middleware.AuthRequired()) // Requires Auth
		{
			userRoute.GET("/@me", controllers.GetCurrentUser)
			userRoute.PATCH("/@me", controllers.UpdateCurrentUser)
			userRoute.DELETE("/@me", controllers.DeleteCurrentUser)
			userRoute.GET("/:userID", controllers.GetUserProfile)
		}

		// Servers
		serverRoute := api.Group("/servers", middleware.AuthRequired())
		{
			serverRoute.GET("", controllers.ListServers)
			serverRoute.POST("", controllers.CreateServer)

			singleServerRoute := serverRoute.Group("/:serverID")
			{
				singleServerRoute.POST("/join", controllers.JoinServer)
				singleServerRoute.GET("", controllers.ServerDetails)
				singleServerRoute.GET("/members", middleware.RequireMembership(), controllers.ListServerMembers)
				singleServerRoute.DELETE("/leave", middleware.RequireMembership(), controllers.LeaveServer)
				singleServerRoute.PATCH("", middleware.RequirePermission("manage_server"), controllers.UpdateServer)
				singleServerRoute.DELETE("", middleware.RequirePermission("manage_server"), controllers.DeleteServer)

				// Channels
				channelRoute := singleServerRoute.Group("/channels", middleware.RequireMembership())
				{
					channelRoute.GET("", controllers.ListChannels)
					channelRoute.POST("", middleware.RequirePermission("manage_channels"), controllers.CreateChannel)
					channelRoute.PATCH("/:channelID", middleware.RequirePermission("manage_channels"), controllers.UpdateChannel)
					channelRoute.DELETE("/:channelID", middleware.RequirePermission("manage_channels"), controllers.DeleteChannel)

					// Messages
					messageRoute := channelRoute.Group("/:channelID/messages")
					{
						messageRoute.GET("", controllers.ListMessages)
						messageRoute.POST("", controllers.SendMessage)
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
	}

	r.Run(":" + cfg.Port)
}
