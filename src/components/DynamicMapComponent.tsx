'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface DynamicMapComponentProps {
  center: [number, number]
  markerPosition: [number, number] | null
  onLocationSelect: (lat: number, lng: number, address: string) => void
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

export default function DynamicMapComponent({ 
  center, 
  markerPosition, 
  onLocationSelect 
}: DynamicMapComponentProps) {
  useEffect(() => {
    // Fix for default markers in react-leaflet - only run on client side
    const fixLeafletIcons = async () => {
      if (typeof window !== 'undefined') {
        const L = await import('leaflet')
        delete ((L.default as any).Icon.Default.prototype as any)._getIconUrl
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        })
      }
    }
    
    fixLeafletIcons()
  }, [])

  return (
    <MapContainer
      key={`${center[0]}-${center[1]}`} // Force re-render when center changes
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker 
        onLocationSelect={onLocationSelect} 
        markerPosition={markerPosition}
      />
    </MapContainer>
  )
} 