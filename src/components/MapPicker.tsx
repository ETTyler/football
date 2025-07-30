'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import { Search, MapPin, Loader2 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialPosition?: [number, number]
}

interface SearchResult {
  place_id: string
  display_name: string
  lat: string
  lon: string
}

function LocationMarker({ 
  onLocationSelect, 
  markerPosition 
}: { 
  onLocationSelect: (lat: number, lng: number, address: string) => void
  markerPosition: LatLngExpression | null
}) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      
      // Reverse geocoding using Nominatim (OpenStreetMap)
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
          const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          onLocationSelect(lat, lng, address)
        })
        .catch(() => {
          onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        })
    },
  })

  return markerPosition ? <Marker position={markerPosition} /> : null
}

export default function MapPicker({ onLocationSelect, initialPosition = [51.505, -0.09] }: MapPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialPosition)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    setMarkerPosition([lat, lng])
    setMapCenter([lat, lng])
    onLocationSelect(lat, lng, address)
  }

  const handleSearchResultClick = (result: SearchResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    handleLocationSelect(lat, lng, result.display_name)
    setSearchQuery(result.display_name)
    setShowResults(false)
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          handleLocationSelect(latitude, longitude, `Current location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
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

  if (!mounted) {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Address Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for an address or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleSearchResultClick(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 line-clamp-2">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleUseCurrentLocation}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          Use Current Location
        </button>
        <p className="text-sm text-gray-600 flex items-center">
          Or click on the map to select a location
        </p>
      </div>

      {/* Map */}
      <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300">
        <MapContainer
          key={`${mapCenter[0]}-${mapCenter[1]}`} // Force re-render when center changes
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            onLocationSelect={handleLocationSelect} 
            markerPosition={markerPosition}
          />
        </MapContainer>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <p className="font-medium text-blue-800 mb-1">How to select location:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>Type an address in the search box above</li>
          <li>Click "Use Current Location" to use GPS</li>
          <li>Click anywhere on the map to pin a location</li>
        </ul>
      </div>
    </div>
  )
} 