package websockets

import (
	"github.com/gin-gonic/gin"
)

func ServeVoiceWS(c *gin.Context) {
	ServeMessageWS(c) 
}
