import { useParams } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import Message from '../../componenets/servers/chat/message'
import SendGif from '../../componenets/servers/modals/sendGif'
import { Send, Image, Wifi, WifiOff } from 'lucide-react'
import { useChat } from '../../hooks/useChats'
import { useAuth } from '../../context/authContext'

export default function ServerPage() {
  const { channelId } = useParams()
  const { user } = useAuth()

  const {
    messages: wsMessages,
    sendMessage,
    isConnected
  } = useChat(Number(channelId), user?.id || 0, user?.name || 'Anonymous')

  const [input, setInput] = useState('')
  const [showGifModal, setShowGifModal] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [wsMessages])

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  const handleSendGifUrl = (url: string) => {
    sendMessage(url)
    setShowGifModal(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#313338]">
      {/* Header */}
      <div className="h-12 border-b border-[#26272D] flex items-center px-4 shadow-sm justify-between">
        <div className="flex items-center text-zinc-200 font-semibold">
          <span className="text-zinc-400 mr-2">#</span>
          {'general'}
        </div>
        <div className="flex items-center text-xs">
          {isConnected ? (
            <span className="flex items-center text-green-500 gap-1">
              <Wifi size={14} /> Connected
            </span>
          ) : (
            <span className="flex items-center text-red-500 gap-1">
              <WifiOff size={14} /> Reconnecting...
            </span>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className="flex-1 overflow-y-auto scrollbar-none flex flex-col px-4 pt-4"
        ref={scrollRef}
      >
        {!wsMessages || wsMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <p>Welcome to #{channelId}!</p>
            <p className="text-sm">This is the start of the channel.</p>
          </div>
        ) : (
          wsMessages.map((msg, i) => {
            return (
              <Message
                key={msg.id || i}
                id={msg.id || String(i)}
                content={msg.content || ''}
                timestamp={msg.timestamp || new Date().toISOString()}
                member={{
                  name: msg.username,
                  avatarUrl: msg.user_avatar,
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
            className="text-zinc-400 hover:text-zinc-200 p-2 transition-colors"
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
            className="text-zinc-400 hover:text-zinc-200 p-2 transition-colors disabled:opacity-50"
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
