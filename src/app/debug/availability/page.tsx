'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getUserAvailability, 
  getAvailableUsersForDate,
  searchUsersWithAvailability,
  supabase,
  DAY_NAMES 
} from '@/lib/supabase'
import { Calendar, Clock, Search, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function AvailabilityDebugPage() {
  const { user } = useAuth()
  const [userAvailability, setUserAvailability] = useState<any[]>([])
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
  const [testQuery, setTestQuery] = useState('')
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any>({ available: [], unavailable: [], others: [] })
  const [rawAvailabilityData, setRawAvailabilityData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadDebugData()
    }
  }, [user])

  const loadDebugData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Get user's availability
      const availability = await getUserAvailability(user.id)
      setUserAvailability(availability)
      
      // Get raw availability data from database
      const { data: rawData, error } = await supabase
        .from('user_availability')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')
      
      if (error) {
        console.error('Error fetching raw availability:', error)
      } else {
        setRawAvailabilityData(rawData || [])
      }
      
    } catch (error) {
      console.error('Error loading debug data:', error)
    } finally {
      setLoading(false)
    }
  }

  const testAvailableUsersForDate = async () => {
    try {
      setLoading(true)
      const users = await getAvailableUsersForDate(testDate)
      setAvailableUsers(users)
      console.log('Available users for date:', testDate, users)
    } catch (error) {
      console.error('Error testing available users:', error)
    } finally {
      setLoading(false)
    }
  }

  const testSearchWithAvailability = async () => {
    if (!testQuery.trim()) return
    
    try {
      setLoading(true)
      const results = await searchUsersWithAvailability(testQuery, testDate)
      setSearchResults(results)
      console.log('Search results:', results)
    } catch (error) {
      console.error('Error testing search:', error)
    } finally {
      setLoading(false)
    }
  }

  const testDayOfWeek = new Date(testDate).getDay()

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6">
        <h1 className="text-2xl font-bold mb-4">Please sign in to access debug page</h1>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Availability Debug Page</h1>
        <p className="text-gray-600">Debug tools for troubleshooting availability system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current User's Availability */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Your Availability Data
          </h2>
          
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">Processed Availability:</h3>
            {userAvailability.map((day) => (
              <div key={day.day_of_week} className="flex items-center justify-between p-2 border rounded">
                <span className="font-medium">{day.day_name}</span>
                <div className="flex items-center gap-2">
                  {day.available ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={day.available ? 'text-green-600' : 'text-red-600'}>
                    {day.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="font-medium text-gray-700">Raw Database Data:</h3>
            {rawAvailabilityData.length > 0 ? (
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <pre>{JSON.stringify(rawAvailabilityData, null, 2)}</pre>
              </div>
            ) : (
              <p className="text-gray-500 italic">No raw availability data found in database</p>
            )}
          </div>

          <button
            onClick={loadDebugData}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>

        {/* Test Available Users for Date */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            Test Date Availability
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Date:
              </label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Day of week: {DAY_NAMES[testDayOfWeek]} ({testDayOfWeek})
              </p>
            </div>

            <button
              onClick={testAvailableUsersForDate}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Get Available Users for Date'}
            </button>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">
                Available Users ({availableUsers.length}):
              </h3>
              {availableUsers.length > 0 ? (
                <div className="space-y-2">
                  {availableUsers.map((user, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{user.full_name}</span>
                      <span className="text-sm text-gray-500">({user.user_id})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No available users found</p>
              )}
            </div>
          </div>
        </div>

        {/* Test Search with Availability */}
        <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-600" />
            Test Search with Availability
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query:
              </label>
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Enter name to search..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Match Date:
              </label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={testSearchWithAvailability}
            disabled={loading || !testQuery.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Test Search'}
          </button>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Available Results */}
            <div>
              <h3 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Available ({searchResults.available.length})
              </h3>
              <div className="space-y-2">
                {searchResults.available.map((user: any, index: number) => (
                  <div key={index} className="p-2 bg-green-50 rounded text-sm">
                    {user.full_name}
                  </div>
                ))}
                {searchResults.available.length === 0 && (
                  <p className="text-gray-500 italic text-sm">None</p>
                )}
              </div>
            </div>

            {/* Unavailable Results */}
            <div>
              <h3 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Unavailable ({searchResults.unavailable.length})
              </h3>
              <div className="space-y-2">
                {searchResults.unavailable.map((user: any, index: number) => (
                  <div key={index} className="p-2 bg-red-50 rounded text-sm">
                    {user.full_name}
                  </div>
                ))}
                {searchResults.unavailable.length === 0 && (
                  <p className="text-gray-500 italic text-sm">None</p>
                )}
              </div>
            </div>

            {/* Unknown Results */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Unknown ({searchResults.others.length})
              </h3>
              <div className="space-y-2">
                {searchResults.others.map((user: any, index: number) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    {user.full_name}
                  </div>
                ))}
                {searchResults.others.length === 0 && (
                  <p className="text-gray-500 italic text-sm">None</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-3">How to Use This Debug Page:</h3>
        <ul className="text-sm text-blue-700 space-y-2">
          <li><strong>Your Availability Data:</strong> Shows both processed and raw database availability</li>
          <li><strong>Test Date Availability:</strong> Tests which users are available for a specific date</li>
          <li><strong>Test Search:</strong> Tests the full search with availability categorization</li>
          <li><strong>Console Logs:</strong> Check browser console for detailed debug information</li>
        </ul>
      </div>
    </div>
  )
} 