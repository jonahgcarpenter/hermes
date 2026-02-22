import { useEffect, useState, useRef } from 'react'
import { useParams, Outlet } from 'react-router-dom'
import ChannelList from './channel-list'
import MembersList from './members-list'
import api from '../../../lib/api'
import { useAuth } from '../../../context/authContext'
import { useVoice } from '../../../hooks/useVoice'

interface Channel {
  ID: number
  Name: string
  Type: 'text' | 'voice'
}

interface User {
  ID: number
  Name: string
  AvatarURL?: string
}

interface ServerDetails {
  Name: string
  Channels: Channel[]
  Members: User[]
  OwnerID: number
}

interface VoiceUser {
  ID: number
  Name: string
  AvatarURL?: string
}

const AudioPlayer = ({ stream }: { stream: MediaStream }) => {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream
    }
  }, [stream])

  return <audio ref={ref} autoPlay controls={false} />
}

export default function ServerLayout() {
  const { serverId } = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const [server, setServer] = useState<ServerDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [signalingSocket, setSignalingSocket] = useState<WebSocket | null>(null)
  const [voiceStates, setVoiceStates] = useState<Record<number, VoiceUser[]>>({})

  useEffect(() => {
    if (!user) return

    const ws = new WebSocket(`ws://localhost:8080/api/ws?user_id=${user.ID}`)

    ws.onopen = () => {
      setSignalingSocket(ws)
    }

    ws.onclose = () => {
      setSignalingSocket(null)
    }

    return () => {
      ws.close()
    }
  }, [user?.ID])

  const { joinVoiceChannel, handleSignal, remoteStreams, connectionStatus } = useVoice(
    signalingSocket,
    user?.ID || 0
  )

  useEffect(() => {
    if (!signalingSocket) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data)

        if (msg.type === 'user_joined_voice') {
          setVoiceStates((prev) => {
            const channelUsers = prev[msg.channel_id] || []
            if (channelUsers.some((u) => u.ID === msg.user_id)) return prev
            return {
              ...prev,
              [msg.channel_id]: [
                ...channelUsers,
                { ID: msg.user_id, Name: msg.username, AvatarURL: msg.user_avatar }
              ]
            }
          })
        }

        if (msg.type === 'signal') {
          handleSignal(msg.data)
        }
      } catch (e) {
        console.error(e)
      }
    }

    signalingSocket.addEventListener('message', handleMessage)
    return () => {
      signalingSocket.removeEventListener('message', handleMessage)
    }
  }, [signalingSocket, handleSignal])

  useEffect(() => {
    const fetchDetails = async () => {
      if (!serverId) return
      setIsLoading(true)
      try {
        const res = await api.get(`/servers/${serverId}`)
        setServer(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDetails()
  }, [serverId])

  if (authLoading || !user) {
    return <div className="flex-1 flex items-center justify-center">Loading User...</div>
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-zinc-400">Loading...</div>
  }

  if (!server) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">Server not found</div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ChannelList
        channels={server.Channels}
        serverName={server.Name}
        onJoinVoice={joinVoiceChannel}
        voiceStates={voiceStates}
      />

      <div className="absolute bottom-4 left-4 z-50 bg-black/80 text-white text-xs p-2 rounded pointer-events-none">
        Voice Status:{' '}
        <span
          className={
            connectionStatus === 'connected'
              ? 'text-green-500'
              : connectionStatus === 'failed'
                ? 'text-red-500'
                : 'text-yellow-500'
          }
        >
          {connectionStatus}
        </span>
        <br />
        Receiving {remoteStreams.length} Audio Streams
      </div>

      <div className="hidden">
        {remoteStreams.map((stream) => (
          <AudioPlayer key={stream.id} stream={stream} />
        ))}
      </div>

      <main className="flex-1 flex flex-col bg-zinc-700 overflow-hidden relative">
        <Outlet context={{ server }} />
      </main>

      <MembersList members={server.Members} />
    </div>
  )
}
