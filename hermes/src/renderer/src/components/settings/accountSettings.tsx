import React, { useState } from 'react'
import { User, Copy, Check } from 'lucide-react'
import { useAuth } from '../../context/authContext'

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'offline':
      return 'bg-red-500'
    case 'away':
      return 'bg-yellow-500'
    default:
      return 'bg-emerald-500'
  }
}

export default function AccountSettings(): React.JSX.Element {
  const { user } = useAuth()
  const [hasCopiedId, setHasCopiedId] = useState(false)

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id.toString())
      setHasCopiedId(true)

      // Reset the icon back to normal after 2 seconds
      setTimeout(() => {
        setHasCopiedId(false)
      }, 2000)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Profile Card */}
      <div className="flex flex-col rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
        <div className="h-24 bg-indigo-600 w-full" /> {/* Banner color */}
        <div className="px-6 pb-6 relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-4 -mt-10">
            <div className="relative h-24 w-24 rounded-full bg-zinc-800 ring-8 ring-zinc-950 flex items-center justify-center">
              {/* TODO: user?.avatar_url */}
              <User size={40} className="text-zinc-500" />

              {/* Status Indicator */}
              <div
                className={`absolute bottom-1 right-1 h-6 w-6 rounded-full ring-4 ring-zinc-950 ${getStatusColor(user?.status)}`}
                title={user?.status}
              />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xl font-bold text-zinc-100">{user?.display_name}</h3>

              {/* COPY USERID BUTTON */}
              <button
                onClick={handleCopyId}
                className="group relative flex cursor-pointer items-center justify-center rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                title="Click to copy User ID"
              >
                {hasCopiedId ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          </div>
          <button className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
            Edit User Profile
          </button>
        </div>
      </div>

      {/* Account Details */}
      <div className="space-y-4 rounded-xl bg-zinc-950 p-6 border border-zinc-800">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-bold uppercase text-zinc-500">Display Name</div>
            <div className="text-zinc-200 text-sm">{user?.display_name}</div>
          </div>
          <button className="cursor-pointer rounded bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
            Edit
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-bold uppercase text-zinc-500">Username</div>
            <div className="text-zinc-200 text-sm">{user?.username}</div>
          </div>
          <button className="cursor-pointer rounded bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
            Edit
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-bold uppercase text-zinc-500">Email</div>
            <div className="text-zinc-200 text-sm">{user?.email}</div>
          </div>
          <button className="cursor-pointer rounded bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
