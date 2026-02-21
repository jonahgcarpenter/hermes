package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func ListChannels(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "ListChannels not implemented yet"})
}

func CreateChannel(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "CreateChannel not implemented yet"})
}

func UpdateChannel(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "UpdateChannel not implemented yet"})
}

func DeleteChannel(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "DeleteChannel not implemented yet"})
}
