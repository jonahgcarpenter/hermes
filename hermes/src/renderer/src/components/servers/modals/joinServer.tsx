import React, { useState, useEffect } from 'react'
import { X, Compass, ArrowRight } from 'lucide-react'
import { useServers, Server } from '../../../hooks/useServers'

interface JoinServerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function JoinServerModal({ isOpen, onClose, onSuccess }: JoinServerModalProps) {
  const { lookupServer, joinServer, isLoading, error: hookError } = useServers()

  const [step, setStep] = useState<'invite' | 'preview'>('invite')
  const [serverId, setServerId] = useState('')
  const [foundServer, setFoundServer] = useState<Server | null>(null)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep('invite')
      setServerId('')
      setFoundServer(null)
      setLocalError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!serverId.trim()) {
      setLocalError('Please enter a valid Server ID.')
      return
    }

    const server = await lookupServer(serverId)
    if (server) {
      setFoundServer(server)
      setStep('preview') // Move to the confirm screen
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foundServer) return

    const success = await joinServer(foundServer.id)
    if (success) {
      onSuccess()
      onClose()
    }
  }

  const displayError = localError || hookError

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
          <h2 className="text-2xl font-bold text-white mb-2">
            {step === 'invite' ? 'Join a Server' : 'Confirm Join'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {step === 'invite'
              ? 'Enter a Server ID below to join an existing server.'
              : `You are about to join ${foundServer?.name}.`}
          </p>
        </div>

        {step === 'invite' ? (
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="bg-zinc-900/50 p-2 rounded-lg flex justify-center mb-4">
              <Compass size={48} className="text-emerald-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                Server ID
              </label>
              <input
                type="text"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                className="w-full bg-zinc-900 border-none text-zinc-200 p-3 rounded focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
                placeholder="e.g. 123456789"
                autoFocus
              />
            </div>

            {displayError && <p className="text-red-400 text-sm mt-2">{displayError}</p>}

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
                disabled={isLoading || !serverId}
                className={`bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded transition-colors flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Checking...' : 'Find Server'}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleJoin}
            className="space-y-4 animate-in slide-in-from-right-4 duration-200"
          >
            <div className="flex justify-center mb-4">
              <div className="h-24 w-24 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                {foundServer?.icon_url ? (
                  <img
                    src={foundServer.icon_url}
                    alt=""
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  foundServer?.name.substring(0, 2).toUpperCase()
                )}
              </div>
            </div>

            <h3 className="text-center text-xl font-bold text-white mb-6">{foundServer?.name}</h3>

            {displayError && (
              <p className="text-red-400 text-sm mt-2 text-center">{displayError}</p>
            )}

            <div className="flex justify-between items-center mt-8 pt-2">
              <button
                type="button"
                onClick={() => setStep('invite')}
                className="text-zinc-300 hover:underline text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded transition-colors flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Joining...' : 'Join Server'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
