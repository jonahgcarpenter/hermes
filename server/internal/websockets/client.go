package websockets

import (
	"log"
	"github.com/gorilla/websocket"
)

type Client struct {
	Conn   *websocket.Conn
	UserID uint64
	ServerIDs []uint64
	Send   chan WsMessage
}

// readPump pumps messages from the websocket connection to the router.
func (c *Client) readPump() {
	defer func() {
		// Ensure cleanup happens when the loop breaks
		Manager.Unregister <- c
		c.Conn.Close()
	}()

	for {
		var incomingMsg WsMessage
		err := c.Conn.ReadJSON(&incomingMsg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break // Disconnected
		}

		// Handoff to the Router instead of processing it directly here
		RouteMessage(c, incomingMsg)
	}
}

// writePump pumps messages from the hub to the websocket connection.
func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()

	for {
		message, ok := <-c.Send
		if !ok {
			c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		err := c.Conn.WriteJSON(message)
		if err != nil {
			log.Println("Error writing to websocket:", err)
			break
		}
	}
}
