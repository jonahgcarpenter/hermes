package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetCurrentUser(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "GetCurrentUser not implemented yet"})
}

func UpdateCurrentUser(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "UpdateCurrentUser not implemented yet"})
}

func DeleteCurrentUser(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "DeleteCurrentUser not implemented yet"})
}

func GetUserProfile(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "GetUserProfile not implemented yet"})
}
