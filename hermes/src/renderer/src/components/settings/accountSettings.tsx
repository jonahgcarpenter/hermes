import React, { useState } from 'react'
import { Copy, Check, X, Save, Camera } from 'lucide-react'
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
  const { profile, updateProfile } = useUser()
  const [hasCopiedId, setHasCopiedId] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Local state to hold form edits before saving
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: ''
  })

  const handleCopyId = () => {
    if (profile?.id) {
      navigator.clipboard.writeText(profile.id.toString())
      setHasCopiedId(true)
      setTimeout(() => {
        setHasCopiedId(false)
      }, 2000)
    }
  }

  const startEditing = () => {
    // Populate form with current context data
    setFormData({
      displayName: profile?.displayName || '',
      username: profile?.username || '',
      email: profile?.email || ''
    })
    setErrorMsg(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setErrorMsg(null)
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      await updateProfile({
        displayName: formData.displayName,
        username: formData.username,
        email: formData.email
      })
      setIsEditing(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {!isEditing ? (
        <>
          {/* Static Profile Card */}
          <div className="flex flex-col rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="h-24 bg-indigo-600 w-full" />
            <div className="px-6 pb-6 relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex items-end gap-4 -mt-10">
                <div className="relative h-24 w-24 rounded-full bg-zinc-800 ring-8 ring-zinc-950 flex items-center justify-center">
                  <img
                    src={profile?.avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />

                  {/* Status Indicator */}
                  <div
                    className={`absolute bottom-1 right-1 h-4 w-4 rounded-full ring-2 ring-zinc-950 ${getStatusColor(profile?.status)}`}
                    title={profile?.status}
                  />
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-xl font-bold text-zinc-100">{profile?.displayName}</h3>
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
              <button
                onClick={startEditing}
                className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Edit User Profile
              </button>
            </div>
          </div>

          {/* Static Account Details */}
          <div className="space-y-4 rounded-xl bg-zinc-950 p-6 border border-zinc-800">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-bold uppercase text-zinc-500">Display Name</div>
                <div className="text-zinc-200 text-sm">{profile?.displayName}</div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-bold uppercase text-zinc-500">Username</div>
                <div className="text-zinc-200 text-sm">{profile?.username}</div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-bold uppercase text-zinc-500">Email</div>
                <div className="text-zinc-200 text-sm">{profile?.email}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Editable Form View */}
          <div className="rounded-xl bg-zinc-950 p-6 border border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-100 mb-6 border-b border-zinc-800 pb-4">
              Edit Account Details
            </h3>

            {errorMsg && (
              <div className="mb-4 rounded bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* TODO: Avatar Updates */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">
                  Avatar
                </label>
                <button
                  type="button" // Prevents the form from submitting if you hit enter
                  onClick={() => console.log('avatar editing coming soon')}
                  className="group relative h-24 w-24 rounded-full bg-zinc-800 ring-4 ring-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer focus:outline-none focus:ring-indigo-500 transition-all"
                >
                  <img
                    src={profile?.avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-30"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <Camera size={24} className="text-zinc-200 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-wider">
                      Change
                    </span>
                  </div>
                </button>
              </div>

              {/* Display Name Input */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-100 border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-100 border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-100 border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={cancelEditing}
                disabled={isSubmitting}
                className="cursor-pointer flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="cursor-pointer flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
