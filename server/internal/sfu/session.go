package sfu

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/pion/webrtc/v3"
)

type SFU struct {
	sessions     map[uint]map[uint]*UserSession
	mu           sync.RWMutex
	SignalSender func(userID uint, data interface{})
}

type UserSession struct {
	UserID         uint
	PeerConnection *webrtc.PeerConnection
}

func NewSFU(signalSender func(uint, interface{})) *SFU {
	return &SFU{
		sessions:     make(map[uint]map[uint]*UserSession),
		SignalSender: signalSender,
	}
}

func (s *SFU) Join(channelID, userID uint) (*UserSession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.sessions[channelID]; !ok {
		s.sessions[channelID] = make(map[uint]*UserSession)
	}

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	}

	pc, err := webrtc.NewPeerConnection(config)
	if err != nil {
		return nil, err
	}

	session := &UserSession{UserID: userID, PeerConnection: pc}
	s.sessions[channelID][userID] = session

	pc.OnTrack(func(remoteTrack *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		localTrack, err := webrtc.NewTrackLocalStaticRTP(
			remoteTrack.Codec().RTPCodecCapability,
			fmt.Sprintf("audio-%d", userID),
			fmt.Sprintf("pion-%d", userID),
		)
		if err != nil {
			log.Printf("Error creating local track: %v", err)
			return
		}

		go func() {
			buf := make([]byte, 1500)
			for {
				i, _, err := remoteTrack.Read(buf)
				if err != nil {
					return
				}
				if _, err = localTrack.Write(buf[:i]); err != nil {
					return
				}
			}
		}()

		s.fanOutTrack(channelID, userID, localTrack)
	})

	pc.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			return
		}
		
		candidateJSON := c.ToJSON()
		
		s.SignalSender(userID, map[string]interface{}{
			"type":      "ice_candidate",
			"candidate": candidateJSON,
		})
	})

	offer, err := pc.CreateOffer(nil)
	if err != nil {
		return nil, err
	}
	
	if err = pc.SetLocalDescription(offer); err != nil {
		return nil, err
	}

	s.SignalSender(userID, map[string]interface{}{
		"type": "offer",
		"sdp":  offer,
	})

	return session, nil
}

func (s *SFU) HandleSignal(userID uint, signalType string, data interface{}) {
	s.mu.RLock()
	var session *UserSession
	for _, channelSessions := range s.sessions {
		if sess, ok := channelSessions[userID]; ok {
			session = sess
			break
		}
	}
	s.mu.RUnlock()

	if session == nil {
		log.Printf("HandleSignal: No session found for user %d", userID)
		return
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshalling signal data: %v", err)
		return
	}

	switch signalType {
	case "answer":
		var answer webrtc.SessionDescription
		if err := json.Unmarshal(jsonData, &answer); err != nil {
			log.Printf("Error unmarshalling answer: %v", err)
			return
		}
		if err := session.PeerConnection.SetRemoteDescription(answer); err != nil {
			log.Printf("Error setting remote description: %v", err)
		}

	case "ice_candidate":
		var candidateInit webrtc.ICECandidateInit
		if err := json.Unmarshal(jsonData, &candidateInit); err != nil {
			log.Printf("Error unmarshalling ICE candidate: %v", err)
			return
		}
		if err := session.PeerConnection.AddICECandidate(candidateInit); err != nil {
			log.Printf("Error adding ICE candidate: %v", err)
		}
	}
}

func (s *SFU) fanOutTrack(channelID, sourceUserID uint, track *webrtc.TrackLocalStaticRTP) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for targetID, session := range s.sessions[channelID] {
		if targetID == sourceUserID {
			continue
		}

		if _, err := session.PeerConnection.AddTrack(track); err != nil {
			log.Printf("Error adding track to user %d: %v", targetID, err)
			continue
		}

		offer, err := session.PeerConnection.CreateOffer(nil)
		if err != nil {
			continue
		}
		if err = session.PeerConnection.SetLocalDescription(offer); err != nil {
			continue
		}

		s.SignalSender(targetID, map[string]interface{}{
			"type": "offer",
			"sdp":  offer,
		})
	}
}
