import React, { useState } from 'react'
import { Home, Plus, Settings, Mic, MicOff, Headphones, HeadphoneOff, User } from 'lucide-react'

export default function Sidebar(): React.JSX.Element {
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)

  const servers = [1, 2, 3]

  return (
    <aside className="flex h-full w-[72px] flex-col items-center bg-zinc-950 py-3 gap-2 flex-shrink-0 z-20">
      {/* --- Home Button --- */}
      <div className="group relative flex items-center justify-center w-full">
        {/* Active/Hover Indicator Pill */}
        <div className="absolute left-0 h-2 w-1 scale-0 rounded-r-full bg-white transition-all duration-200 group-hover:h-5 group-hover:scale-100" />

        <button className="cursor-pointer flex h-12 w-12 items-center justify-center rounded-[24px] bg-zinc-800 text-zinc-400 transition-all duration-200 hover:rounded-[16px] hover:bg-indigo-500 hover:text-white group-hover:text-white">
          <Home size={24} />
        </button>
      </div>

      <div className="mx-2 h-[2px] w-8 rounded-lg bg-zinc-800" />

      {/* --- Server List --- */}
      <div className="flex flex-1 flex-col gap-3 w-full items-center overflow-y-auto no-scrollbar scroll-smooth">
        {servers.map((server) => (
          <div key={server} className="group relative flex items-center justify-center w-full">
            <div className="absolute left-0 h-2 w-1 scale-0 rounded-r-full bg-white transition-all duration-200 group-hover:h-5 group-hover:scale-100" />

            <button className="cursor-pointer flex h-12 w-12 items-center justify-center overflow-hidden rounded-[24px] bg-zinc-800 transition-all duration-200 hover:rounded-[16px] hover:bg-emerald-600">
              {/* Placeholder Image/Icon */}
              <span className="font-semibold text-zinc-300 group-hover:text-white">S{server}</span>
            </button>
          </div>
        ))}

        {/* --- New Server Button --- */}
        <div className="group relative flex items-center justify-center w-full mt-1">
          <button className="cursor-pointer flex h-12 w-12 items-center justify-center rounded-[24px] bg-zinc-800 text-emerald-500 transition-all duration-200 hover:rounded-[16px] hover:bg-emerald-600 hover:text-white">
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* --- User Avatar & Controls --- */}
      <div className="relative mt-auto flex w-full flex-col items-center gap-1 pb-2">
        {/* Controls Container */}
        <div className="group relative flex flex-col items-center gap-2 rounded-2xl bg-zinc-900/0 p-2 transition-colors hover:bg-zinc-900">
          {/* Controls (Hidden by default, visible on group hover) */}
          <div className="absolute bottom-14 flex flex-col gap-2 rounded-lg bg-zinc-900 p-2 opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 scale-95 group-hover:scale-100 border border-zinc-800">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`cursor-pointer rounded-md p-2 hover:bg-zinc-800 ${isMuted ? 'text-red-500' : 'text-zinc-400'}`}
              title="Toggle Mute"
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={`cursor-pointer rounded-md p-2 hover:bg-zinc-800 ${isDeafened ? 'text-red-500' : 'text-zinc-400'}`}
              title="Toggle Deafen"
            >
              {isDeafened ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
            </button>
            <button
              className="cursor-pointer rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              title="User Settings"
            >
              <Settings size={18} />
            </button>
          </div>

          {/* User Avatar */}
          <div className="relative h-10 w-10 cursor-pointer rounded-full bg-indigo-600 ring-2 ring-zinc-900 transition-transform group-hover:scale-105">
            <div className="flex h-full w-full items-center justify-center text-white">
              <User size={20} />
            </div>
            {/* Online Status Dot */}
            <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
          </div>
        </div>
      </div>
    </aside>
  )
}
