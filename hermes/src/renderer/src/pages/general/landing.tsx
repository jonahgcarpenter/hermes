import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/authContext'

export default function Landing(): React.JSX.Element {
  const { user } = useAuth()
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      {user ? (
        <h1 className="mb-8 text-4xl font-bold text-blue-600">Welcome to Hermes!</h1>
      ) : (
        <>
          <h1 className="mb-8 text-4xl font-bold text-blue-600">You are not logged in</h1>
          <Link
            to="/login"
            className="inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white shadow-md transition-transform hover:scale-105 hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </>
      )}
    </div>
  )
}
