import { useState, useCallback } from 'react'
import api from '../lib/api'

export interface Server {
  ID: number
  Name: string
  IconURL: string
  OwnerID: number
}

interface CreateServerParams {
  name: string
  is_private: boolean
  password?: string
}

export function useServers() {
  const [servers, setServers] = useState<Server[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchServers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get('/servers')
      setServers(res.data.servers || [])
    } catch (err: any) {
      console.error('Failed to fetch servers', err)
      setError(err.response?.data?.error || 'Failed to fetch servers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createServer = async (params: CreateServerParams): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      await api.post('/servers', params)
      // Optimistically update or just re-fetch
      await fetchServers()
      return true
    } catch (err: any) {
      console.error('Failed to create server', err)
      setError(err.response?.data?.error || 'Failed to create server')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    servers,
    isLoading,
    error,
    fetchServers,
    createServer
  }
}
