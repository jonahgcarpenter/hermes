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

	// Normalize identities
	normalizedEmail := strings.ToLower(strings.TrimSpace(req.Email))
	normalizedUsername := strings.ToLower(strings.TrimSpace(req.Username))


	// Pre-flight checks for Email/Username
	var existingUser models.User
	// BUG: This prints to console if !exist, meaning spam for every new user
	if err := database.DB.Where("email = ?", normalizedEmail).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email is already in use"})
		return
	}
	// BUG: This prints to console if !exist, meaning spam for every new user
	if err := database.DB.Where("username = ?", normalizedUsername).Limit(1).Find(&existingUser).Error; err == nil && existingUser.ID != 0 {
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
		Username:     normalizedUsername,
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

type LoginRequest struct {
	Identity string `json:"identity" binding:"required"` // This can be email OR username
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters"})
		return
	}

	// Normalize the identity input
	identity := strings.ToLower(strings.TrimSpace(req.Identity))

	var user models.User
	// Query for the user where identity matches EITHER email OR username
	if err := database.DB.Where("email = ? OR username = ?", identity, identity).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Use a generic error message for security
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Compare the stored hash with the provided plaintext password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Update status to online
	database.DB.Model(&user).Update("status", "online")

	// Generate and JWT token for cookie value
	token, err := utils.GenerateToken(user.ID)
	if err != nil {
		log.Printf("JWT Generation error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate session"})
		return
	}

	// Determine 'Secure' flag based on Gin's mode
	isProduction := gin.Mode() == gin.ReleaseMode

	// Set the auth cookie
	c.SetCookie(
		"hermes_session",
		token,
		259200, // Max Age, 72hours in seconds
		"/",
		"",
		isProduction,
		true,
	)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    user,
	})
}

func Logout(c *gin.Context) {
	// Determine 'Secure' flag based on Gin's mode
	isProduction := gin.Mode() == gin.ReleaseMode

	c.SetCookie(
		"hermes_session",
		"",
		-1,	// MaxAge -1 tells the browser to delete it immediately
		"/",
		"",
		isProduction,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}
