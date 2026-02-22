import React, { useState } from 'react'

interface LoginFormProps {
  onSubmit: (identity: string, password: string) => void
  isLoading: boolean
}

export default function LoginForm({ onSubmit, isLoading }: LoginFormProps): React.JSX.Element {
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(identity, password)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <input
        type="text"
        placeholder="Username or Email"
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
        required
        disabled={isLoading}
        className="rounded-md border border-gray-300 p-3 text-white-900 focus:border-blue-500 focus:outline-none"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
        className="rounded-md border border-gray-300 p-3 text-white-900 focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Logging in...' : 'Sign In'}
      </button>
    </form>
  )
}
