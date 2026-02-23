package websockets

import (
	"log"
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func ServeGlobalWS(c *gin.Context) {
	userIDObj, _ := c.Get("user_id")
	userID := userIDObj.(uint64)

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to set websocket upgrade:", err)
		return
	}

	client := &Client{
		Conn:   ws,
		UserID: userID,
	}

	Manager.Register <- client
	defer func() { Manager.Unregister <- client }()

	// Central Listening Loop
	for {
		var incomingMsg WsMessage
		err := ws.ReadJSON(&incomingMsg)
		if err != nil {
			break // Disconnected
		}

		// Route incoming messages based on the Event type
		switch incomingMsg.Event {
		case "WEBRTC_OFFER", "WEBRTC_ANSWER", "ICE_CANDIDATE":
            // TODO: Route to your Pion SFU logic 
            // HandleVoiceSignaling(userID, incomingMsg)
        case "TYPING_START":
            // Handle typing indicators
		}
	}
}
