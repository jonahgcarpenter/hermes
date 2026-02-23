import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './authContext'

interface WebSocketContextType {
  socket: WebSocket | null
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false
})

export const useWebSocket = () => useContext(WebSocketContext)

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading || !user) return

    const ws = new WebSocket('ws://localhost:8080/api/ws')

    ws.onopen = () => {
      console.log('Global WebSocket Connected')
      setIsConnected(true)
      setSocket(ws)
    }

    ws.onclose = () => {
      console.log('Global WebSocket Disconnected')
      setIsConnected(false)
      setSocket(null)
      // Optional: Add reconnection logic here (e.g., setTimeout)
    }

    return () => {
      ws.close()
    }
  }, [user, isLoading])

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}
