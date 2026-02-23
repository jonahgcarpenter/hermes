import { useState, useEffect } from 'react'
import api from '../lib/api'

export interface User {
  id: string
  username: string
  avatar_url?: string
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

  return { members, isLoading, error }
}
