import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../lib/api'
import { useWebSocket } from '../context/websocketContext'
import { useUser } from '../context/userContext'

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

  // Typing indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({})
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({})

  // Grab the global socket and connection status from Context
  const { socket, isConnected } = useWebSocket()

  const { profile } = useUser()
  const currentUserId = profile?.id?.toString()

  // Fetch historical messages on load
  useEffect(() => {
    if (!serverId || !channelId) return

    const fetchHistory = async () => {
      setIsLoadingHistory(true)
      try {
        const response = await api.get(`/servers/${serverId}/channels/${channelId}/messages`)
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
          case 'TYPING_START':
            const { user_id, username } = msg.data
            // Don't show "You are typing..." to yourself
            if (user_id === currentUserId) return

            // Add them to the typing map
            setTypingUsers((prev) => ({ ...prev, [user_id]: username }))

            // Clear any existing timeout for this user
            if (typingTimeouts.current[user_id]) {
              clearTimeout(typingTimeouts.current[user_id])
            }

            // Set a new 5-second timeout to remove them
            typingTimeouts.current[user_id] = setTimeout(() => {
              setTypingUsers((prev) => {
                const newState = { ...prev }
                delete newState[user_id]
                return newState
              })
            }, 5000)
            break
          case 'MESSAGE_CREATE':
            // Implicitly clear the typing indicator for the message author
            const authorId = msg.data.author_id?.toString()
            if (authorId) {
              setTypingUsers((prev) => {
                if (!prev[authorId]) return prev // Skip if they weren't marked as typing
                const newState = { ...prev }
                delete newState[authorId]
                return newState
              })

              if (typingTimeouts.current[authorId]) {
                clearTimeout(typingTimeouts.current[authorId])
              }
            }

            // Add the message to the chat UI
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.data.id)) return prev
              return [...prev, msg.data]
            })
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
  }, [socket, channelId, currentUserId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!serverId || !channelId || !content.trim()) return false
      try {
        await api.post(`/servers/${serverId}/channels/${channelId}/messages`, { content })
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
    deleteMessage,
    typingUsers
  }
}
