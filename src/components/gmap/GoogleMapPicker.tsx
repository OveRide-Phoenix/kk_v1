"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"

interface GoogleMapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void
  lat?: number
  lng?: number
}

const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({ onLocationSelect, lat = 12.9716, lng = 77.5946 }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return

    const defaultLocation = { lat, lng }
    const newMap = new window.google.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 12,
    })
    setMap(newMap)

    const newMarker = new window.google.maps.Marker({
      position: defaultLocation,
      map: newMap,
      draggable: true,
    })
    setMarker(newMarker)

    // Set up marker drag event
    newMarker.addListener("dragend", () => {
      const position = newMarker.getPosition()
      if (position) {
        onLocationSelect(position.lat(), position.lng())
      }
    })

    // Initialize autocomplete only once
    if (searchRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(searchRef.current, {
        componentRestrictions: { country: "IN" },
        fields: ["geometry", "formatted_address"],
      })

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace()
        if (place?.geometry?.location) {
          const location = place.geometry.location
          newMap.setCenter(location)
          newMarker.setPosition(location)
          onLocationSelect(location.lat(), location.lng())
        }
      })
    }
  }, [lat, lng, onLocationSelect])

  // Initialize map only once
  useEffect(() => {
    if (typeof window !== "undefined" && window.google?.maps) {
      initializeMap()
    } else {
      const checkAndInitialize = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkAndInitialize)
          initializeMap()
        }
      }, 100)
      return () => clearInterval(checkAndInitialize)
    }
  }, [initializeMap])

  // Update marker position only when props change
  useEffect(() => {
    if (map && marker) {
      const newPosition = new google.maps.LatLng(lat, lng)
      marker.setPosition(newPosition)
      map.setCenter(newPosition)
    }
  }, [lat, lng])

  return (
    <div className="space-y-2 relative z-50">
      <input
        ref={searchRef}
        type="text"
        placeholder="Search location..."
        className="w-full p-2 border rounded-md"
        autoComplete="off"
      />
      <div ref={mapRef} className="w-full h-64 border rounded-md" />
    </div>
  )
}

export default GoogleMapPicker
