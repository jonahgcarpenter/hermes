import React, { useState, useEffect } from 'react'
import { X, Compass, Lock, ArrowRight, ShieldAlert } from 'lucide-react'
import { useServers, Server } from '../../../hooks/useServers'

interface JoinServerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function JoinServerModal({ isOpen, onClose, onSuccess }: JoinServerModalProps) {
  const { lookupInvite, joinServer, isLoading, error: hookError } = useServers()

  const [step, setStep] = useState<'invite' | 'password'>('invite')
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [foundServer, setFoundServer] = useState<Server | null>(null)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep('invite')
      setInviteCode('')
      setPassword('')
      setFoundServer(null)
      setLocalError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!inviteCode.trim()) {
      setLocalError('Please enter a valid invite code.')
      return
    }

    const server = await lookupInvite(inviteCode)
    if (server) {
      setFoundServer(server)
      if (server.IsPrivate) {
        setStep('password')
      } else {
        const success = await joinServer(inviteCode)
        if (success) {
          onSuccess()
          onClose()
        }
      }
    }
  }

  const handleJoinPrivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setLocalError('Password is required for this server.')
      return
    }

    const success = await joinServer(inviteCode, password)
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
            {step === 'invite' ? 'Join a Server' : 'Private Server'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {step === 'invite'
              ? 'Enter an invite below to join an existing server.'
              : `Enter the password to join ${foundServer?.Name}.`}
          </p>
        </div>

        {step === 'invite' ? (
          <form onSubmit={handleLookup} className="space-y-4">
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
                disabled={isLoading || !inviteCode}
                className={`bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded transition-colors flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Checking...' : 'Find Server'}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleJoinPrivate}
            className="space-y-4 animate-in slide-in-from-right-4 duration-200"
          >
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {foundServer?.IconURL ? (
                  <img
                    src={foundServer.IconURL}
                    alt=""
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  foundServer?.Name.substring(0, 2).toUpperCase()
                )}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 flex items-start gap-3 mb-4">
              <ShieldAlert className="text-yellow-500 flex-shrink-0" size={18} />
              <div className="text-xs text-yellow-200">
                This server is private. You need a password to join.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                Server Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-zinc-500" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border-none text-zinc-200 pl-10 p-3 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Password"
                  autoFocus
                />
              </div>
            </div>

            {displayError && <p className="text-red-400 text-sm mt-2">{displayError}</p>}

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
