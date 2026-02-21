package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func ListMessages(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "ListMessages not implemented yet"})
}

func SendMessage(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "SendMessage not implemented yet"})
}

func EditMessage(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "EditMessage not implemented yet"})
}

func DeleteMessage(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "DeleteMessage not implemented yet"})
}
