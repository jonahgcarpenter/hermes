import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/authContext'

export default function Login(): React.JSX.Element {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()

  const handleGoogleLogin = async () => {
    try {
      await login('google')
      navigate('/')
    } catch (error) {
      alert('Login failed. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-10 text-center">
      <h1 className="mb-8 text-4xl font-bold text-red-500">Login Page</h1>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Sign in with Google'}
        </button>

        <Link to="/" className="mt-4 text-gray-500 underline hover:text-gray-700">
          Back to Landing
        </Link>
      </div>
    </div>
  )
}
