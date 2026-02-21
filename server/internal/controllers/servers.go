package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func ListServers(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "ListServers not implemented yet"})
}

func CreateServer(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "CreateServer not implemented yet"})
}

func ServerDetails(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "ServerDetails not implemented yet"})
}

func UpdateServer(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "UpdateServer not implemented yet"})
}

func DeleteServer(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "DeleteServer not implemented yet"})
}

func JoinServer(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "JoinServer not implemented yet"})
}

func LeaveServer(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "LeaveServer not implemented yet"})
}
