import { useState, useRef, useEffect, useCallback } from 'react'

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

const log = (msg: string, data?: any) => {
  const time = new Date().toISOString().split('T')[1].split('.')[0]
  if (data) console.log(`[WebRTC ${time}] ${msg}`, data)
  else console.log(`[WebRTC ${time}] ${msg}`)
}

export const useVoice = (socket: WebSocket | null, userId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([])
  const [connectionStatus, setConnectionStatus] = useState<RTCPeerConnectionState>('new')

  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<WebSocket | null>(socket)
  const socketQueue = useRef<string[]>([])

  const localStreamRef = useRef<MediaStream | null>(null)

  const currentChannelId = useRef<string | null>(null)

  useEffect(() => {
    socketRef.current = socket
    if (socket?.readyState === WebSocket.OPEN) {
      while (socketQueue.current.length > 0) {
        const msg = socketQueue.current.shift()
        if (msg) socketRef.current.send(msg)
      }
    }
  }, [socket])

  const sendToSocket = useCallback((event: string, data: any) => {
    if (!currentChannelId.current) return

    const jsonMsg = JSON.stringify({
      event: event,
      channel_id: currentChannelId.current.toString(),
      data: data
    })

    log(`>>> Sending WebSocket Message: ${event}`)

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(jsonMsg)
    } else {
      log(`Socket not open, queueing: ${event}`)
      socketQueue.current.push(jsonMsg)
    }
  }, [])

  const joinVoiceChannel = useCallback(
    async (channelId: string) => {
      log(`Initiating Join for Channel ${channelId}`)
      currentChannelId.current = channelId

      try {
        if (peerConnection.current) {
          log('Closing existing peer connection')
          peerConnection.current.close()
        }

        log('Requesting microphone permissions...')
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        setLocalStream(stream)
        localStreamRef.current = stream
        log('Microphone access granted')

        const pc = new RTCPeerConnection(RTC_CONFIG)
        peerConnection.current = pc

        pc.onconnectionstatechange = () => {
          log(`Connection State Changed: ${pc.connectionState}`)
          setConnectionStatus(pc.connectionState)
        }

        pc.oniceconnectionstatechange = () => {
          log(`ICE Connection State: ${pc.iceConnectionState}`)
        }

        log('Adding local audio tracks to PeerConnection')
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        pc.ontrack = (event) => {
          const remoteStream = event.streams[0]
          log(`<<< Received REMOTE TRACK: ${event.track.kind} (ID: ${remoteStream.id})`)
          setRemoteStreams((prev) => {
            if (prev.some((s) => s.id === remoteStream.id)) return prev
            return [...prev, remoteStream]
          })
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            log(`>>> Sending local ICE Candidate`)
            sendToSocket('ICE_CANDIDATE', event.candidate.toJSON())
          }
        }

        log('Creating WEBRTC_OFFER...')
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        log('>>> Sending WEBRTC_OFFER to server')
        sendToSocket('WEBRTC_OFFER', offer)
      } catch (err) {
        console.error('[WebRTC Error] Failed to join voice channel:', err)
      }
    },
    [sendToSocket]
  )

  const handleSignal = useCallback(async (msg: any) => {
    log(`<<< Received WebSocket Message: ${msg.event}`)

    const pc = peerConnection.current
    if (!pc) {
      log(`Warning: Received ${msg.event} but PeerConnection is null`)
      return
    }

    try {
      if (msg.event === 'WEBRTC_ANSWER') {
        log('Setting Remote Description (Answer) from server')
        await pc.setRemoteDescription(new RTCSessionDescription(msg.data))
        log('Successfully set Remote Description')
      } else if (msg.event === 'ICE_CANDIDATE') {
        log('Adding ICE Candidate from server')
        await pc.addIceCandidate(new RTCIceCandidate(msg.data))
      }
    } catch (err) {
      console.error('[WebRTC Error] Error handling signal:', err)
    }
  }, [])

  useEffect(() => {
    return () => {
      log('Unmounting hook, cleaning up WebRTC...')
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      peerConnection.current?.close()
    }
  }, [])

  return { joinVoiceChannel, handleSignal, remoteStreams, connectionStatus }
}
