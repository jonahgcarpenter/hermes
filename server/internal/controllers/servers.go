package controllers

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/utils"
)

var seededRand = rand.New(rand.NewSource(time.Now().UnixNano()))
const inviteCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func generateInviteCode(length int) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = inviteCharset[seededRand.Intn(len(inviteCharset))]
	}
	return string(b)
}

type CreateRequest struct {
	Name      string `json:"name" binding:"required"`
	IsPrivate bool   `json:"is_private"`
	Password  string `json:"password"`
}

type JoinRequest struct {
	InviteCode string `json:"invite_code" binding:"required"`
	Password   string `json:"password"`
}

type UpdateRequest struct {
	Name string `json:"name"`
	// Add other fields later
}

func CreateServer(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	passwordHash := ""
	if req.IsPrivate {
		if req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password required for private servers"})
			return
		}
		
		hash, err := utils.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		passwordHash = hash
	}

	var user models.User
	if result := database.DB.Where("id = ?", userID).First(&user); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	inviteCode := generateInviteCode(8)

	server := models.Server{
		Name:         req.Name,
		OwnerID:      user.ID,
		IsPrivate:    req.IsPrivate,
		PasswordHash: passwordHash,
		InviteCode:   inviteCode,
		Members:      []models.User{user},
		Channels: []models.Channel{
			{Name: "general", Type: "text"},
			{Name: "voice", Type: "voice"},
		},
	}

	if result := database.DB.Create(&server); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"server": server})
}

func GetServerByInvite(c *gin.Context) {
	code := c.Param("code")
	var server models.Server
	
	if err := database.DB.Select("id", "name", "icon_url", "is_private", "owner_id", "invite_code").Where("invite_code = ?", code).First(&server).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid invite code"})
		return
	}
	c.JSON(http.StatusOK, server)
}

func JoinServer(c *gin.Context) {
	userID := c.GetString("userID")
	
	var req JoinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var server models.Server
	if err := database.DB.Where("invite_code = ?", req.InviteCode).First(&server).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid invite code"})
		return
	}	

	if server.IsPrivate {
		if !utils.CheckPasswordHash(req.Password, server.PasswordHash) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect password"})
			return
		}
	}

	var user models.User
	database.DB.First(&user, "id = ?", userID)

	if err := database.DB.Model(&server).Association("Members").Append(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join server"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Joined server successfully", "server": server})
}

func ListServers(c *gin.Context) {
	userID := c.GetString("userID")

	var user models.User
	if err := database.DB.Preload("Servers").First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"servers": user.Servers})
}

func ServerDetails(c *gin.Context) {
    serverID := c.Param("id")
    
    var server models.Server
    if err := database.DB.Preload("Channels").Preload("Members").First(&server, serverID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
        return
    }
    
    c.JSON(http.StatusOK, server)
}

func UpdateServer(c *gin.Context) {
	userID := c.GetString("userID")
	serverID := c.Param("id")

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var server models.Server
	if err := database.DB.First(&server, serverID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	if fmt.Sprint(server.OwnerID) != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only the owner can edit this server"})
			return
	}	

	server.Name = req.Name
	if err := database.DB.Save(&server).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server"})
		return
	}

	c.JSON(http.StatusOK, server)
}

func DeleteServer(c *gin.Context) {
	userID := c.GetString("userID")
	serverID := c.Param("id")

	var server models.Server
	if err := database.DB.First(&server, serverID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	if fmt.Sprint(server.OwnerID) != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only the owner can edit this server"})
			return
	}	

	if err := database.DB.Delete(&server).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete server"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Server deleted"})
}
