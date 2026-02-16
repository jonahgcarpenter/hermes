import React, { useState } from 'react'
import { Loader2, X, Search } from 'lucide-react'
import { searchGiphyGifs } from '../../../lib/giphy'

interface SendGifProps {
  isOpen: boolean
  onClose: () => void
  onSelectGif: (gifUrl: string) => void
}

export default function SendGif({ isOpen, onClose, onSelectGif }: SendGifProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const data = await searchGiphyGifs(searchQuery)
      setResults(data)
    } catch (error) {
      console.error('Failed to search GIFs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (gif: any) => {
    const url = gif.images?.original?.url || gif.url
    onSelectGif(url)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#313338] rounded-lg w-full max-w-lg p-4 shadow-xl border border-[#26272D]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-zinc-100 font-semibold text-lg">Select a GIF</h3>
          <button
            onClick={onClose}
            className="cursor-pointer text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative flex items-center w-full">
            <input
              type="text"
              className="w-full rounded bg-[#1E1F22] text-zinc-200 px-3 py-2 pl-3 pr-10 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-400 transition-all"
              placeholder="Search Giphy"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="absolute right-3 text-zinc-400 pointer-events-none">
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            </div>
          </div>
        </form>

        {/* Results Grid */}
        <div className="grid grid-cols-3 gap-2 h-80 overflow-y-auto scrollbar-none pr-1">
          {isLoading ? (
            <div className="col-span-3 flex items-center justify-center h-full text-zinc-500">
              Searching...
            </div>
          ) : results.length > 0 ? (
            results.map((gif, i) => (
              <div
                key={gif.id || i}
                className="relative aspect-video group cursor-pointer"
                onClick={() => handleSelect(gif)}
              >
                <img
                  src={gif.images?.fixed_height_small?.url || gif.images?.original?.url || gif.url}
                  alt={gif.title || 'GIF'}
                  className="w-full h-full object-cover rounded border border-transparent group-hover:border-indigo-500 transition-all"
                />
              </div>
            ))
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
              <Search size={32} className="opacity-50" />
              <p>{searchQuery ? 'No GIFs found.' : 'Search for a GIF!'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
