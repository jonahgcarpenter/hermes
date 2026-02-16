import { useEffect, useRef, useState, useCallback } from 'react'
import api from '../lib/api'

export interface WSMessage {
  type: 'message' | 'join_channel' | 'typing'
  channel_id: number
  user_id: number
  content?: string
  username?: string
  user_avatar?: string
  id?: string
  timestamp?: string
}

export const useChat = (channelId: number, userId: number, userName: string) => {
  const [messages, setMessages] = useState<WSMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!channelId) return

    const fetchHistory = async () => {
      setIsLoadingHistory(true)
      try {
        const response = await api.get(`/channels/${channelId}/messages`)

        const history = response.data.map((msg: any) => ({
          type: 'message',
          channel_id: msg.ChannelID,
          user_id: msg.UserID,
          content: msg.Content,
          username: msg.User?.Name,
          user_avatar: msg.User?.AvatarURL,
          id: String(msg.ID),
          timestamp: msg.CreatedAt
        }))

        setMessages(history)
      } catch (error) {
        console.error('Failed to load chat history:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [channelId])

  useEffect(() => {
    const wsUrl = `ws://localhost:8080/api/ws?user_id=${userId}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      console.log('Connected to Chat WS')
      setIsConnected(true)

      socket.send(
        JSON.stringify({
          type: 'join_channel',
          channel_id: channelId,
          user_id: userId
        })
      )
    }

    socket.onmessage = (event) => {
      try {
        const parsedMessage: WSMessage = JSON.parse(event.data)

        if (parsedMessage.channel_id === channelId && parsedMessage.type === 'message') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === parsedMessage.id)) {
              return prev
            }
            return [...prev, parsedMessage]
          })
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err)
      }
    }

    socket.onclose = () => {
      console.log('Disconnected from Chat WS')
      setIsConnected(false)
    }

    return () => {
      socket.close()
    }
  }, [channelId, userId])

  const sendMessage = useCallback(
    (content: string) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'message',
            channel_id: channelId,
            user_id: userId,
            username: userName,
            content: content
          })
        )
      } else {
        console.warn('WebSocket is not connected')
      }
    },
    [channelId, userId, userName]
  )

  return { messages, sendMessage, isConnected, isLoadingHistory }
}
