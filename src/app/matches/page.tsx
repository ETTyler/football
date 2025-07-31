'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Match } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import MatchCard from '@/components/MatchCard'
import { Search, Filter, MapPin, Calendar, Users, Loader2 } from 'lucide-react'

type FilterType = 'all' | 'upcoming' | 'today' | 'this-week'
type PitchTypeFilter = 'all' | '5-a-side' | '7-a-side' | '11-a-side'

export default function MatchesPage() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([])
  const [userParticipations, setUserParticipations] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<FilterType>('upcoming')
  const [pitchTypeFilter, setPitchTypeFilter] = useState<PitchTypeFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchMatches()
  }, [])

  const applyFilters = useCallback(() => {
    let filtered = [...matches]
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Date filtering
    switch (dateFilter) {
      case 'upcoming':
        filtered = filtered.filter(match => new Date(match.date) >= today)
        break
      case 'today':
        filtered = filtered.filter(match => {
          const matchDate = new Date(match.date)
          return matchDate.toDateString() === today.toDateString()
        })
        break
      case 'this-week':
        filtered = filtered.filter(match => {
          const matchDate = new Date(match.date)
          return matchDate >= today && matchDate <= oneWeekFromNow
        })
        break
      // 'all' shows all matches
    }

    // Pitch type filtering
    if (pitchTypeFilter !== 'all') {
      filtered = filtered.filter(match => match.pitch_type === pitchTypeFilter)
    }

    // Search filtering
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(match =>
        match.title.toLowerCase().includes(searchLower) ||
        match.location.toLowerCase().includes(searchLower) ||
        match.notes?.toLowerCase().includes(searchLower) ||
        match.organizer?.full_name?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredMatches(filtered)
  }, [matches, searchTerm, dateFilter, pitchTypeFilter])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const fetchMatches = async () => {
    try {
      setLoading(true)
      
      // First, get all matches without the join
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: true })

      if (matchesError) {
        console.error('Matches query error:', matchesError)
        throw matchesError
      }

      // Get unique organizer IDs
      const organizerIds = [...new Set(matchesData.map(match => match.organizer_id))]
      
      // Get organizer info from user_profiles
      const { data: organizersData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', organizerIds)

      // Create a map of organizer info
      const organizersMap = new Map(
        organizersData?.map(org => [org.id, org]) || []
      )

      // Get accurate participant counts for all matches
      const matchIds = matchesData.map(match => match.id)
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

      // Get user's participation data if authenticated
      let userParticipatedMatches = new Set<string>()
      if (user) {
        const { data: userParticipationsData } = await supabase
          .from('match_participants')
          .select('match_id')
          .eq('user_id', user.id)
          .in('match_id', matchIds)

        if (userParticipationsData) {
          userParticipatedMatches = new Set(userParticipationsData.map(p => p.match_id))
        }
      }

      setUserParticipations(userParticipatedMatches)

      // Transform the data to match our Match interface
      const transformedMatches = matchesData.map(match => {
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

      setMatches(transformedMatches)
    } catch (err) {
      console.error('Error fetching matches:', err)
      setError(err instanceof Error ? err.message : 'Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  const getUserParticipationStatus = (match: Match) => {
    if (!user) return 'not-joined'
    
    if (match.organizer_id === user.id) {
      return 'organizer'
    }
    
    if (userParticipations.has(match.id)) {
      return 'joined'
    }
    
    return 'not-joined'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading matches...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Matches</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchMatches}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Matches</h1>
        <p className="text-gray-600">Find and join football matches in your area</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search matches, locations, or organizers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date Filter
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as FilterType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Matches</option>
                  <option value="upcoming">Upcoming Only</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                </select>
              </div>

              {/* Pitch Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="inline h-4 w-4 mr-1" />
                  Pitch Type
                </label>
                <select
                  value={pitchTypeFilter}
                  onChange={(e) => setPitchTypeFilter(e.target.value as PitchTypeFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="5-a-side">5-a-side</option>
                  <option value="7-a-side">7-a-side</option>
                  <option value="11-a-side">11-a-side</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {filteredMatches.length} of {matches.length} matches
        </p>
      </div>

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || dateFilter !== 'all' || pitchTypeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No matches have been created yet'}
          </p>
          {searchTerm || dateFilter !== 'all' || pitchTypeFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('')
                setDateFilter('upcoming')
                setPitchTypeFilter('all')
              }}
              className="text-green-600 hover:text-green-700 font-semibold"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match) => (
            <MatchCard 
              key={match.id} 
              match={match}
              userParticipationStatus={getUserParticipationStatus(match)}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  )
} 