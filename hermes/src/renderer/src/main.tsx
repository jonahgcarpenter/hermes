import '../index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

import { AuthProvider } from './context/authContext'
import { WebSocketProvider } from './context/websocketContext'
import { UserProvider } from './context/userContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </WebSocketProvider>
    </AuthProvider>
  </StrictMode>
)
