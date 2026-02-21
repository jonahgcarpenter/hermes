package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Register(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Register not implemented yet"})
}

func Login(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Login not implemented yet"})
}

func Logout(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Logout not implemented yet"})
}
