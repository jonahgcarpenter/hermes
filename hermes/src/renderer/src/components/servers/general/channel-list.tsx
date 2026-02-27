import { Hash, Volume2, Plus, Settings } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

interface Channel {
  id: string
  name: string
  type: 'text' | 'voice' | 'TEXT' | 'VOICE'
}

interface VoiceUser {
  id: string
  name: string
  avatar_url?: string
}

interface ChannelListProps {
  channels: Channel[]
  serverName: string
  onJoinVoice?: (channelId: string) => void
  voiceStates?: Record<string, VoiceUser[]>
}

export default function ChannelList({
  channels,
  serverName,
  onJoinVoice,
  voiceStates = {}
}: ChannelListProps) {
  const { serverId, channelId } = useParams()

  console.log('[ChannelList Render] Current voiceStates:', voiceStates)

  const textChannels = channels?.filter((c) => c.type?.toLowerCase() === 'text') || []
  const voiceChannels = channels?.filter((c) => c.type?.toLowerCase() === 'voice') || []

  return (
    <div className="flex flex-col h-full w-60 bg-zinc-900 flex-shrink-0">
      {/* Server Header */}
      <div className="h-12 flex items-center px-4 font-bold text-white shadow-sm border-b border-zinc-950 hover:bg-zinc-800 transition-colors cursor-pointer">
        {serverName}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 no-scrollbar">
        {/* Text Channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 mb-1 text-xs font-bold text-zinc-400 hover:text-zinc-300 uppercase">
            <span>Text Channels</span>
            <Plus className="cursor-pointer hover:text-white" size={14} />
          </div>
          <div className="space-y-[2px]">
            {textChannels.map((channel) => (
              <Link
                key={channel.id}
                to={`/servers/${serverId}/channels/${channel.id}`}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-all ${
                  channelId === channel.id
                    ? 'bg-zinc-700/60 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                }`}
              >
                <Hash size={18} className="flex-shrink-0 text-zinc-500" />
                <span className="truncate font-medium">{channel.name}</span>
                <Settings
                  size={14}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Voice Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 text-xs font-bold text-zinc-400 hover:text-zinc-300 uppercase">
            <span>Voice Channels</span>
            <Plus className="cursor-pointer hover:text-white" size={14} />
          </div>
          <div className="space-y-[2px]">
            {voiceChannels.map((channel) => (
              <div key={channel.id}>
                <div
                  onClick={() => onJoinVoice?.(channel.id)}
                  className="group flex items-center gap-2 px-2 py-1.5 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 cursor-pointer transition-all"
                >
                  <Volume2 size={18} className="flex-shrink-0 text-zinc-500" />
                  <span className="truncate font-medium">{channel.name}</span>
                </div>

                {voiceStates[String(channel.id)] && voiceStates[String(channel.id)].length > 0 && (
                  <div className="ml-8 space-y-1 mb-1">
                    {voiceStates[String(channel.id)].map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer"
                      >
                        <div className="w-5 h-5 rounded-full bg-zinc-600 overflow-hidden flex items-center justify-center">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-zinc-300 uppercase">
                              {u.name ? u.name.charAt(0) : '?'}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-zinc-400 truncate">
                          {u.name || 'Unknown User'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
