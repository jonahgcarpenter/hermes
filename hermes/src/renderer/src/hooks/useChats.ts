import { useEffect, useRef, useState, useCallback } from 'react'
import api from '../lib/api'

export interface User {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
}

export interface Message {
  id: string
  channel_id: string
  author_id: string
  content: string
  author?: User
  created_at?: string
  updated_at?: string
}

interface WsBroadcast {
  Event: 'MESSAGE_CREATE' | 'MESSAGE_UPDATE' | 'MESSAGE_DELETE'
  Data: any
}

export const useChat = (serverId: string, channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  // Fetch historical messages on load
  useEffect(() => {
    if (!serverId || !channelId) return

    const fetchHistory = async () => {
      setIsLoadingHistory(true)
      try {
        const response = await api.get(`/servers/${serverId}/channels/${channelId}/messages/`)
        setMessages(response.data || [])
      } catch (error) {
        console.error('Failed to load chat history:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [serverId, channelId])

  // Connect to the new WebSocket route
  useEffect(() => {
    if (!serverId || !channelId) return

    const wsUrl = `ws://localhost:8080/api/servers/${serverId}/channels/${channelId}/messages/ws`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      console.log('Connected to Message WS')
      setIsConnected(true)
    }

    socket.onmessage = (event) => {
      try {
        const broadcast = JSON.parse(event.data)

        const eventType = broadcast.Event || broadcast.event
        const data = broadcast.Data || broadcast.data

        switch (eventType) {
          case 'MESSAGE_CREATE':
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev
              return [data, ...prev]
            })
            break

          case 'MESSAGE_UPDATE':
            setMessages((prev) =>
              prev.map((msg) => (msg.id === data.id ? { ...msg, content: data.content } : msg))
            )
            break

          case 'MESSAGE_DELETE':
            setMessages((prev) => prev.filter((msg) => String(msg.id) !== String(data.id)))
            break
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err)
      }
    }

    socket.onclose = () => {
      console.log('Disconnected from Message WS')
      setIsConnected(false)
    }

    return () => {
      socket.close()
    }
  }, [serverId, channelId])

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!serverId || !channelId || !content.trim()) return false
      try {
        await api.post(`/servers/${serverId}/channels/${channelId}/messages/`, { content })
        return true
      } catch (err) {
        console.error('Failed to send message:', err)
        return false
      }
    },
    [serverId, channelId]
  )

  // Edit a message
  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      try {
        await api.patch(`/servers/${serverId}/channels/${channelId}/messages/${messageId}`, {
          content
        })
        return true
      } catch (err) {
        console.error('Failed to edit message:', err)
        return false
      }
    },
    [serverId, channelId]
  )

  // Delete a message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await api.delete(`/servers/${serverId}/channels/${channelId}/messages/${messageId}`)
        return true
      } catch (err) {
        console.error('Failed to delete message:', err)
        return false
      }
    },
    [serverId, channelId]
  )

  return {
    messages,
    isConnected,
    isLoadingHistory,
    sendMessage,
    editMessage,
    deleteMessage
  }
}
