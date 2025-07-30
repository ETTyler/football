'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Match } from '@/lib/supabase'
import MatchCard from '@/components/MatchCard'
import { User, Calendar, Trophy, Plus, Loader2 } from 'lucide-react'
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
      setLoading(true)
      
      // Fetch matches created by user
      const { data: created, error: createdError } = await supabase
        .from('matches')
        .select(`
          *,
          organizer:organizer_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('organizer_id', user.id)
        .order('date', { ascending: true })

      if (createdError) throw createdError

      // Fetch matches joined by user
      const { data: joinedData, error: joinedError } = await supabase
        .from('match_participants')
        .select(`
          match_id,
          matches (
            *,
            organizer:organizer_id (
              id,
              email,
              raw_user_meta_data
            )
          )
        `)
        .eq('user_id', user.id)

      if (joinedError) throw joinedError

      // Transform created matches
      const transformedCreated = created.map(match => ({
        ...match,
        organizer: {
          id: match.organizer.id,
          email: match.organizer.email,
          full_name: match.organizer.raw_user_meta_data?.full_name
        }
      })) as Match[]

      // Transform joined matches
      const transformedJoined = joinedData
        .filter(item => item.matches) // Filter out null matches
        .map(item => ({
          ...item.matches,
          organizer: {
            id: item.matches.organizer.id,
            email: item.matches.organizer.email,
            full_name: item.matches.organizer.raw_user_meta_data?.full_name
          }
        })) as Match[]

      setCreatedMatches(transformedCreated)
      setJoinedMatches(transformedJoined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Redirect if not authenticated
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to view your dashboard.</p>
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
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading your matches...</span>
        </div>
      </div>
    )
  }

  const upcomingCreated = createdMatches.filter(match => new Date(match.date) >= new Date())
  const upcomingJoined = joinedMatches.filter(match => new Date(match.date) >= new Date())
  const totalUpcoming = upcomingCreated.length + upcomingJoined.length

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
            </h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalUpcoming}</p>
                <p className="text-sm text-gray-600">Upcoming Matches</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{createdMatches.length}</p>
                <p className="text-sm text-gray-600">Matches Created</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{joinedMatches.length}</p>
                <p className="text-sm text-gray-600">Matches Joined</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <Link
              href="/create-match"
              className="flex items-center gap-3 text-green-600 hover:text-green-700 transition-colors"
            >
              <Plus className="h-8 w-8" />
              <div>
                <p className="text-lg font-semibold">Create Match</p>
                <p className="text-sm">Organize a new game</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('joined')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'joined'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Joined Matches ({joinedMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'created'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches joined yet</h3>
                <p className="text-gray-600 mb-6">Start by browsing available matches in your area</p>
                <Link
                  href="/matches"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Browse Matches
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'created' && (
          <div>
            {createdMatches.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches created yet</h3>
                <p className="text-gray-600 mb-6">Create your first match and invite players to join</p>
                <Link
                  href="/create-match"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Create Your First Match
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {createdMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 