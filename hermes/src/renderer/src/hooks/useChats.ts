import { useEffect, useState, useCallback } from 'react'
import api from '../lib/api'
import { useWebSocket } from '../context/websocketContext'

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

export const useChat = (serverId: string, channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Grab the global socket and connection status from Context
  const { socket, isConnected } = useWebSocket()

  // Fetch historical messages on load (Unchanged)
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

  // Listen to the Global WebSocket
  useEffect(() => {
    if (!socket || !channelId) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data)

        // Because this is a global socket, we will receive messages
        // for ALL channels the user is in. We MUST ignore events meant for other channels.
        if (msg.channel_id?.toString() !== channelId) return

        switch (msg.event) {
          case 'MESSAGE_CREATE':
            setMessages((prev) => [msg.data, ...prev])
            break
          case 'MESSAGE_UPDATE':
            setMessages((prev) => prev.map((m) => (m.id === msg.data.id ? msg.data : m)))
            break
          case 'MESSAGE_DELETE':
            setMessages((prev) => prev.filter((m) => m.id !== msg.data.id))
            break
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    // Attach the listener
    socket.addEventListener('message', handleMessage)

    // Remove the listener when the component unmounts or channel changes
    return () => {
      socket.removeEventListener('message', handleMessage)
    }
  }, [socket, channelId])

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
