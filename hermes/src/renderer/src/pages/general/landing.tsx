import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/authContext'

export default function Landing(): React.JSX.Element {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-10 text-center">
      <h1 className="mb-8 text-4xl font-bold text-blue-600">Welcome to Landing</h1>

      {user ? (
        // --- LOGGED IN VIEW ---
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-white p-8 shadow-lg">
          {/* Avatar Image */}
          {user.AvatarURL && (
            <img
              src={user.AvatarURL}
              alt={user.Name}
              className="h-24 w-24 rounded-full border-4 border-blue-100 shadow-sm"
            />
          )}

          {/* User Details */}
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-800">{user.Name}</h2>
            <p className="text-sm text-gray-500">{user.Email}</p>
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
              User ID: {user.ID}
            </span>
          </div>

          {/* Logout Action */}
          <button
            onClick={logout}
            className="mt-4 w-full rounded-lg bg-red-50 px-4 py-2 font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        // --- GUEST VIEW ---
        <div className="space-y-4">
          <p className="text-lg text-gray-600">You are currently a guest.</p>
          <Link
            to="/login"
            className="inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white shadow-md transition-transform hover:scale-105 hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      )}
    </div>
  )
}
