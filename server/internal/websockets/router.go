package websockets

import "log"

// RouteMessage acts as the traffic controller for all incoming websocket JSON
func RouteMessage(c *Client, msg WsMessage) {
	switch msg.Event {
	case "TYPING_START": //
		// We trust the client's payload and just fan it out to the room.
		Manager.Broadcast <- msg

	default:
		log.Printf("Unknown event type received: %s", msg.Event)
	}
}
