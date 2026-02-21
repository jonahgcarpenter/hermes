package sfu

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

	// Give this new user all the EXISTING audio tracks in the room
	for _, track := range r.Tracks {
		if _, err := pc.AddTrack(track); err != nil {
			log.Println("Error adding existing track to new peer:", err)
		}
	}

	// When this new user starts speaking, forward their audio to everyone else
	pc.OnTrack(func(remoteTrack *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		// Create a local copy of the incoming audio track
		localTrack, err := webrtc.NewTrackLocalStaticRTP(
			remoteTrack.Codec().RTPCodecCapability,
			remoteTrack.ID(),
			remoteTrack.StreamID(),
		)
		if err != nil {
			log.Println("Error creating local track:", err)
			return
		}

		// Save it to the room
		r.mu.Lock()
		r.Tracks = append(r.Tracks, localTrack)
		r.mu.Unlock()

		// Read RTP packets from the user and write them to the local track (Forwarding)
		go func() {
			rtpBuf := make([]byte, 1400)
			for {
				i, _, readErr := remoteTrack.Read(rtpBuf)
				if readErr != nil {
					return // User disconnected or stopped talking
				}
				if _, writeErr := localTrack.Write(rtpBuf[:i]); writeErr != nil {
					return
				}
			}
		}()

		// Give this new audio track to all OTHER users in the room
		r.mu.RLock()
		for peerID, peerPC := range r.Peers {
			if peerID != userID { // Don't send the user's own voice back to them
				if _, err := peerPC.AddTrack(localTrack); err != nil {
					log.Println("Error adding track to peer:", err)
				}
				// TODO: Sending a new offer here.
			}
		}
		r.mu.RUnlock()
	})
}

// RemovePeer cleans up when a user leaves
func (r *Room) RemovePeer(userID uint64) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if pc, exists := r.Peers[userID]; exists {
		pc.Close()
		delete(r.Peers, userID)
	}
	
	// Clean up the room if it's empty
	if len(r.Peers) == 0 {
		Manager.mu.Lock()
		delete(Manager.Rooms, r.ID)
		Manager.mu.Unlock()
	}
}
