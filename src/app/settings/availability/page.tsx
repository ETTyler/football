'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getUserAvailability, 
  setUserAvailability, 
  DayAvailability,
  DAY_NAMES 
} from '@/lib/supabase'
import { Calendar, Clock, Save, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AvailabilitySettingsPage() {
  const { user } = useAuth()
  const [availability, setAvailability] = useState<DayAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    if (user) {
      loadAvailability()
    }
  }, [user])

  const loadAvailability = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const userAvailability = await getUserAvailability(user.id)
      setAvailability(userAvailability)
    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDay = async (dayOfWeek: number, available: boolean) => {
    if (!user) return

    try {
      // Optimistically update the UI
      setAvailability(prev => 
        prev.map(day => 
          day.day_of_week === dayOfWeek 
            ? { ...day, available }
            : day
        )
      )

      // Save to database
      await setUserAvailability(user.id, dayOfWeek, available)
      
      // Show success message briefly
      setSavedMessage('Availability updated!')
      setTimeout(() => setSavedMessage(''), 2000)
    } catch (error) {
      console.error('Error saving availability:', error)
      // Revert the optimistic update
      setAvailability(prev => 
        prev.map(day => 
          day.day_of_week === dayOfWeek 
            ? { ...day, available: !available }
            : day
        )
      )
    }
  }

  const handleSaveAll = async () => {
    if (!user) return

    try {
      setSaving(true)
      
      // Save all availability settings
      const savePromises = availability.map(day =>
        setUserAvailability(user.id, day.day_of_week, day.available)
      )
      
      await Promise.all(savePromises)
      setSavedMessage('All availability settings saved!')
      setTimeout(() => setSavedMessage(''), 3000)
    } catch (error) {
      console.error('Error saving all availability:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You need to be signed in to manage your availability.</p>
          <Link href="/auth/signin" className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading availability settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Availability Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Set your preferred days for playing football. This helps organizers find players who are available.
          </p>
        </div>

        {/* Success Message */}
        {savedMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-700 dark:text-green-300">{savedMessage}</span>
          </div>
        )}

        {/* Availability Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availability.map((day) => (
              <div
                key={day.day_of_week}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  day.available
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
                onClick={() => handleToggleDay(day.day_of_week, !day.available)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      day.available 
                        ? 'bg-green-100 dark:bg-green-800' 
                        : 'bg-gray-100 dark:bg-gray-600'
                    }`}>
                      {day.available ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {DAY_NAMES[day.day_of_week]}
                      </h3>
                      <p className={`text-sm ${
                        day.available 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {day.available ? 'Available' : 'Not Available'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save All Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">How it works</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                When organizers create matches, they can see which players are available on specific days. 
                This helps ensure matches have enough players and reduces last-minute cancellations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 