'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Match } from '@/lib/supabase'
import MapPicker from '@/components/MapPicker'
import { Calendar, Clock, MapPin, Users, PoundSterling, FileText, AlertCircle, Loader2, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

const editMatchSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  pitch_type: z.enum(['5-a-side', '6-a-side', '7-a-side', '11-a-side']),
  location: z.string().min(1, 'Please select a location on the map'),
  pricing: z.number().min(0, 'Price must be 0 or greater'),
  max_players: z.number().min(2, 'Must allow at least 2 players').max(22, 'Maximum 22 players allowed'),
  notes: z.string().optional(),
})

type EditMatchForm = z.infer<typeof editMatchSchema>

export default function EditMatchPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [match, setMatch] = useState<Match | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [locationData, setLocationData] = useState<{ lat: number; lng: number; address: string } | null>(null)

  const matchId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset
  } = useForm<EditMatchForm>({
    resolver: zodResolver(editMatchSchema),
  })

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails()
    }
  }, [matchId, user])

  const fetchMatchDetails = async () => {
    try {
      setPageLoading(true)
      
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (matchError) throw matchError
      
      // Check if user is the organizer
      if (!user || matchData.organizer_id !== user.id) {
        setError('You are not authorized to edit this match')
        return
      }

      setMatch(matchData as Match)
      setLocationData({ 
        lat: matchData.latitude, 
        lng: matchData.longitude, 
        address: matchData.location 
      })

      // Pre-populate form with existing data
      reset({
        title: matchData.title,
        date: matchData.date,
        time: matchData.time,
        pitch_type: matchData.pitch_type,
        location: matchData.location,
        pricing: matchData.pricing,
        max_players: matchData.max_players,
        notes: matchData.notes || ''
      })

    } catch (err) {
      console.error('Error fetching match details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load match details')
    } finally {
      setPageLoading(false)
    }
  }

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocationData({ lat, lng, address })
    setValue('location', address)
  }

  const onSubmit = async (data: EditMatchForm) => {
    if (!locationData) {
      setError('Please select a location on the map')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('Submitting update for match:', matchId)
      console.log('Update data:', {
        ...data,
        latitude: locationData.lat,
        longitude: locationData.lng,
      })

      const { error: updateError } = await supabase
        .from('matches')
        .update({
          title: data.title,
          date: data.date,
          time: data.time,
          pitch_type: data.pitch_type,
          location: data.location,
          latitude: locationData.lat,
          longitude: locationData.lng,
          pricing: data.pricing,
          max_players: data.max_players,
          notes: data.notes,
        })
        .eq('id', matchId)

      if (updateError) {
        console.error('Supabase update error:', updateError)
        throw updateError
      }

      console.log('Match updated successfully')
      // Redirect back to match details
      router.push(`/matches/${matchId}`)
    } catch (err) {
      console.error('Error updating match:', err)
      if (err instanceof Error) {
        setError(`Update failed: ${err.message}`)
      } else {
        setError('An unknown error occurred while updating the match')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You need to be signed in to edit matches.</p>
          <Link
            href="/auth/signin"
            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading match details...</p>
        </div>
      </div>
    )
  }

  if (error && !match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Cannot Edit Match</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Link
            href={`/matches/${matchId}`}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Match
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/matches/${matchId}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Match Details
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Match</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Update your match details - participants will be notified of changes</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Match Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Match Title
              </label>
              <input
                {...register('title')}
                type="text"
                id="title"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="e.g., Sunday Morning Football"
              />
              {errors.title && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    {...register('date')}
                    type="date"
                    id="date"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                {errors.date && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    {...register('time')}
                    type="time"
                    id="time"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                {errors.time && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.time.message}</p>
                )}
              </div>
            </div>

            {/* Pitch Type */}
            <div>
              <label htmlFor="pitch_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pitch Type
              </label>
              <select
                {...register('pitch_type')}
                id="pitch_type"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="5-a-side">5-a-side</option>
                <option value="6-a-side">6-a-side</option>
                <option value="7-a-side">7-a-side</option>
                <option value="11-a-side">11-a-side</option>
              </select>
              {errors.pitch_type && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.pitch_type.message}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <MapPicker 
                onLocationSelect={handleLocationSelect} 
                initialLocation={locationData || undefined}
              />
              {errors.location && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.location.message}</p>
              )}
            </div>

            {/* Pricing and Max Players */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pricing" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price per Player (£)
                </label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    {...register('pricing', { valueAsNumber: true })}
                    type="number"
                    id="pricing"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0.00"
                  />
                </div>
                {errors.pricing && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.pricing.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="max_players" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Players
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    {...register('max_players', { valueAsNumber: true })}
                    type="number"
                    id="max_players"
                    min="2"
                    max="22"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                {errors.max_players && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.max_players.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <textarea
                  {...register('notes')}
                  id="notes"
                  rows={4}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  placeholder="Any additional information about the match..."
                />
              </div>
              {errors.notes && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.notes.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Updating Match...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Update Match
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 