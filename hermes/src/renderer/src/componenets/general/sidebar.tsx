import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  Plus,
  Settings,
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  User,
  Edit,
  Trash2
} from 'lucide-react'
import { useServers, Server } from '../../hooks/useServers'
import CreateServerModal from '../modals/servers/createServer'
import EditServerModal from '../modals/servers/editServer'

export default function Sidebar(): React.JSX.Element {
  const { servers, fetchServers, deleteServer } = useServers()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<Server | null>(null)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; server: Server } | null>(
    null
  )

  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [tooltip, setTooltip] = useState<{ text: string; top: number } | null>(null)

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>, text: string): void => {
    if (!contextMenu) {
      const rect = e.currentTarget.getBoundingClientRect()
      setTooltip({ text, top: rect.top + rect.height / 2 })
    }
  }

  const handleMouseLeave = (): void => {
    setTooltip(null)
  }

  const handleContextMenu = (e: React.MouseEvent, server: Server) => {
    e.preventDefault()
    setTooltip(null)
    setContextMenu({ x: e.pageX, y: e.pageY, server })
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (contextMenu) {
      setEditingServer(contextMenu.server)
      setIsEditModalOpen(true)
      setContextMenu(null)
    }
  }

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (contextMenu) {
      if (window.confirm(`Are you sure you want to delete ${contextMenu.server.Name}?`)) {
        await deleteServer(contextMenu.server.ID)
      }
      setContextMenu(null)
    }
  }

  return (
    <>
      <aside className="flex h-full w-[72px] flex-col items-center flex-shrink-0 bg-zinc-950 py-3 gap-2 z-20">
        {/* --- Home Button --- */}
        <div className="group relative flex items-center justify-center w-full">
          <div className="absolute left-0 h-2 w-1 scale-0 rounded-r-full bg-white transition-all duration-200 group-hover:h-5 group-hover:scale-100" />
          <Link
            to="/"
            onMouseEnter={(e) => handleMouseEnter(e, 'Home')}
            onMouseLeave={handleMouseLeave}
            className="cursor-pointer flex h-12 w-12 items-center justify-center rounded-[24px] bg-zinc-800 text-zinc-400 transition-all duration-200 hover:rounded-[16px] hover:bg-indigo-500 hover:text-white group-hover:text-white"
          >
            <Home size={24} />
          </Link>
        </div>

        <div className="mx-2 h-[2px] w-8 rounded-lg bg-zinc-800" />

        {/* --- Server List --- */}
        <div className="flex flex-1 flex-col gap-3 w-full items-center overflow-y-auto no-scrollbar scroll-smooth">
          {servers.map((server) => (
            <div key={server.ID} className="group relative flex items-center justify-center w-full">
              {/* Active/Hover Pill Indicator */}
              <div className="absolute left-0 h-2 w-1 scale-0 rounded-r-full bg-white transition-all duration-200 group-hover:h-5 group-hover:scale-100" />

              <button
                onMouseEnter={(e) => handleMouseEnter(e, server.Name)}
                onMouseLeave={handleMouseLeave}
                onContextMenu={(e) => handleContextMenu(e, server)}
                className="cursor-pointer flex h-12 w-12 items-center justify-center overflow-hidden rounded-[24px] bg-zinc-800 transition-all duration-200 hover:rounded-[16px] hover:bg-indigo-500"
              >
                {server.IconURL ? (
                  <img
                    src={server.IconURL}
                    alt={server.Name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-semibold text-zinc-300 group-hover:text-white text-sm">
                    {server.Name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </button>
            </div>
          ))}

          {/* --- New Server Button --- */}
          <div className="group relative flex items-center justify-center w-full mt-1">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              onMouseEnter={(e) => handleMouseEnter(e, 'Add a Server')}
              onMouseLeave={handleMouseLeave}
              className="cursor-pointer flex h-12 w-12 items-center justify-center rounded-[24px] bg-zinc-800 text-emerald-500 transition-all duration-200 hover:rounded-[16px] hover:bg-emerald-600 hover:text-white"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        {/* --- User Avatar & Controls --- */}
        <div className="relative mt-auto flex w-full flex-col items-center gap-1 pb-2">
          <div className="group relative flex flex-col items-center gap-2 rounded-2xl bg-zinc-900/0 p-2 transition-colors hover:bg-zinc-900">
            {/* Controls */}
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
              <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
            </div>
          </div>
        </div>
      </aside>

      {/* --- Context Menu --- */}
      {contextMenu && (
        <div
          className="fixed z-50 flex w-48 flex-col rounded-md bg-zinc-900 border border-zinc-800 shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-75"
          style={{ top: contextMenu.y, left: contextMenu.x + 10 }}
        >
          <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 mb-1">
            {contextMenu.server.Name}
          </div>
          <button
            onClick={handleEditClick}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer text-left"
          >
            <Edit size={16} /> Edit Server
          </button>
          <button
            onClick={handleDeleteClick}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer text-left"
          >
            <Trash2 size={16} /> Delete Server
          </button>
        </div>
      )}

      {/* --- Tooltip --- */}
      {tooltip && (
        <div
          className="fixed left-[80px] z-50 flex items-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-bold text-zinc-100 shadow-xl animate-in fade-in zoom-in-95 duration-75"
          style={{ top: tooltip.top, transform: 'translateY(-50%)' }}
        >
          <div className="absolute -left-1 h-2 w-2 rotate-45 bg-zinc-900" />
          {tooltip.text}
        </div>
      )}

      <CreateServerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchServers}
      />

      <EditServerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        server={editingServer}
      />
    </>
  )
}
