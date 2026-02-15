import { useParams } from 'react-router-dom'
import { useState, useRef } from 'react'
import Message from '../../componenets/servers/chat/message'
import { SAMPLE_CHATS } from '../../sample-data/chats'
import { Send, Image } from 'lucide-react'
import { searchGiphyGifs } from '../../lib/giphy'

export default function ServerPage() {

  const { channelId } = useParams()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(() => SAMPLE_CHATS.filter((m) => m.channel_id === channelId))
  const [showGifModal, setShowGifModal] = useState(false)
  const [gifSearch, setGifSearch] = useState('')
  const [gifResults, setGifResults] = useState<any[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!input.trim()) return
    const newMessage = {
      id: Date.now().toString(),
      channel_id: channelId,
      message: input,
      member: {
        id: 'me',
        name: 'You',
        avatar: '',
      },
      user: 'me',
      sent_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMessage])
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
    } catch {
      setGifResults([])
    }
    setGifLoading(false)
  }

  const handleSelectGif = (gif: any) => {
    const newMessage = {
      id: Date.now().toString(),
      channel_id: channelId,
      message: '',
      member: {
        id: 'me',
        name: 'You',
        avatar: '',
      },
      user: 'me',
      sent_at: new Date().toISOString(),
      gif: gif.images?.original?.url || gif.url || '',
    }
    setMessages((prev) => [...prev, newMessage])
    closeGifModal()
    setGifSearch('')
    setGifResults([])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-700">
      {/* Chat Header would go here */}


      <div className="flex-1 overflow-y-auto flex flex-col justify-end pb-4">
        {messages.length > 0 ? (
          messages.map((msg, index) => {
            const isHead = index === 0 || messages[index - 1].user !== msg.user
            if (msg.gif) {
              return (
                <div key={msg.id} className="flex items-end gap-2 mb-2">
                  <img
                    src={msg.gif}
                    alt="GIF"
                    className="max-w-[180px] max-h-[180px] rounded shadow border border-zinc-600"
                  />
                </div>
              )
            }
            return (
              <Message
                key={msg.id}
                id={msg.id}
                content={msg.message}
                member={msg.member}
                timestamp={msg.sent_at}
                isHead={isHead}
              />
            )
          })
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            No messages yet. Start the conversation!
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-zinc-600 bg-zinc-800 px-4 py-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 rounded bg-zinc-700 text-zinc-100 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
        />
        <button
          className="p-2 rounded-full bg-zinc-600 text-white hover:bg-zinc-500 transition-colors flex items-center justify-center"
          type="button"
          aria-label="Add GIF"
          style={{ marginRight: 4 }}
          onClick={openGifModal}
        >
          <Image className="w-5 h-5" />
        </button>
        <button
          className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center"
          type="button"
          onClick={handleSend}
          aria-label="Send"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* GIF Modal */}
      {showGifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-zinc-800 rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-100"
              onClick={closeGifModal}
              aria-label="Close GIF picker"
            >
              ×
            </button>
            <form onSubmit={handleGifSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                className="flex-1 rounded bg-zinc-700 text-zinc-100 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search GIFs..."
                value={gifSearch}
                onChange={e => setGifSearch(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                disabled={gifLoading}
              >
                Search
              </button>
            </form>
            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {gifLoading ? (
                <div className="col-span-4 text-center text-zinc-400">Loading...</div>
              ) : gifResults.length > 0 ? (
                gifResults.map((gif, i) => (
                  <img
                    key={gif.id || i}
                    src={gif.images?.fixed_height_small?.url || gif.images?.original?.url || gif.url}
                    alt={gif.title || 'GIF'}
                    className="rounded cursor-pointer hover:opacity-80"
                    onClick={() => handleSelectGif(gif)}
                  />
                ))
              ) : (
                <div className="col-span-4 text-center text-zinc-400">No GIFs found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
