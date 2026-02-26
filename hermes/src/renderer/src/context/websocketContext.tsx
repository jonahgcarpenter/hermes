import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
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

  // Track reconnection attempts to prevent memory leaks
  const reconnectTimeout = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (isLoading || !user) return

    const connect = () => {
      const ws = new WebSocket('ws://localhost:8080/api/ws')

      ws.onopen = () => {
        setIsConnected(true)
        setSocket(ws)
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      }

      ws.onclose = () => {
        setIsConnected(false)
        setSocket(null)
        // Auto-reconnect every 3 seconds if the server drops
        reconnectTimeout.current = setTimeout(connect, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket Error:', error)
        ws.close() // Force the onclose event to fire and trigger a reconnect
      }
    }

    connect()

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      if (ws) ws.close()
    }
  }, [user, isLoading])

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}
