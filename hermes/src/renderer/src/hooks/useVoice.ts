import { useState, useRef, useEffect, useCallback } from 'react'

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export const useVoice = (socket: WebSocket | null, userId: number) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([])
  const peerConnection = useRef<RTCPeerConnection | null>(null)

  const candidateQueue = useRef<RTCIceCandidateInit[]>([])
  const isSettingRemoteDescription = useRef(false)

  const joinVoiceChannel = useCallback(
    async (channelId: number) => {
      if (!socket) return

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        setLocalStream(stream)

        const pc = new RTCPeerConnection(RTC_CONFIG)
        peerConnection.current = pc

        stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        pc.ontrack = (event) => {
          console.log('Received Remote Track')
          const remoteStream = event.streams[0]
          setRemoteStreams((prev) => [...prev, remoteStream])
          const audio = new Audio()
          audio.srcObject = remoteStream
          audio.autoplay = true
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.send(
              JSON.stringify({
                type: 'ice_candidate',
                user_id: userId,
                data: event.candidate.toJSON()
              })
            )
          }
        }

        socket.send(
          JSON.stringify({
            type: 'join_voice',
            channel_id: channelId,
            user_id: userId
          })
        )
      } catch (err) {
        console.error('Failed to join voice channel:', err)
      }
    },
    [socket, userId]
  )

  const handleSignal = useCallback(
    async (msg: any) => {
      if (!peerConnection.current) return
      const pc = peerConnection.current

      if (msg.type === 'offer') {
        console.log('Handling Offer')
        try {
          isSettingRemoteDescription.current = true
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          isSettingRemoteDescription.current = false
          console.log('Remote Description Set Successfully')

          // Process queued candidates
          while (candidateQueue.current.length > 0) {
            const cand = candidateQueue.current.shift()
            if (cand) {
              console.log('Processing queued ICE candidate')
              await pc
                .addIceCandidate(new RTCIceCandidate(cand))
                .catch((e) => console.warn('Retrying candidate failed:', e))
            }
          }

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket?.send(JSON.stringify({ type: 'answer', user_id: userId, data: answer }))
        } catch (err) {
          isSettingRemoteDescription.current = false
          console.error('Error handling offer:', err)
        }
      } else if (msg.type === 'ice_candidate') {
        const candidateData = msg.candidate
        if (candidateData) {
          if (pc.remoteDescription && !isSettingRemoteDescription.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch((e) => {
              if (!e.message.includes('mlines: 0')) console.error(e)
            })
          } else {
            console.log('Queueing ICE Candidate (remote description not ready)')
            candidateQueue.current.push(candidateData)
          }
        }
      }
    },
    [socket, userId]
  )

  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((track) => track.stop())
      peerConnection.current?.close()
    }
  }, [localStream])

  return { joinVoiceChannel, handleSignal, remoteStreams }
}
