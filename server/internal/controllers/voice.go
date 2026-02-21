package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func JoinVoice(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "JoinVoice not implemented yet"})
}

func LeaveVoice(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "LeaveVoice not implemented yet"})
}
