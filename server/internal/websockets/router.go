package websockets

import "log"

// RouteMessage acts as the traffic controller for all incoming websocket JSON
func RouteMessage(c *Client, msg WsMessage) {
	switch msg.Event {
	case "WEBRTC_OFFER", "WEBRTC_ANSWER", "ICE_CANDIDATE": //
		// TODO: Route to your Pion SFU logic
		log.Printf("Routing WebRTC event: %s for user: %d", msg.Event, c.UserID)
		
	case "TYPING_START": //
		// TODO: Route to chat logic
		log.Printf("Routing TYPING_START for user: %d", c.UserID)
		
	default:
		log.Printf("Unknown event type received: %s", msg.Event)
	}
}
