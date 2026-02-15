import { useParams } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import Message from '../../componenets/servers/chat/message'
import { Send, Image, Loader2, Wifi, WifiOff } from 'lucide-react'
import { searchGiphyGifs } from '../../lib/giphy'
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
  const [gifSearch, setGifSearch] = useState('')
  const [gifResults, setGifResults] = useState<any[]>([])
  const [gifLoading, setGifLoading] = useState(false)

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

  const openGifModal = () => setShowGifModal(true)
  const closeGifModal = () => setShowGifModal(false)

  const handleGifSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gifSearch.trim()) return

    setGifLoading(true)
    try {
      const results = await searchGiphyGifs(gifSearch)
      setGifResults(results)
    } catch (error) {
      console.error('Failed to search GIFs:', error)
    } finally {
      setGifLoading(false)
    }
  }

  const handleSelectGif = (gif: any) => {
    sendMessage(gif.images?.original?.url || gif.url)
    closeGifModal()
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
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-4 pt-4"
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
            onClick={openGifModal}
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
      {showGifModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#313338] rounded-lg w-full max-w-lg p-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-zinc-100 font-semibold">Select a GIF</h3>
              <button onClick={closeGifModal} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>
            <form onSubmit={handleGifSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                className="flex-1 rounded bg-zinc-700 text-zinc-100 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search GIFs..."
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                disabled={gifLoading}
              >
                {gifLoading ? <Loader2 className="animate-spin" /> : 'Search'}
              </button>
            </form>
            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {gifLoading ? (
                <div className="col-span-4 text-center text-zinc-400 py-8">Loading...</div>
              ) : gifResults.length > 0 ? (
                gifResults.map((gif, i) => (
                  <img
                    key={gif.id || i}
                    src={
                      gif.images?.fixed_height_small?.url || gif.images?.original?.url || gif.url
                    }
                    alt={gif.title || 'GIF'}
                    className="rounded cursor-pointer hover:opacity-80 object-cover w-full h-24"
                    onClick={() => handleSelectGif(gif)}
                  />
                ))
              ) : (
                <div className="col-span-4 text-center text-zinc-400 py-8">
                  {gifSearch ? 'No GIFs found.' : 'Search for something!'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
