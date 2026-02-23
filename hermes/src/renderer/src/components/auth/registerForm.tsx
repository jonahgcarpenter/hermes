import React, { useState } from 'react'

interface RegisterFormProps {
  onSubmit: (username: string, email: string, password: string, displayName: string) => void
  isLoading: boolean
}

export default function RegisterForm({
  onSubmit,
  isLoading
}: RegisterFormProps): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verifyPassword, setVerifyPassword] = useState('') // 1. New state for the second password
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('') // 2. New state for displaying mismatch errors

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 3. Validation check
    if (password !== verifyPassword) {
      setError('Passwords do not match.')
      return // Prevent the form from submitting
    }

    // Clear error if passwords match and proceed
    setError('')
    onSubmit(username, email, password, displayName)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isLoading}
        className="rounded-md border border-gray-300 p-3 text-white-900 focus:border-blue-500 focus:outline-none"
      />
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        disabled={isLoading}
        className="rounded-md border border-gray-300 p-3 text-white-900 focus:border-blue-500 focus:outline-none"
      />
      <input
        type="text"
        placeholder="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        disabled={isLoading}
        className="rounded-md border border-gray-300 p-3 text-white-900 focus:border-blue-500 focus:outline-none"
      />
      <input
        type="password"
        placeholder="Password (min 8 chars)"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          setError('') // Optional: clear error when user types
        }}
        required
        minLength={8}
        disabled={isLoading}
        className="rounded-md border border-gray-300 p-3 text-white-900 focus:border-blue-500 focus:outline-none"
      />

      {/* 4. New Verify Password Input */}
      <input
        type="password"
        placeholder="Verify Password"
        value={verifyPassword}
        onChange={(e) => {
          setVerifyPassword(e.target.value)
          setError('') // Optional: clear error when user types
        }}
        required
        minLength={8}
        disabled={isLoading}
        // Change border color to red if there's an error
        className={`rounded-md border p-3 text-white-900 focus:outline-none ${
          error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
        }`}
      />

      {/* 5. Error Message Display */}
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        {isLoading ? 'Creating Account...' : 'Sign Up'}
      </button>
    </form>
  )
}
