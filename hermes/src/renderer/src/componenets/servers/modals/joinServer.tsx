import React, { useState } from 'react'
import { X, Compass } from 'lucide-react'
import { useServers } from '../../../hooks/useServers'

interface JoinServerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function JoinServerModal({ isOpen, onClose, onSuccess }: JoinServerModalProps) {
  const { isLoading } = useServers()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!inviteCode.trim()) {
      setError('Please enter a valid invite code.')
      return
    }

    try {
      console.log('Joining server with code:', inviteCode)

      setInviteCode('')
      onSuccess()
      onClose()
    } catch (err) {
      setError('Invalid invite code or you are already in this server.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-800 w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Join a Server</h2>
          <p className="text-zinc-400">Enter an invite below to join an existing server.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-zinc-900/50 p-2 rounded-lg flex justify-center mb-4">
            <Compass size={48} className="text-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
              Invite Link or Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full bg-zinc-900 border-none text-zinc-200 p-3 rounded focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
              placeholder="hX89sPd2"
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <div className="flex justify-between items-center mt-8 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-300 hover:underline text-sm"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || !inviteCode}
              className={`bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded transition-colors flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Joining...' : 'Join Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
