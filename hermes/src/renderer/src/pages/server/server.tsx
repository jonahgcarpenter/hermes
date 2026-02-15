import { useLocation, useParams } from 'react-router-dom'

export default function ServerPage() {
  const { state } = useLocation()
  const { serverId } = useParams()

  const name = state?.serverName

  return (
    <div className="flex h-full flex-col items-center justify-center text-white">
      <h1 className="font-bold text-3xl text-indigo-500">Welcome to {name}</h1>
      <p className="text-zinc-400 mt-2">Server ID: {serverId}</p>
    </div>
  )
}
