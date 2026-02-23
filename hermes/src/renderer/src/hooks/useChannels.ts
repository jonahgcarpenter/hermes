import { useState, useCallback } from 'react'
import api from '../lib/api'

export interface Channel {
  id: string
  server_id: string
  name: string
  type: 'TEXT' | 'VOICE'
  position: number
}

interface CreateChannelParams {
  name: string
  type?: 'TEXT' | 'VOICE'
}

interface UpdateChannelParams {
  name?: string
  position?: number
}

export function useChannels(serverId: string) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChannels = useCallback(async () => {
    if (!serverId) return

    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get(`/servers/${serverId}/channels`)
      setChannels(res.data || [])
    } catch (err: any) {
      console.error('Failed to fetch channels', err)
      setError(err.response?.data?.error || 'Failed to fetch channels')
    } finally {
      setIsLoading(false)
    }
  }, [serverId])

  const createChannel = async (params: CreateChannelParams): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      await api.post(`/servers/${serverId}/channels`, params)
      await fetchChannels()
      return true
    } catch (err: any) {
      console.error('Failed to create channel', err)
      setError(err.response?.data?.error || 'Failed to create channel')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateChannel = async (
    channelId: string,
    params: UpdateChannelParams
  ): Promise<boolean> => {
    try {
      await api.patch(`/servers/${serverId}/channels/${channelId}`, params)
      await fetchChannels()
      return true
    } catch (err) {
      console.error('Failed to update channel', err)
      return false
    }
  }

  const deleteChannel = async (channelId: string): Promise<boolean> => {
    try {
      await api.delete(`/servers/${serverId}/channels/${channelId}`)
      await fetchChannels()
      return true
    } catch (err) {
      console.error('Failed to delete channel', err)
      return false
    }
  }

  return {
    channels,
    isLoading,
    error,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel
  }
}
