import { useEffect, useState } from 'react'
import { useParams, Outlet } from 'react-router-dom'
import ChannelList from './channel-list'
import MembersList from './members-list'
import api from '../../../lib/api'
import { useAuth } from '../../../context/authContext'
import { useChannels } from '../../../hooks/useChannels'
import { useMembers } from '../../../hooks/useMembers'
import { useVoice } from '../../../hooks/useVoice'

interface ServerDetails {
  id: string
  name: string
  icon_url?: string
  owner_id: string
}

interface VoiceUser {
  id: string
  name: string
  avatar_url?: string
}

export default function ServerLayout() {
  const { serverId } = useParams()
  const { user, isLoading: authLoading } = useAuth()

  const [server, setServer] = useState<ServerDetails | null>(null)
  const [isLoadingServer, setIsLoadingServer] = useState(true)
  const [voiceSocket, setVoiceSocket] = useState<WebSocket | null>(null)
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceUser[]>>({})

  const { channels, fetchChannels } = useChannels(serverId || '')

  const { members } = useMembers(serverId)

  const { joinVoiceChannel, handleSignal, remoteStreams } = useVoice(voiceSocket, user?.id || 0)

  useEffect(() => {
    if (!user) return

    const ws = new WebSocket('ws://localhost:8080/api/ws/voice')

    ws.onopen = () => console.log('Connected to Voice Signaling Gateway')

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      // Route incoming messages directly into the WebRTC state machine
      handleSignal(msg)
    }

    setVoiceSocket(ws)

    return () => {
      ws.close()
    }
  }, [user, handleSignal])

  useEffect(() => {
    if (!user) return

    const globalWs = new WebSocket('ws://localhost:8080/api/ws')
    globalWs.onopen = () => console.log('Connected to Global Hub')

    globalWs.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      handleGlobalWsMessage(msg)
    }

    return () => globalWs.close()
  }, [user])

  const handleGlobalWsMessage = (msg: any) => {
    if (msg.event === 'VOICE_STATE_UPDATE') {
      const { channel_id, action, user, user_id } = msg.data
      const chanId = String(channel_id)

      setVoiceStates((prev) => {
        const currentUsers = prev[chanId] || []

        if (action === 'join') {
          // Prevent duplicates if React runs twice
          if (currentUsers.some((u) => u.id === user.id)) return prev
          return { ...prev, [chanId]: [...currentUsers, user] }
        }

        if (action === 'leave') {
          // Filter the user out of the array
          return {
            ...prev,
            [chanId]: currentUsers.filter((u) => String(u.id) !== String(user_id))
          }
        }

        return prev
      })
    }
  }

  useEffect(() => {
    const fetchDetails = async () => {
      if (!serverId) return
      setIsLoadingServer(true)
      try {
        const res = await api.get(`/servers/${serverId}`)
        setServer(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoadingServer(false)
      }
    }

    fetchDetails()
    fetchChannels()
  }, [serverId, fetchChannels])

  useEffect(() => {
    const fetchInitialVoiceStates = async () => {
      // Wait until channels are loaded
      if (!channels || channels.length === 0 || !serverId) return

      const voiceChannels = channels.filter((c) => c.type?.toLowerCase() === 'voice')
      if (voiceChannels.length === 0) return

      try {
        // Fetch all voice channel member lists concurrently
        const promises = voiceChannels.map((vc) =>
          api
            .get(`/servers/${serverId}/channels/${vc.id}/voice/members`)
            .then((res) => ({ channelId: vc.id, users: res.data || [] }))
            .catch((err) => {
              console.error(`Failed to fetch members for channel ${vc.id}`, err)
              return { channelId: vc.id, users: [] } // Fail gracefully per channel
            })
        )

        const results = await Promise.all(promises)

        setVoiceStates((prev) => {
          const next = { ...prev }

          results.forEach(({ channelId, users }) => {
            const currentUsers = next[channelId] || []

            // Combine WS state with HTTP state and deduplicate by ID
            const combined = [...currentUsers, ...users]
            const uniqueUsers = Array.from(new Map(combined.map((u) => [String(u.id), u])).values())

            next[channelId] = uniqueUsers
          })

          return next
        })
      } catch (error) {
        console.error('Error fetching initial voice states:', error)
      }
    }

    fetchInitialVoiceStates()
  }, [channels, serverId])

  if (authLoading || !user) {
    return <div className="flex-1 flex items-center justify-center">Loading User...</div>
  }

  if (isLoadingServer) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">Loading Server...</div>
    )
  }

  if (!server) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">Server not found</div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {remoteStreams.map((stream, idx) => (
        <audio
          key={idx}
          autoPlay
          playsInline
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream
            }
          }}
        />
      ))}

      <ChannelList
        channels={channels}
        serverName={server.name}
        onJoinVoice={joinVoiceChannel}
        voiceStates={voiceStates}
      />

      <main className="flex-1 flex flex-col bg-zinc-700 overflow-hidden relative">
        <Outlet context={{ server }} />
      </main>

      <MembersList members={members} />
    </div>
  )
}
