'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Clock, Users, PoundSterling, AlertCircle, FileText, Send, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, createInvitation, UserSearchResult } from '@/lib/supabase'
import MapPicker from '@/components/MapPicker'
import UserSearch, { SelectedUsersList } from '@/components/UserSearch'

const createMatchSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  location: z.string().min(1, 'Location is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  max_players: z.number().min(2, 'Minimum 2 players').max(22, 'Maximum 22 players'),
  pricing: z.number().min(0, 'Pricing must be 0 or positive'),
  pitch_type: z.enum(['5-a-side', '6-a-side', '7-a-side', '11-a-side']),
  notes: z.string().optional(),
})

type CreateMatchForm = z.infer<typeof createMatchSchema>

export default function CreateMatchPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [inviteMessage, setInviteMessage] = useState('Hey! I thought you might be interested in joining this football match. Hope to see you there!')
  const { user } = useAuth()
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateMatchForm>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      pricing: 0,
      max_players: 11,
      pitch_type: '11-a-side',
    },
  })

  // Watch the date field to pass to UserSearch for availability
  const selectedDate = watch('date')

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setSelectedLocation({ lat, lng, name: address })
    setValue('latitude', lat)
    setValue('longitude', lng)
    setValue('location', address)
  }

  const handleUserSelect = (selectedUser: UserSearchResult) => {
    setSelectedUsers(prev => [...prev, selectedUser])
  }

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }

  const onSubmit = async (data: CreateMatchForm) => {
    if (!user) {
      setError('You must be signed in to create a match')
      return
    }

    if (!selectedLocation) {
      setError('Please select a location on the map')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Create the match
      const { data: match, error: insertError } = await supabase
        .from('matches')
        .insert([
          {
            title: data.title,
            date: data.date,
            time: data.time,
            pitch_type: data.pitch_type,
            location: data.location,
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            pricing: data.pricing,
            max_players: data.max_players,
            notes: data.notes,
            organizer_id: user.id,
            current_players: 1, // Organizer is automatically counted
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // Automatically add the organizer as a participant
      const { error: participantError } = await supabase
        .from('match_participants')
        .insert([{
          match_id: match.id,
          user_id: user.id
        }])

      if (participantError) {
        console.error('Failed to add organizer as participant:', participantError)
        // Continue anyway - match was created successfully
      }

      // Send invitations if users were selected
      if (selectedUsers.length > 0) {
        try {
          const invitePromises = selectedUsers.map(selectedUser =>
            createInvitation(match.id, selectedUser.id, inviteMessage)
          )
          await Promise.all(invitePromises)
          console.log(`Successfully sent ${selectedUsers.length} invitations`)
        } catch (inviteError) {
          console.error('Failed to send some invitations:', inviteError)
          // Don't throw here - match was created successfully
          setError(`Match created successfully, but failed to send some invitations: ${inviteError instanceof Error ? inviteError.message : 'Unknown error'}`)
        }
      }

      router.push(`/matches/${match.id}`)
    } catch (err) {
      console.error('Error creating match:', err)
      setError(err instanceof Error ? err.message : 'Failed to create match')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You need to be signed in to create matches.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New Match</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Organize a football match and invite players to join</p>
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

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <MapPicker onLocationSelect={handleLocationSelect} />
              {errors.location && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.location.message}</p>
              )}
            </div>

            {/* Match Details */}
            <div className="grid md:grid-cols-3 gap-4">
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

            {/* Invite Players Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Invite Players (Optional)</h3>
              </div>
              
              <div className="space-y-4">
                <UserSearch
                  onUserSelect={handleUserSelect}
                  selectedUsers={selectedUsers}
                  excludeUserIds={selectedUsers.map(u => u.id)}
                  placeholder="Search for players to invite..."
                  matchDate={selectedDate}
                />

                {selectedUsers.length > 0 && (
                  <SelectedUsersList
                    users={selectedUsers}
                    onRemoveUser={handleRemoveUser}
                  />
                )}

                <div>
                  <label htmlFor="inviteMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invitation Message
                  </label>
                  <textarea
                    id="inviteMessage"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Add a personal message to your invitation..."
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedUsers.length > 0 && `This message will be sent to ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {inviteMessage.length}/500
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating Match...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Create Match {selectedUsers.length > 0 && `& Invite ${selectedUsers.length} Player${selectedUsers.length > 1 ? 's' : ''}`}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 