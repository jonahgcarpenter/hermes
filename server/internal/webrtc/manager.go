// TODO: REMOVE DEBUGGING
package webrtc

import (
	"log"
	"sync"

	"github.com/pion/webrtc/v3"
)

// Room represents a single voice channel
type Room struct {
	ID    uint64
	Peers map[uint64]*webrtc.PeerConnection
	// A list of all active audio/video tracks in this room
	Tracks []*webrtc.TrackLocalStaticRTP 
	mu     sync.RWMutex
}

// Manager holds all active voice channels
type RoomManager struct {
	Rooms map[uint64]*Room
	mu    sync.RWMutex
}

var Manager = &RoomManager{
	Rooms: make(map[uint64]*Room),
}

// GetOrCreateRoom ensures a media room exists for the channel
func (m *RoomManager) GetOrCreateRoom(channelID uint64) *Room {
	m.mu.Lock()
	defer m.mu.Unlock()

	if room, exists := m.Rooms[channelID]; exists {
		return room
	}

	room := &Room{
		ID:    channelID,
		Peers: make(map[uint64]*webrtc.PeerConnection),
	}
	m.Rooms[channelID] = room
	return room
}

// AddPeer handles a new user's WebRTC connection and routing their audio
func (r *Room) AddPeer(userID uint64, pc *webrtc.PeerConnection) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.Peers[userID] = pc
	log.Printf("[SFU Manager] User %d added to Room %d. Total peers: %d", userID, r.ID, len(r.Peers))

	// Give this new user all the EXISTING audio tracks
	for _, track := range r.Tracks {
		if _, err := pc.AddTrack(track); err != nil {
			log.Printf("[SFU Error] Error adding existing track to User %d: %v", userID, err)
		} else {
			log.Printf("[SFU Manager] Attached existing track to User %d", userID)
		}
	}

	// Listen for incoming audio from this user
	pc.OnTrack(func(remoteTrack *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf("[SFU Manager] <<< Received incoming remote track from User %d (Kind: %s, ID: %s)", userID, remoteTrack.Kind().String(), remoteTrack.ID())

		// Create a local track that acts as a duplicate of the incoming remote track
		localTrack, err := webrtc.NewTrackLocalStaticRTP(
			remoteTrack.Codec().RTPCodecCapability,
			remoteTrack.ID(),
			remoteTrack.StreamID(),
		)
		if err != nil {
			log.Printf("[SFU Error] Failed to create local track for User %d: %v", userID, err)
			return
		}

		// Save the new track to the room's track list
		r.mu.Lock()
		r.Tracks = append(r.Tracks, localTrack)
		r.mu.Unlock()

		log.Printf("[SFU Manager] Successfully created local forwarding track for User %d", userID)

		// Goroutine to forward RTP packets
		go func() {
			rtpBuf := make([]byte, 1400)
			for {
				i, _, readErr := remoteTrack.Read(rtpBuf)
				if readErr != nil {
					log.Printf("[SFU Manager] Stopped reading track from User %d: %v", userID, readErr)
					return 
				}
				if _, writeErr := localTrack.Write(rtpBuf[:i]); writeErr != nil {
					log.Printf("[SFU Error] Failed to write to local track: %v", writeErr)
					return
				}
			}
		}()

		// Give this new audio track to all OTHER users
		r.mu.RLock()
		for peerID, peerPC := range r.Peers {
			if peerID != userID { // Don't send the user's audio back to themselves
				if _, err := peerPC.AddTrack(localTrack); err != nil {
					log.Printf("[SFU Error] Failed to forward track to Peer %d: %v", peerID, err)
				} else {
					log.Printf("[SFU Manager] Forwarding User %d's audio to Peer %d", userID, peerID)
				}
			}
		}
		r.mu.RUnlock()
	})
}

// RemovePeer cleans up when a user leaves
func (r *Room) RemovePeer(userID uint64) {
	r.mu.Lock()

	if pc, exists := r.Peers[userID]; exists {
		pc.Close()
		delete(r.Peers, userID)
	}
	
	// Check if the room is empty while we still have the room lock
	isEmpty := len(r.Peers) == 0
	
	r.mu.Unlock() // Release the room lock BEFORE touching the Manager

	// Clean up the room if it's empty
	if isEmpty {
		Manager.mu.Lock()
		delete(Manager.Rooms, r.ID)
		Manager.mu.Unlock()
		log.Printf("[SFU Manager] Room %d was empty and has been deleted", r.ID)
	}
}
