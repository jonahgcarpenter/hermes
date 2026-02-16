package sfu

import (
	"encoding/json"
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
	UserID            uint
	PeerConnection    *webrtc.PeerConnection
	Tracks            []*webrtc.TrackLocalStaticRTP
	PendingCandidates []webrtc.ICECandidateInit
}

func NewSFU(signalSender func(uint, interface{})) *SFU {
	return &SFU{
		sessions:     make(map[uint]map[uint]*UserSession),
		SignalSender: signalSender,
	}
}

func (s *SFU) Join(channelID, userID uint) (*UserSession, error) {
	log.Printf("[SFU] User %d joining channel %d", userID, channelID)
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.sessions[channelID]; !ok {
		s.sessions[channelID] = make(map[uint]*UserSession)
	}

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{}, 
	}

	log.Println("[SFU] DEBUG: Creating PeerConnection (Global)...")
	pc, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Printf("[SFU] Failed to create PeerConnection: %v", err)
		return nil, err
	}

	log.Println("[SFU] DEBUG: PeerConnection Created! Adding Transceiver...")

	_, err = pc.AddTransceiverFromKind(webrtc.RTPCodecTypeAudio, webrtc.RTPTransceiverInit{
		Direction: webrtc.RTPTransceiverDirectionRecvonly,
	})
	if err != nil {
		log.Printf("[SFU] Failed to add transceiver: %v", err)
		return nil, err
	}

	session := &UserSession{
		UserID:         userID,
		PeerConnection: pc,
	}
	s.sessions[channelID][userID] = session

	pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf("[SFU] Received Track from User %d: %s %s", userID, track.ID(), track.Kind())
		
		localTrack, err := webrtc.NewTrackLocalStaticRTP(track.Codec().RTPCodecCapability, track.ID(), track.StreamID())
		if err != nil {
			log.Printf("[SFU] Error creating local track: %v", err)
			return
		}

		go s.fanOutTrack(channelID, userID, localTrack)

		buf := make([]byte, 1500)
		for {
			i, _, err := track.Read(buf)
			if err != nil {
				return
			}
			if _, err = localTrack.Write(buf[:i]); err != nil {
				return
			}
		}
	})

	pc.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil { return }
		s.SignalSender(userID, map[string]interface{}{
			"type":      "ice_candidate",
			"candidate": c.ToJSON(),
		})
	})

	pc.OnConnectionStateChange(func(p webrtc.PeerConnectionState) {
		log.Printf("[SFU] PC State for User %d: %s", userID, p.String())
	})

	log.Println("[SFU] DEBUG: Creating Offer...")
	
	offer, err := pc.CreateOffer(nil)
	if err != nil {
		log.Printf("[SFU] CreateOffer Failed: %v", err)
		return nil, err
	}

	log.Println("[SFU] DEBUG: Offer Created. Setting Local Description...")

	if err = pc.SetLocalDescription(offer); err != nil {
		log.Printf("[SFU] SetLocalDescription Failed: %v", err)
		return nil, err
	}

	log.Printf("[SFU] Sending OFFER to User %d", userID)
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
		log.Printf("[SFU] HandleSignal ignored: No session for User %d", userID)
		return
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("[SFU] JSON Marshal error: %v", err)
		return
	}

	switch signalType {
	case "answer":
		log.Printf("[SFU] Received ANSWER from User %d", userID)
		var answer webrtc.SessionDescription
		if err := json.Unmarshal(jsonData, &answer); err != nil {
			log.Printf("[SFU] Answer Unmarshal error: %v", err)
			return
		}

		if err := session.PeerConnection.SetRemoteDescription(answer); err != nil {
			log.Printf("[SFU] SetRemoteDescription ERROR: %v", err)
			return
		}
		log.Printf("[SFU] Remote Description Set for User %d", userID)

		if len(session.PendingCandidates) > 0 {
			log.Printf("[SFU] Processing %d queued candidates for User %d", len(session.PendingCandidates), userID)
			for _, c := range session.PendingCandidates {
				if err := session.PeerConnection.AddICECandidate(c); err != nil {
					log.Printf("[SFU] Failed to add queued candidate: %v", err)
				}
			}
			session.PendingCandidates = nil
		}

	case "ice_candidate":
		var candidateInit webrtc.ICECandidateInit
		if err := json.Unmarshal(jsonData, &candidateInit); err != nil {
			log.Printf("[SFU] Candidate Unmarshal error: %v", err)
			return
		}

		if session.PeerConnection.RemoteDescription() == nil {
			log.Printf("[SFU] Queueing ICE Candidate for User %d (RemoteDescription is nil)", userID)
			session.PendingCandidates = append(session.PendingCandidates, candidateInit)
		} else {
			log.Printf("[SFU] Adding ICE Candidate for User %d", userID)
			if err := session.PeerConnection.AddICECandidate(candidateInit); err != nil {
				log.Printf("[SFU] AddICECandidate ERROR: %v", err)
			}
		}
	}
}

func (s *SFU) fanOutTrack(channelID, sourceUserID uint, track *webrtc.TrackLocalStaticRTP) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if session, ok := s.sessions[channelID][sourceUserID]; ok {
		session.Tracks = append(session.Tracks, track)
	}

	for targetID, session := range s.sessions[channelID] {
		if targetID == sourceUserID {
			continue
		}

		log.Printf("[SFU] Fanning out track from %d to %d", sourceUserID, targetID)
		if _, err := session.PeerConnection.AddTrack(track); err != nil {
			log.Printf("[SFU] Error adding track to user %d: %v", targetID, err)
			continue
		}

		offer, err := session.PeerConnection.CreateOffer(nil)
		if err != nil {
			log.Printf("[SFU] Error creating renegotiation offer for %d: %v", targetID, err)
			continue
		}

		if err := session.PeerConnection.SetLocalDescription(offer); err != nil {
			log.Printf("[SFU] Error setting local description for %d: %v", targetID, err)
			continue
		}

		s.SignalSender(targetID, map[string]interface{}{
			"type": "offer",
			"sdp":  offer,
		})
	}
}
