import { useEffect, useState } from 'react'
import { useParams, Outlet } from 'react-router-dom'
import ChannelList from './channel-list'
import MembersList from './members-list'
import api from '../../../lib/api'

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

export default function ServerLayout() {
  const { serverId } = useParams()
  const [server, setServer] = useState<ServerDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!serverId) return
      setIsLoading(true)
      try {
        const res = await api.get(`/servers/${serverId}`)
        setServer(res.data)
      } catch (err) {
        console.error('Failed to load server details', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDetails()
  }, [serverId])

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
      {/* Left Sidebar: Channels */}
      <ChannelList channels={server.Channels} serverName={server.Name} />

      {/* Main Content Area (Chat) */}
      <main className="flex-1 flex flex-col bg-zinc-700 overflow-hidden relative">
        <Outlet context={{ server }} />
      </main>

      {/* Right Sidebar: Members */}
      <MembersList
        members={server.Members.map((m) => ({ ...m, IsOwner: m.ID === server.OwnerID }))}
      />
    </div>
  )
}
