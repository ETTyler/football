'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Search, MapPin, Loader2, Navigation } from 'lucide-react'

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialPosition?: [number, number]
  initialLocation?: {
    lat: number
    lng: number
    address: string
  }
}

interface SearchResult {
  place_id: string
  display_name: string
  lat: string
  lon: string
}

// Dynamically import the map component to avoid SSR issues
const DynamicMap = dynamic(() => import('./DynamicMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-2" />
        <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  )
})

export default function MapPicker({ 
  onLocationSelect, 
  initialPosition = [51.505, -0.09],
  initialLocation 
}: MapPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null)

  useEffect(() => {
    // Set initial location if provided (for editing)
    if (initialLocation) {
      setSelectedLocation(initialLocation)
      setSearchQuery(initialLocation.address)
    }
  }, [initialLocation])

  // Debounced search function
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
        )
        const data = await response.json()
        setSearchResults(data)
        setShowResults(true)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    const locationData = { lat, lng, address }
    setSelectedLocation(locationData)
    setSearchQuery(address)
    setShowResults(false)
    onLocationSelect(lat, lng, address)
  }

  const handleSearchResultClick = (result: SearchResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    handleLocationSelect(lat, lng, result.display_name)
  }

  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined') return
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          
          // Reverse geocoding to get address
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(response => response.json())
            .then(data => {
              const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              handleLocationSelect(latitude, longitude, address)
            })
            .catch(() => {
              handleLocationSelect(latitude, longitude, `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
            })
        },
        (error) => {
          console.error('Geolocation error:', error)
          alert('Unable to get your current location. Please select a location on the map or search for an address.')
        }
      )
    } else {
      alert('Geolocation is not supported by this browser.')
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  return (
    <div className="space-y-4">
      {/* Address Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search for an address or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleSearchResultClick(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleUseCurrentLocation}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Navigation className="h-4 w-4" />
          Use Current Location
        </button>
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Selected Location:</p>
              <p className="text-sm text-green-700 dark:text-green-400">{selectedLocation.address}</p>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
        <DynamicMap
          center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : initialPosition}
          markerPosition={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : null}
          onLocationSelect={handleLocationSelect}
        />
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
        <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">How to select location:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
          <li>Type an address in the search box above</li>
          <li>Click &ldquo;Use Current Location&rdquo; to use GPS</li>
          <li>Click anywhere on the map to pin a location</li>
        </ul>
      </div>
    </div>
  )
} 