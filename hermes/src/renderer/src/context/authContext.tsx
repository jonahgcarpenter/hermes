import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../lib/api'

interface User {
  ID: string
  Email: string
  Username: string
  DisplayName: string
  Status: string
}

interface AuthResponse {
  message: string
  user: User
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (identity: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Check for existing session on startup
  useEffect(() => {
    const storedUser = localStorage.getItem('user')

    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  // Login Function
  const login = async (identity: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await api.post<AuthResponse>('/auth/login', { identity, password })

      setUser(response.data.user)
      localStorage.setItem('user', JSON.stringify(response.data.user))
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
      await api.post('/auth/logout')
    } catch (err) {
      console.error('Logout failed on server', err)
    } finally {
      // Clear local state regardless of whether the server request succeeded
      setUser(null)
      localStorage.removeItem('user')
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
