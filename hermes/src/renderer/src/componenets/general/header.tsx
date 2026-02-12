import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Minus, Square, X, Server } from 'lucide-react'

export default function Header(): React.JSX.Element {
  const navigate = useNavigate()

  const handleBack = (): void => navigate(-1)
  const handleForward = (): void => navigate(1)

  const handleMinimize = (): void => window.api.minimize()
  const handleMaximize = (): void => window.api.maximize()
  const handleClose = (): void => window.api.close()

  return (
    <header className="relative flex h-12 w-full items-center justify-between bg-zinc-950 px-4 text-zinc-100 shadow-md">
      {/* --- Left: Navigation --- */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleBack}
          className="cursor-pointer rounded-md p-1.5 hover:bg-zinc-800 hover:text-white transition-colors"
          title="Go Back"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={handleForward}
          className="cursor-pointer rounded-md p-1.5 hover:bg-zinc-800 hover:text-white transition-colors"
          title="Go Forward"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* --- Center: Server Indicator --- */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <div className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">
          <Server size={12} />
          <span>Connected</span>
        </div>
      </div>

      <div className="absolute inset-0 z-[-1]" style={{ WebkitAppRegion: 'drag' }} />

      {/* --- Right: Window Controls --- */}
      <div className="flex items-center gap-2 z-10" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleMinimize}
          className="cursor-pointer rounded-md p-1.5 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <Minus size={18} />
        </button>
        <button
          onClick={handleMaximize}
          className="cursor-pointer rounded-md p-1.5 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <Square size={16} />
        </button>
        <button
          onClick={handleClose}
          className="cursor-pointer rounded-md p-1.5 hover:bg-red-600 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </header>
  )
}
