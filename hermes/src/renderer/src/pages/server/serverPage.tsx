import { useParams } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import Message from '../../components/servers/chat/message'
import SendGif from '../../components/servers/modals/sendGif'
import { Send, Image, Users } from 'lucide-react'
import { useChat } from '../../hooks/useChats'

export default function ServerPage() {
  const { serverId, channelId } = useParams()
  const [showMembers, setShowMembers] = useState(false)

  const { messages, sendMessage, isConnected, isLoadingHistory } = useChat(
    serverId || '',
    channelId || ''
  )

  const [input, setInput] = useState('')
  const [showGifModal, setShowGifModal] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || !isConnected) return

    const success = await sendMessage(input)
    if (success) {
      setInput('')
    }
  }

  const handleSendGifUrl = async (url: string) => {
    await sendMessage(url)
    setShowGifModal(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#313338]">
      {/* Header */}
      <div className="h-12 border-b border-[#26272D] flex items-center px-4 shadow-sm justify-between">
        <div className="flex items-center text-zinc-200 font-semibold">
          <span className="text-zinc-400 mr-2">#</span>
          {/* You could fetch the actual channel name here using useChannels, defaulting to channelId for now */}
          {channelId}
        </div>
        <div className="flex items-center text-xs">
          {/* Toggle Members Button */}
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`transition-colors cursor-pointer ${showMembers ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Users size={20} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className="flex-1 overflow-y-auto scrollbar-none flex flex-col px-4 pt-4"
        ref={scrollRef}
      >
        {isLoadingHistory ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Loading messages...
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <p>Welcome to #{channelId}!</p>
            <p className="text-sm">This is the start of the channel.</p>
          </div>
        ) : (
          // Make sure to reverse if your backend sends newest first, or leave as-is if oldest first
          messages.map((msg, i) => {
            return (
              <Message
                key={msg.id || i}
                id={String(msg.id)}
                content={msg.content || ''}
                // Map the new timestamp field
                timestamp={msg.created_at || new Date().toISOString()}
                member={{
                  name: msg.author?.display_name,
                  avatarUrl: msg.author?.avatar_url,
                  color: '#f87171'
                }}
              />
            )
          })
        )}
      </div>

      {/* Input Area */}
      <div className="px-4 pb-6 pt-2">
        <div className="bg-[#383A40] rounded-lg p-2 flex items-center gap-2">
          <button
            onClick={() => setShowGifModal(true)}
            className="text-zinc-400 hover:text-zinc-200 p-2 transition-colors cursor-pointer"
          >
            <Image size={24} />
          </button>

          <form onSubmit={handleSend} className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message #${channelId}`}
              className="w-full bg-transparent text-zinc-200 placeholder-zinc-400 outline-none"
              disabled={!isConnected}
            />
          </form>

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || !isConnected}
            className="text-zinc-400 hover:text-zinc-200 p-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send size={24} />
          </button>
        </div>
      </div>

      {/* GIF Modal */}
      <SendGif
        isOpen={showGifModal}
        onClose={() => setShowGifModal(false)}
        onSelectGif={handleSendGifUrl}
      />
    </div>
  )
}
