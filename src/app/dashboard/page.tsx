'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Match } from '@/lib/supabase'
import MatchCard from '@/components/MatchCard'
import { User, Calendar, Trophy, Plus, Loader2, Clock, Settings } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [createdMatches, setCreatedMatches] = useState<Match[]>([])
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'created' | 'joined'>('joined')

  useEffect(() => {
    if (user) {
      fetchUserMatches()
    }
  }, [user])

  const fetchUserMatches = async () => {
    if (!user) return

    try {
      console.log('Fetching matches for user:', user.id)
      setLoading(true)

      // Get matches organized by the user
      const { data: createdMatchesData, error: createdError } = await supabase
        .from('matches')
        .select('*')
        .eq('organizer_id', user.id)
        .order('date', { ascending: true })

      if (createdError) {
        console.error('Created matches query error:', createdError)
        throw createdError
      }

      // Get matches the user has joined (participant in)
      const { data: participantData, error: participantError } = await supabase
        .from('match_participants')
        .select('match_id')
        .eq('user_id', user.id)

      if (participantError) {
        console.error('Participant data error:', participantError)
        throw participantError
      }

      let joinedMatchesData: any[] = []
      
      // If user has joined matches, fetch those match details
      if (participantData && participantData.length > 0) {
        const matchIds = participantData.map(p => p.match_id)
        
        const { data: joinedData, error: joinedError } = await supabase
          .from('matches')
          .select('*')
          .in('id', matchIds)
          .order('date', { ascending: true })

        if (joinedError) {
          console.error('Joined matches error:', joinedError)
          throw joinedError
        }

        joinedMatchesData = joinedData || []
      }

      console.log('Created matches raw:', createdMatchesData)
      console.log('Joined matches raw:', joinedMatchesData)

      // Get all unique match IDs for participant count calculation
      const allMatches = [...(createdMatchesData || []), ...joinedMatchesData]
      const matchIds = allMatches.map(match => match.id)

      // Get accurate participant counts for all matches
      const { data: participantsData } = await supabase
        .from('match_participants')
        .select('match_id')
        .in('match_id', matchIds)

      // Create a map of match_id to participant count
      const participantCounts = new Map()
      participantsData?.forEach(participant => {
        const matchId = participant.match_id
        participantCounts.set(matchId, (participantCounts.get(matchId) || 0) + 1)
      })

      // Get unique organizer IDs for user profile lookup
      const organizerIds = [...new Set(allMatches.map(match => match.organizer_id))]
      
      // Get organizer info from user_profiles
      const { data: organizersData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', organizerIds)

      // Create a map of organizer info
      const organizersMap = new Map(
        organizersData?.map(org => [org.id, org]) || []
      )

      // Transform created matches
      const transformedCreated = (createdMatchesData || []).map(match => {
        const organizerProfile = organizersMap.get(match.organizer_id)
        const actualParticipantCount = participantCounts.get(match.id) || 0
        
        return {
          ...match,
          // Use actual participant count instead of relying on database trigger
          current_players: actualParticipantCount,
          organizer: {
            id: match.organizer_id,
            email: 'Unknown',
            full_name: organizerProfile?.full_name || 'Anonymous Organizer'
          }
        }
      }) as Match[]

      // Transform joined matches (exclude matches that the user organized)
      const transformedJoined = joinedMatchesData
        .filter(match => match.organizer_id !== user.id) // Don't show created matches in joined list
        .map(match => {
          const organizerProfile = organizersMap.get(match.organizer_id)
          const actualParticipantCount = participantCounts.get(match.id) || 0
          
          return {
            ...match,
            // Use actual participant count instead of relying on database trigger
            current_players: actualParticipantCount,
            organizer: {
              id: match.organizer_id,
              email: 'Unknown', 
              full_name: organizerProfile?.full_name || 'Anonymous Organizer'
            }
          }
        }) as Match[]

      console.log('Final created matches:', transformedCreated)
      console.log('Final joined matches:', transformedJoined)

      setCreatedMatches(transformedCreated)
      setJoinedMatches(transformedJoined)
    } catch (err) {
      console.error('Error fetching user matches:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Redirect if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You need to be signed in to view your dashboard.</p>
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
          <p className="text-gray-600 dark:text-gray-400">Loading your matches...</p>
        </div>
      </div>
    )
  }

  const upcomingCreated = createdMatches.filter(match => new Date(match.date) >= new Date())
  const upcomingJoined = joinedMatches.filter(match => new Date(match.date) >= new Date())
  const totalUpcoming = upcomingCreated.length + upcomingJoined.length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalUpcoming}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming Matches</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-green-600 dark:text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{createdMatches.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Matches Created</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-purple-600 dark:text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{joinedMatches.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Matches Joined</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <Link
                href="/create-match"
                className="flex items-center gap-3 text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 transition-colors"
              >
                <Plus className="h-8 w-8" />
                <div>
                  <p className="text-lg font-semibold">Create Match</p>
                  <p className="text-sm">Organize a new game</p>
                </div>
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <Link
                href="/settings/availability"
                className="flex items-center gap-3 text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
              >
                <Clock className="h-8 w-8" />
                <div>
                  <p className="text-lg font-semibold">Availability</p>
                  <p className="text-sm">Set your free days</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('joined')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'joined'
                    ? 'border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Joined Matches ({joinedMatches.length})
              </button>
              <button
                onClick={() => setActiveTab('created')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'created'
                    ? 'border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Created Matches ({createdMatches.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-96">
          {activeTab === 'joined' && (
            <div>
              {joinedMatches.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No matches joined yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Start by browsing available matches in your area</p>
                  <Link
                    href="/matches"
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Browse Matches
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {joinedMatches.map((match) => (
                    <MatchCard 
                      key={match.id} 
                      match={match} 
                      userParticipationStatus={match.organizer_id === user.id ? 'organizer' : 'joined'}
                      currentUserId={user.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'created' && (
            <div>
              {createdMatches.length === 0 ? (
                <div className="text-center py-16">
                  <Trophy className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No matches created yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first match and invite players to join</p>
                  <Link
                    href="/create-match"
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Create Your First Match
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {createdMatches.map((match) => (
                    <MatchCard 
                      key={match.id}
                      match={match} 
                      userParticipationStatus="organizer"
                      currentUserId={user.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 