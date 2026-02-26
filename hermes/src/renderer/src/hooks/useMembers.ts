import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useWebSocket } from '../context/websocketContext'

export interface User {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  status: string
}

export interface ServerMember {
  server_id: string
  user_id: string
  role: string
  nickname?: string
  user: User
  joined_at: string
}

export const useMembers = (serverID: string | undefined) => {
  const [members, setMembers] = useState<ServerMember[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { socket } = useWebSocket()

  useEffect(() => {
    if (!serverID) {
      setMembers([])
      return
    }

    const fetchMembers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await api.get<ServerMember[]>(`/servers/${serverID}/members`)

        setMembers(response.data)
      } catch (err: any) {
        const message = err.response?.data?.error || err.message || 'An unknown error occurred'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [serverID])

  useEffect(() => {
    if (!socket || !serverID) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data)

        // Ensure the event is for the server we are currently viewing
        if (msg.server_id?.toString() !== serverID) return

        switch (msg.event) {
          case 'PRESENCE_UPDATE':
            // Find the specific member and update only their status
            setMembers((prev) =>
              prev.map((member) =>
                member.user_id === msg.data.user_id?.toString()
                  ? { ...member, user: { ...member.user, status: msg.data.status } }
                  : member
              )
            )
            break

          case 'SERVER_MEMBER_ADD':
            // Prevent duplicates just in case the REST API fetched them at the exact same time
            setMembers((prev) => {
              if (prev.some((m) => m.user_id === msg.data.user_id?.toString())) return prev
              return [...prev, msg.data]
            })
            break

          case 'SERVER_MEMBER_REMOVE':
            // Remove them from the list if they leave the server
            setMembers((prev) => prev.filter((m) => m.user_id !== msg.data.user_id?.toString()))
            break
        }
      } catch (e) {
        console.error('Failed to parse member WebSocket event:', e)
      }
    }

    socket.addEventListener('message', handleMessage)

    return () => {
      socket.removeEventListener('message', handleMessage)
    }
  }, [socket, serverID])

  return { members, isLoading, error }
}
