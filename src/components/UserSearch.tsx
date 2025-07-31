'use client'

import { useState, useEffect, useRef } from 'react'
import { searchUsersWithAvailability, UserSearchResult } from '@/lib/supabase'
import { Search, X, UserPlus, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface UserSearchProps {
  onUserSelect: (user: UserSearchResult) => void
  selectedUsers: UserSearchResult[]
  placeholder?: string
  excludeUserIds?: string[]
  matchDate?: string // New prop for availability filtering
}

export default function UserSearch({ 
  onUserSelect, 
  selectedUsers, 
  placeholder = "Search users to invite...",
  excludeUserIds = [],
  matchDate
}: UserSearchProps) {
  const [query, setQuery] = useState('')
  const [availableUsers, setAvailableUsers] = useState<UserSearchResult[]>([])
  const [unavailableUsers, setUnavailableUsers] = useState<UserSearchResult[]>([])
  const [otherUsers, setOtherUsers] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const performSearch = async () => {
      if (query.trim().length < 2) {
        setAvailableUsers([])
        setUnavailableUsers([])
        setOtherUsers([])
        setShowResults(false)
        return
      }

      setIsSearching(true)
      try {
        const selectedIds = selectedUsers.map(u => u.id)
        const allExcludeIds = [...excludeUserIds, ...selectedIds]
        
        // Use availability-aware search
        const { available, unavailable, others } = await searchUsersWithAvailability(
          query.trim(), 
          matchDate, 
          allExcludeIds
        )
        
        console.log('UserSearch received results:', { available, unavailable, others })
        
        setAvailableUsers(available)
        setUnavailableUsers(unavailable)
        setOtherUsers(others)
        setShowResults(true)
      } catch (error) {
        console.error('Error searching users:', error)
        setAvailableUsers([])
        setUnavailableUsers([])
        setOtherUsers([])
      } finally {
        setIsSearching(false)
      }
    }

    const timeoutId = setTimeout(performSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [query, selectedUsers, excludeUserIds, matchDate])

  const handleUserSelect = (selectedUser: UserSearchResult) => {
    console.log('UserSearch: handleUserSelect called with user:', selectedUser)
    console.log('UserSearch: current selectedUsers:', selectedUsers)
    try {
      onUserSelect(selectedUser)
      setQuery('')
      setAvailableUsers([])
      setUnavailableUsers([])
      setOtherUsers([])
      setShowResults(false)
      console.log('UserSearch: user selection completed successfully')
    } catch (error) {
      console.error('UserSearch: error in handleUserSelect:', error)
    }
  }

  const totalResults = availableUsers.length + unavailableUsers.length + otherUsers.length
  const dayName = matchDate ? new Date(matchDate).toLocaleDateString('en-US', { weekday: 'long' }) : ''

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          onFocus={() => {
            if (totalResults > 0) setShowResults(true)
          }}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
          </div>
        )}
      </div>

      {showResults && totalResults > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {/* Available Users Section */}
          {availableUsers.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-green-50 border-b border-green-200">
                <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  Available {dayName && `on ${dayName}`}
                  <span className="text-green-600">({availableUsers.length})</span>
                </div>
              </div>
              {availableUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Available user button clicked for user:', user)
                    handleUserSelect(user)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-green-50 focus:bg-green-50 focus:outline-none transition-colors flex items-center gap-3 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <UserPlus className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Available for this match
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Unavailable Users Section */}
          {unavailableUsers.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                  <XCircle className="h-4 w-4" />
                  Unavailable {dayName && `on ${dayName}`}
                  <span className="text-red-600">({unavailableUsers.length})</span>
                </div>
              </div>
              {unavailableUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Unavailable user button clicked for user:', user)
                    handleUserSelect(user)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-red-50 focus:bg-red-50 focus:outline-none transition-colors flex items-center gap-3 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <UserPlus className="h-4 w-4 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Not available on {dayName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Other Users Section */}
          {otherUsers.length > 0 && (
            <div>
              {(availableUsers.length > 0 || unavailableUsers.length > 0) && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <AlertCircle className="h-4 w-4" />
                    Availability Unknown
                    <span className="text-gray-500">({otherUsers.length})</span>
                  </div>
                </div>
              )}
              {otherUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Other user button clicked for user:', user)
                    handleUserSelect(user)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors flex items-center gap-3 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <UserPlus className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {matchDate ? 'Availability unknown' : 'Can still be invited'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showResults && query.trim().length >= 2 && totalResults === 0 && !isSearching && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No users found matching &quot;{query}&quot;
        </div>
      )}
    </div>
  )
}

// Selected Users List Component (unchanged)
interface SelectedUsersListProps {
  users: UserSearchResult[]
  onRemoveUser: (userId: string) => void
}

export function SelectedUsersList({ users, onRemoveUser }: SelectedUsersListProps) {
  if (users.length === 0) return null

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Selected Users ({users.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm"
          >
            <span>{user.full_name}</span>
            <button
              type="button"
              onClick={() => onRemoveUser(user.id)}
              className="hover:bg-green-200 rounded-full p-1 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
} 