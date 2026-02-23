import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { AxiosError } from 'axios'
import { useAuth } from './authContext'
import api from '../lib/api'

export interface UserProfile {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string
  status: string
}

export interface UpdateProfilePayload {
  username?: string
  email?: string
  displayName?: string
  avatarUrl?: string
  status?: string
}

interface UserContextType {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  updateProfile: (updates: UpdateProfilePayload) => Promise<void>
  deleteProfile: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const mapToCamelCase = (apiData: any): UserProfile => ({
  id: apiData.id?.toString(),
  username: apiData.username,
  email: apiData.email,
  displayName: apiData.display_name,
  avatarUrl: apiData.avatar_url,
  status: apiData.status
})

const mapToSnakeCase = (updates: UpdateProfilePayload): Record<string, any> => {
  const payload: Record<string, any> = {}

  if (updates.username !== undefined) payload.username = updates.username
  if (updates.email !== undefined) payload.email = updates.email
  if (updates.displayName !== undefined) payload.display_name = updates.displayName
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl
  if (updates.status !== undefined) payload.status = updates.status

  return payload
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch the source of truth from /@me
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/users/@me')

      const rawUser = res.data.user || res.data
      setProfile(mapToCamelCase(rawUser))
      setError(null)
    } catch (err: any) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        logout()
      }
      setError(err.response?.data?.error || err.message || 'Failed to fetch user profile')
    } finally {
      setIsLoading(false)
    }
  }, [logout])

  // Optimistic Updates for PATCH /@me
  const updateProfile = async (updates: UpdateProfilePayload) => {
    const previousProfile = profile

    if (profile) {
      setProfile({ ...profile, ...updates })
    }

    try {
      const backendPayload = mapToSnakeCase(updates)
      const res = await api.patch('/users/@me', backendPayload)

      const rawUser = res.data.user || res.data
      if (rawUser) setProfile(mapToCamelCase(rawUser))
    } catch (err: any) {
      // Rollback on failure
      setProfile(previousProfile)

      const errorMessage =
        err instanceof AxiosError
          ? err.response?.data?.error || err.message
          : 'Failed to update profile'

      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Delete Profile
  const deleteProfile = async () => {
    try {
      await api.delete('/users/@me')
      setProfile(null)
      logout()
    } catch (err: any) {
      const errorMessage =
        err instanceof AxiosError
          ? err.response?.data?.error || err.message
          : 'Failed to delete profile'

      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') fetchProfile()
    }

    window.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchProfile])

  useEffect(() => {
    // ws.on('USER_UPDATE', (wsPayload) => {
    //   if (wsPayload.userId === profile?.id) {
    //      const mappedUpdates = mapToCamelCase(wsPayload.updates)
    //      setProfile(prev => ({ ...prev, ...mappedUpdates }))
    //   }
    // })
  }, [])

  return (
    <UserContext.Provider
      value={{
        profile,
        isLoading,
        error,
        updateProfile,
        deleteProfile,
        refreshProfile: fetchProfile
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
