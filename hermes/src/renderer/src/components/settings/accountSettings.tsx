import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useUser } from '../../context/userContext'

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
  const { profile } = useUser()
  const [hasCopiedId, setHasCopiedId] = useState(false)

  const handleCopyId = () => {
    if (profile?.id) {
      navigator.clipboard.writeText(profile.id.toString())
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
              <img src={profile?.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />

              {/* Status Indicator */}
              <div
                className={`absolute bottom-1 right-1 h-6 w-6 rounded-full ring-4 ring-zinc-950 ${getStatusColor(profile?.status)}`}
                title={profile?.status}
              />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xl font-bold text-zinc-100">{profile?.displayName}</h3>

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
            <div className="text-zinc-200 text-sm">{profile?.displayName}</div>
          </div>
          <button className="cursor-pointer rounded bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
            Edit
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-bold uppercase text-zinc-500">Username</div>
            <div className="text-zinc-200 text-sm">{profile?.username}</div>
          </div>
          <button className="cursor-pointer rounded bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
            Edit
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-bold uppercase text-zinc-500">Email</div>
            <div className="text-zinc-200 text-sm">{profile?.email}</div>
          </div>
          <button className="cursor-pointer rounded bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
