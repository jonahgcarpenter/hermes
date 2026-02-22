import React, { useState } from 'react'
import { X, Upload } from 'lucide-react'
import { useServers } from '../../../hooks/useServers'

interface CreateServerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateServerModal({ isOpen, onClose, onSuccess }: CreateServerModalProps) {
  const { createServer, isLoading, error: hookError } = useServers()

  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const success = await createServer({ name })

    if (success) {
      setName('')
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
