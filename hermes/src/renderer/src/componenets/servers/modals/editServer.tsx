import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useServers, Server } from '../../../hooks/useServers'

interface EditServerModalProps {
  isOpen: boolean
  onClose: () => void
  server: Server | null
}

export default function EditServerModal({ isOpen, onClose, server }: EditServerModalProps) {
  const { updateServer } = useServers()
  const [name, setName] = useState('')

  useEffect(() => {
    if (server) setName(server.Name)
  }, [server])

  if (!isOpen || !server) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateServer(server.ID, name)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-800 w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
        >
          <X size={20} />
        </button>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Edit Server</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
              Server Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border-none text-zinc-200 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded flex items-center gap-2"
            >
              <Save size={18} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
