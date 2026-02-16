import { useState, useRef, useEffect, useCallback } from 'react'

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export const useVoice = (socket: WebSocket | null, userId: number) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([])
  const peerConnection = useRef<RTCPeerConnection | null>(null)

  const joinVoiceChannel = useCallback(
    async (channelId: number) => {
      console.log('Attempting to join voice:', channelId, 'Socket readyState:', socket?.readyState)

      if (!socket) {
        console.error('Socket is null')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        setLocalStream(stream)

        const pc = new RTCPeerConnection(RTC_CONFIG)
        peerConnection.current = pc

        stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        pc.ontrack = (event) => {
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

        console.log('Sending join_voice message for user:', userId)

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
        await pc.setRemoteDescription(new RTCSessionDescription(msg.data.sdp)) // msg.data.sdp based on your backend structure
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket?.send(
          JSON.stringify({
            type: 'answer',
            user_id: userId,
            data: answer
          })
        )
      } else if (msg.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.data))
      } else if (msg.type === 'ice_candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(msg.data.candidate))
      }
    },
    [socket, userId]
  )

  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((track) => track.stop())
      peerConnection.current?.close()
    }
  }, [])

  return { joinVoiceChannel, handleSignal, remoteStreams }
}
