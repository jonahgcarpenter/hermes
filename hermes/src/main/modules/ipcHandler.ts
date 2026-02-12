import { ipcMain, BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'

interface User {
  ID: number
  Email: string
  Name: string
  AvatarURL: string
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

const API_BASE_URL = is.dev ? 'http://localhost:8080/api' : 'https://api.your-production-domain.com'

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const defaultHeaders = { 'Content-Type': 'application/json' }

  const config = {
    ...options,
    headers: { ...defaultHeaders, ...options.headers }
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${await response.text()}`)
  }

  const text = await response.text()

  return text ? JSON.parse(text) : ({} as T)
}

export function registerIpcHandlers(): void {
  // AUTH: REFRESH TOKEN
  ipcMain.handle('auth:refresh', async (_event, refreshToken: string) => {
    return apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    })
  })

  // AUTH: START OAUTH FLOW
  ipcMain.handle('auth:start', async (_event, provider: string): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      const authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        show: true,
        autoHideMenuBar: true,
        alwaysOnTop: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      const authUrl = `${API_BASE_URL}/auth/${provider}`
      authWindow.loadURL(authUrl)

      authWindow.webContents.on('did-finish-load', async () => {
        const url = authWindow.webContents.getURL()

        if (url.includes('/callback')) {
          try {
            const pageContent =
              await authWindow.webContents.executeJavaScript('document.body.innerText')

            const responseData: AuthResponse = JSON.parse(pageContent)

            if (responseData.access_token) {
              resolve(responseData)
              authWindow.close()
            }
          } catch (error) {
            console.error('Failed to parse auth response:', error)
          }
        }
      })

      authWindow.on('closed', () => {
        reject(new Error('User cancelled login'))
      })
    })
  })

  // AUTH: LOGOUT
  ipcMain.handle('auth:logout', async (_event, refreshToken: string) => {
    return apiRequest('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    })
  })
}
