import React, { useState } from 'react'
import { X, Upload, Lock } from 'lucide-react'
import { useServers } from '../../../hooks/useServers'

interface CreateServerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateServerModal({ isOpen, onClose, onSuccess }: CreateServerModalProps) {
  const { createServer, isLoading, error: hookError } = useServers()

  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const success = await createServer({
      name,
      is_private: isPrivate,
      password: isPrivate ? password : undefined
    })

    if (success) {
      setName('')
      setPassword('')
      setIsPrivate(false)
      onSuccess()
      onClose()
    }
  }

  const displayError = formError || hookError

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-800 w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">Customize Your Server</h2>
        <p className="text-zinc-400 text-center mb-6">
          Give your new server a personality with a name and an icon.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 border-2 border-dashed border-zinc-600 rounded-full flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-400 cursor-pointer transition-colors">
              <Upload size={24} />
              <span className="text-[10px] mt-1">UPLOAD</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
              Server Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border-none text-zinc-200 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="My Awesome Server"
              required
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-indigo-500 focus:ring-indigo-500"
            />
            <label
              htmlFor="private"
              className="text-zinc-300 text-sm select-none cursor-pointer flex items-center gap-2"
            >
              <Lock size={14} /> Private Server
            </label>
          </div>

          {isPrivate && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 mt-3">
                Server Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border-none text-zinc-200 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Secret Password"
                required={isPrivate}
              />
            </div>
          )}

          {displayError && <p className="text-red-400 text-sm text-center mt-2">{displayError}</p>}

          <div className="flex justify-between items-center mt-8 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-300 hover:underline text-sm"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
