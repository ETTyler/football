'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setMessage(error.message || 'Authentication failed')
          return
        }

        if (data.session) {
          setStatus('success')
          setMessage('Email confirmed successfully! Redirecting to dashboard...')
          
          // Wait a moment to show success message, then redirect
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('No session found. Please try signing in again.')
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setStatus('error')
        setMessage('An unexpected error occurred')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-green-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirming Your Email</h1>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Confirmed!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="animate-pulse">
              <div className="h-2 bg-green-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full w-full"></div>
              </div>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirmation Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="block w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Go to Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="block w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
              >
                Try signing up again
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 