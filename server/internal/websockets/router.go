package websockets

import "log"

// RouteMessage acts as the traffic controller for all incoming websocket JSON
func RouteMessage(c *Client, msg WsMessage) {
	switch msg.Event {
	case "WEBRTC_OFFER", "WEBRTC_ANSWER", "ICE_CANDIDATE": //
		// TODO: Route to your Pion SFU logic
		log.Printf("Routing WebRTC event: %s for user: %d", msg.Event, c.UserID)
		
	case "TYPING_START": //
		// We trust the client's payload and just fan it out to the room.
		Manager.Broadcast <- msg
		
	default:
		log.Printf("Unknown event type received: %s", msg.Event)
	}
}
