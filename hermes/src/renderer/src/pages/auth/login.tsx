import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import api from '../../lib/api'
import LoginForm from '../../componenets/auth/loginForm'
import RegisterForm from '../../componenets/auth/registerForm'

export default function Login(): React.JSX.Element {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [isLoginView, setIsLoginView] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleLoginSubmit = async (identity: string, password: string) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      await login(identity, password)
      navigate('/')
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterSubmit = async (
    username: string,
    email: string,
    password: string,
    displayName: string
  ) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      // 1. Register the user
      await api.post('/auth/register', {
        username,
        email,
        password,
        display_name: displayName
      })

      // Automatically log them in after successful registration
      await login(username, password)
      navigate('/')
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      <h1 className="mb-2 text-4xl font-bold text-blue-600">
        {isLoginView ? 'Welcome Back' : 'Create an Account'}
      </h1>

      <p className="mb-8 text-gray-500">
        {isLoginView
          ? 'Enter your details to access your account.'
          : 'Fill out the form below to get started.'}
      </p>

      {/* Error Message Display */}
      {errorMessage && (
        <div className="mb-4 w-full max-w-sm rounded-md bg-red-100 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Form Toggle */}
      {isLoginView ? (
        <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
      ) : (
        <RegisterForm onSubmit={handleRegisterSubmit} isLoading={isLoading} />
      )}

      {/* View Switcher & Navigation */}
      <div className="mt-6 flex flex-col gap-2">
        <button
          onClick={() => {
            setIsLoginView(!isLoginView)
            setErrorMessage('') // Clear errors when switching views
          }}
          disabled={isLoading}
          className="text-sm font-medium text-blue-600 underline hover:text-blue-800 disabled:opacity-50"
        >
          {isLoginView ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>

        <Link to="/" className="mt-4 text-sm text-gray-500 underline hover:text-gray-700">
          Back to Landing
        </Link>
      </div>
    </div>
  )
}
