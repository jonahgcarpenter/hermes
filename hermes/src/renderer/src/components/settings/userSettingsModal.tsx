import React, { useState, useEffect } from 'react'
import { X, User, Shield, Bell, Mic, Monitor, LogOut, Copy, Check } from 'lucide-react'
import { useAuth } from '../../context/authContext'

interface UserSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const TABS = [
  { id: 'account', label: 'My Account', icon: User },
  { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
  { id: 'voice', label: 'Voice & Video', icon: Mic },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Monitor }
]

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

export default function UserSettingsModal({
  isOpen,
  onClose
}: UserSettingsModalProps): React.JSX.Element | null {
  const { user, logout } = useAuth()

  const [activeTab, setActiveTab] = useState('account')
  const [hasCopiedId, setHasCopiedId] = useState(false)

  // Close the modal when the Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

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
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Background Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative flex h-full w-full max-w-6xl overflow-hidden bg-zinc-900 shadow-2xl animate-in zoom-in-95 sm:h-[80vh] sm:rounded-lg border border-zinc-800">
        {/* Left Sidebar (Settings Navigation) */}
        <div className="flex w-64 flex-col bg-zinc-950 px-4 py-6">
          <div className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            User Settings
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`cursor-pointer flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}

            <div className="my-4 h-[1px] w-full bg-zinc-800" />

            <button
              onClick={() => {
                logout()
                onClose()
              }}
              className="cursor-pointer flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-900 p-10 relative">
          {/* Close Button (Top Right) */}
          <div className="absolute right-8 top-8 flex flex-col items-center gap-1">
            <button
              onClick={onClose}
              className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
            >
              <X size={20} />
            </button>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">ESC</span>
          </div>

          <div className="flex w-full max-w-3xl flex-col mt-2">
            <h2 className="text-2xl font-bold text-zinc-100 mb-8">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>

            {/* --- Tab Content Rendering --- */}

            {activeTab === 'account' && (
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
            )}

            {/* Fallback for other tabs */}
            {activeTab !== 'account' && (
              <div className="text-zinc-400 animate-in fade-in duration-300">
                Settings for {TABS.find((t) => t.id === activeTab)?.label} will go here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
