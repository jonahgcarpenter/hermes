import { useState, useRef, useEffect, useCallback } from 'react'

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

const log = (msg: string, data?: any) => {
  const time = new Date().toISOString().split('T')[1].split('.')[0]
  if (data) console.log(`[WebRTC ${time}] ${msg}`, data)
  else console.log(`[WebRTC ${time}] ${msg}`)
}

export const useVoice = (socket: WebSocket | null, userId: number) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([])
  const [connectionStatus, setConnectionStatus] = useState<RTCPeerConnectionState>('new')

  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<WebSocket | null>(socket)
  const socketQueue = useRef<string[]>([])
  const candidateQueue = useRef<RTCIceCandidateInit[]>([])
  const isSettingRemoteDescription = useRef(false)

  useEffect(() => {
    socketRef.current = socket

    const flushQueue = () => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return

      const queueLength = socketQueue.current.length
      if (queueLength > 0) {
        log(`Socket OPEN. Flushing ${queueLength} buffered messages...`)
        while (socketQueue.current.length > 0) {
          const msg = socketQueue.current.shift()
          if (msg) {
            socketRef.current.send(msg)
          }
        }
      }
    }

    if (socket) {
      if (socket.readyState === WebSocket.OPEN) {
        flushQueue()
      } else {
        log('Socket is CONNECTING. Waiting for open event...')

        const onOpen = () => {
          log("Socket 'open' event fired.")
          flushQueue()
        }

        socket.addEventListener('open', onOpen)
        return () => {
          socket.removeEventListener('open', onOpen)
        }
      }
    }
  }, [socket])

  const sendToSocket = useCallback((message: object) => {
    const jsonMsg = JSON.stringify(message)

    // Check ref directly for most up-to-date state
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(jsonMsg)
    } else {
      log('Socket not ready, buffering message', message)
      socketQueue.current.push(jsonMsg)
    }
  }, [])

  const joinVoiceChannel = useCallback(
    async (channelId: number) => {
      log(`Initiating Join for Channel ${channelId}`)
      try {
        if (peerConnection.current) {
          log('Closing existing PeerConnection before joining')
          peerConnection.current.close()
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        log('Local MediaStream acquired', stream.id)
        setLocalStream(stream)

        const pc = new RTCPeerConnection(RTC_CONFIG)
        peerConnection.current = pc
        log('New RTCPeerConnection created', RTC_CONFIG)

        pc.onconnectionstatechange = () => {
          log(`Connection State Changed: ${pc.connectionState}`)
          setConnectionStatus(pc.connectionState)
        }

        pc.oniceconnectionstatechange = () => {
          log(`ICE Connection State Changed: ${pc.iceConnectionState}`)
        }

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream)
        })

        pc.ontrack = (event) => {
          const remoteStream = event.streams[0]
          log(`Received REMOTE TRACK: ${event.track.kind} (${event.track.id})`)
          setRemoteStreams((prev) => {
            if (prev.some((s) => s.id === remoteStream.id)) return prev
            return [...prev, remoteStream]
          })
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendToSocket({
              type: 'ice_candidate',
              user_id: userId,
              data: event.candidate.toJSON()
            })
          } else {
            log('Finished generating local ICE candidates')
          }
        }

        log('Sending join_voice request')
        sendToSocket({
          type: 'join_voice',
          channel_id: channelId,
          user_id: userId
        })
      } catch (err) {
        console.error('[WebRTC Error] Failed to join voice channel:', err)
      }
    },
    [userId, sendToSocket]
  )

  const handleSignal = useCallback(
    async (msg: any) => {
      if (!peerConnection.current) {
        log('WARNING: Received signal but no PeerConnection exists', msg.type)
        return
      }
      const pc = peerConnection.current

      if (msg.type === 'offer') {
        log('Received OFFER from Server')
        try {
          isSettingRemoteDescription.current = true
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          isSettingRemoteDescription.current = false
          log('Remote Description SET. Processing Queue...')

          while (candidateQueue.current.length > 0) {
            const cand = candidateQueue.current.shift()
            if (cand) {
              await pc
                .addIceCandidate(new RTCIceCandidate(cand))
                .catch((e) => console.error('Failed to add queued candidate', e))
            }
          }

          log('Creating Answer...')
          const answer = await pc.createAnswer()
          log('Setting Local Description (Answer)...')
          await pc.setLocalDescription(answer)

          log('Sending ANSWER to Server')
          sendToSocket({ type: 'answer', user_id: userId, data: answer })
        } catch (err) {
          isSettingRemoteDescription.current = false
          console.error('[WebRTC Error] Error handling offer:', err)
        }
      } else if (msg.type === 'ice_candidate') {
        const candidateData = msg.candidate
        if (candidateData) {
          if (pc.remoteDescription && !isSettingRemoteDescription.current) {
            log('Adding Remote ICE Candidate directly')
            await pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch((e) => {
              if (!e.message.includes('mlines: 0'))
                console.error('[WebRTC Error] AddIceCandidate:', e)
            })
          } else {
            log('Queueing Remote ICE Candidate (RemoteDescription not ready)')
            candidateQueue.current.push(candidateData)
          }
        }
      }
    },
    [userId, sendToSocket]
  )

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [localStream])

  useEffect(() => {
    return () => {
      if (peerConnection.current) {
        peerConnection.current.close()
      }
    }
  }, [])

  return { joinVoiceChannel, handleSignal, remoteStreams, connectionStatus }
}
