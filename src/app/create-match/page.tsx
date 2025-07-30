'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import MapPicker from '@/components/MapPicker'
import { Calendar, Clock, MapPin, Users, DollarSign, FileText, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

const createMatchSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  pitch_type: z.enum(['5-a-side', '7-a-side', '11-a-side']),
  location: z.string().min(1, 'Please select a location on the map'),
  pricing: z.number().min(0, 'Price must be 0 or greater'),
  max_players: z.number().min(2, 'Must allow at least 2 players').max(22, 'Maximum 22 players allowed'),
  notes: z.string().optional(),
})

type CreateMatchForm = z.infer<typeof createMatchSchema>

export default function CreateMatchPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [locationData, setLocationData] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateMatchForm>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      pitch_type: '11-a-side',
      pricing: 0,
      max_players: 22,
    },
  })

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to create a match.</p>
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

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocationData({ lat, lng, address })
    setValue('location', address)
  }

  const onSubmit = async (data: CreateMatchForm) => {
    if (!locationData) {
      setError('Please select a location on the map')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data: match, error: insertError } = await supabase
        .from('matches')
        .insert([
          {
            title: data.title,
            date: data.date,
            time: data.time,
            pitch_type: data.pitch_type,
            location: data.location,
            latitude: locationData.lat,
            longitude: locationData.lng,
            pricing: data.pricing,
            max_players: data.max_players,
            current_players: 1, // Creator is automatically joined
            notes: data.notes,
            organizer_id: user.id,
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // Add the creator as the first participant
      const { error: participantError } = await supabase
        .from('match_participants')
        .insert([
          {
            match_id: match.id,
            user_id: user.id,
          },
        ])

      if (participantError) throw participantError

      router.push(`/matches/${match.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create New Match</h1>
          <p className="text-gray-600 mt-2">Set up a football match and invite players to join</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Match Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Match Title
            </label>
            <input
              {...register('title')}
              type="text"
              id="title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Sunday Morning Football"
            />
            {errors.title && (
              <p className="mt-2 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('date')}
                  type="date"
                  id="date"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              {errors.date && (
                <p className="mt-2 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('time')}
                  type="time"
                  id="time"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              {errors.time && (
                <p className="mt-2 text-sm text-red-600">{errors.time.message}</p>
              )}
            </div>
          </div>

          {/* Pitch Type */}
          <div>
            <label htmlFor="pitch_type" className="block text-sm font-medium text-gray-700 mb-2">
              Pitch Type
            </label>
            <select
              {...register('pitch_type')}
              id="pitch_type"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="5-a-side">5-a-side</option>
              <option value="7-a-side">7-a-side</option>
              <option value="11-a-side">11-a-side</option>
            </select>
            {errors.pitch_type && (
              <p className="mt-2 text-sm text-red-600">{errors.pitch_type.message}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="space-y-3">
              <MapPicker onLocationSelect={handleLocationSelect} />
              {locationData && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <MapPin className="h-4 w-4" />
                  <span>{locationData.address}</span>
                </div>
              )}
            </div>
            {errors.location && (
              <p className="mt-2 text-sm text-red-600">{errors.location.message}</p>
            )}
          </div>

          {/* Pricing and Max Players */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pricing" className="block text-sm font-medium text-gray-700 mb-2">
                Price per Player (£)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('pricing', { valueAsNumber: true })}
                  type="number"
                  id="pricing"
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              {errors.pricing && (
                <p className="mt-2 text-sm text-red-600">{errors.pricing.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="max_players" className="block text-sm font-medium text-gray-700 mb-2">
                Max Players
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('max_players', { valueAsNumber: true })}
                  type="number"
                  id="max_players"
                  min="2"
                  max="22"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              {errors.max_players && (
                <p className="mt-2 text-sm text-red-600">{errors.max_players.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                {...register('notes')}
                id="notes"
                rows={4}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                placeholder="Any additional information about the match..."
              />
            </div>
            {errors.notes && (
              <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Match...
              </>
            ) : (
              'Create Match'
            )}
          </button>
        </form>
      </div>
    </div>
  )
} 