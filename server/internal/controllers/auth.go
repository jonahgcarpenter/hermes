package controllers

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/jonahgcarpenter/hermes/server/internal/database"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
	"github.com/jonahgcarpenter/hermes/server/internal/utils"
)

type RegisterRequest struct {
	Username    string `json:"username" binding:"required,min=3,max=32"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"display_name" binding:"required,max=32"`
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters", "details": err.Error()})
		return
	}

	// Normalize Email
	normalizedEmail := strings.ToLower(strings.TrimSpace(req.Email))


	// Pre-flight checks for Email/Username
	var existingUser models.User
	// BUG: This prints to console if !exist, meaning spam for every new user
	if err := database.DB.Where("email = ?", normalizedEmail).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email is already in use"})
		return
	}
	// BUG: This prints to console if !exist, meaning spam for every new user
	if err := database.DB.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username is already taken"})
		return
	}

	// Hash the password securely
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	// Generate Snowflake ID
	newID := utils.GenerateID()

	// Construct the user model
	user := models.User{
		ID:           newID,
		Username:     req.Username,
		Email:        normalizedEmail,
		PasswordHash: string(hashedPassword),
		DisplayName:  req.DisplayName,
		Status:       "offline",
	}

	// Save to database
	if err := database.DB.Create(&user).Error; err != nil {
		
		// Check if the error is specifically a duplicate key
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			c.JSON(http.StatusConflict, gin.H{"error": "Username or email is already taken"})
			return
		}

		// Otherwise log error for future investigation
		log.Printf("Failed to create user in database: %v\n", err)
		
		// Return generic error to user
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An internal server error occurred"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"id":      newID,
	})
}

func Login(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Login not implemented yet"})
}

func Logout(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Logout not implemented yet"})
}
