import { useState, useCallback } from 'react'
import api from '../lib/api'

export interface Server {
  id: string
  name: string
  icon_url: string
  owner_id: string
}

interface CreateServerParams {
  name: string
  icon_url?: string
}

export function useServers() {
  const [servers, setServers] = useState<Server[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchServers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get('/servers/')
      setServers(res.data || [])
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
      await api.post('/servers/', params)
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

  const lookupServer = async (serverId: string): Promise<Server | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get(`/servers/${serverId}`)
      return res.data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Server not found')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const joinServer = async (serverId: string | number): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      await api.post(`/servers/${serverId}/join`)
      await fetchServers()
      return true
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join server')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateServer = async (id: number, name: string) => {
    try {
      await api.patch(`/servers/${id}`, { name })
      await fetchServers()
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  const deleteServer = async (id: number) => {
    try {
      await api.delete(`/servers/${id}`)
      await fetchServers()
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  return {
    servers,
    isLoading,
    error,
    fetchServers,
    createServer,
    lookupServer,
    joinServer,
    updateServer,
    deleteServer
  }
}
