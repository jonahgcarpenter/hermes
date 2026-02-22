import { useEffect, useState } from 'react'
import { useParams, Outlet } from 'react-router-dom'
import ChannelList from './channel-list'
import MembersList from './members-list'
import api from '../../../lib/api'
import { useAuth } from '../../../context/authContext'
import { useChannels } from '../../../hooks/useChannels'

interface ServerDetails {
  id: string
  name: string
  icon_url?: string
  owner_id: string
}

export default function ServerLayout() {
  const { serverId } = useParams()
  const { user, isLoading: authLoading } = useAuth()

  const [server, setServer] = useState<ServerDetails | null>(null)
  const [isLoadingServer, setIsLoadingServer] = useState(true)

  const { channels, fetchChannels } = useChannels(serverId || '')

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
      <ChannelList
        channels={channels}
        serverName={server.name}
        onJoinVoice={() => console.log('Voice refactoring coming soon!')}
        voiceStates={{}} // Stubbing this out temporarily
      />

      <main className="flex-1 flex flex-col bg-zinc-700 overflow-hidden relative">
        <Outlet context={{ server }} />
      </main>

      <MembersList members={[]} />
    </div>
  )
}
