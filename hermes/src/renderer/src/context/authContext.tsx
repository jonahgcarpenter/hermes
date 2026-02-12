import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  ID: number
  Email: string
  Name: string
  AvatarURL: string
  GoogleID?: string
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (provider: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Check for existing session on startup
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('access_token')

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
      setAccessToken(storedToken)
    }
    setIsLoading(false)
  }, [])

  // Login Function
  const login = async (provider: string) => {
    setIsLoading(true)
    try {
      const data: AuthResponse = await window.electron.ipcRenderer.invoke('auth:start', provider)

      setUser(data.user)
      setAccessToken(data.access_token)

      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Logout Function
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        await window.electron.ipcRenderer.invoke('auth:logout', refreshToken)
      }
    } catch (err) {
      console.error('Logout failed on server', err)
    } finally {
      setUser(null)
      setAccessToken(null)
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
