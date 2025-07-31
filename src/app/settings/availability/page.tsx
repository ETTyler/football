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
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to manage your availability.</p>
          <Link
            href="/auth/signin"
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            <span className="text-gray-600">Loading your availability...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-8 w-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Your Availability</h1>
        </div>
        <p className="text-gray-600">
          Set which days you&apos;re typically available for football matches. This helps organizers find the right players.
        </p>
      </div>

      {/* Success Message */}
      {savedMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-green-700">{savedMessage}</span>
        </div>
      )}

      {/* Availability Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {availability.map((day) => (
            <div 
              key={day.day_of_week}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <h3 className="font-medium text-gray-900">{day.day_name}</h3>
                  <p className="text-sm text-gray-500">
                    {day.available ? 'Available for matches' : 'Not available'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {day.available ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                
                <button
                  type="button"
                  onClick={() => handleToggleDay(day.day_of_week, !day.available)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    day.available 
                      ? 'bg-green-600' 
                      : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      day.available ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Save All Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Changes are saved automatically, but you can also save all at once.
              </p>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save All
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How This Helps</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• When organizers invite players, they&apos;ll see who&apos;s available on match day</li>
          <li>• You&apos;ll get priority in search results for matches on your available days</li>
          <li>• Helps create better matched teams with committed players</li>
          <li>• You can always join matches on &quot;unavailable&quot; days if your plans change</li>
        </ul>
      </div>
    </div>
  )
} 