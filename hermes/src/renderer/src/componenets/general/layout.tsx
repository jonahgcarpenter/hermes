import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import Sidebar from './sidebar'
import { useAuth } from '../../context/authContext'

export default function Layout(): React.JSX.Element {
  const { user } = useAuth()

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <div className="relative z-10 shrink-0">
        <Header />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {user && <Sidebar />}

        <main className="flex-1 overflow-y-auto bg-zinc-950">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
