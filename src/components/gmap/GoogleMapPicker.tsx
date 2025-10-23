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
  const [isUnavailable, setIsUnavailable] = useState(false)

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      return
    }

    try {
      const defaultLocation = { lat, lng }
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: defaultLocation,
        zoom: 17,
      })
      setMap(newMap)

      const newMarker = new window.google.maps.Marker({
        position: defaultLocation,
        map: newMap,
        draggable: true,
      })
      setMarker(newMarker)

      newMarker.addListener("dragend", () => {
        const position = newMarker.getPosition()
        if (position) {
          onLocationSelect(position.lat(), position.lng())
        }
      })

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
    } catch (error) {
      console.warn("Google Maps failed to initialise:", error)
      setIsUnavailable(true)
    }
  }, [lat, lng, onLocationSelect])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (window.google?.maps) {
      initializeMap()
      return
    }

    let attempts = 0
    const maxAttempts = 30
    const interval = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(interval)
        initializeMap()
      } else if (attempts >= maxAttempts) {
        clearInterval(interval)
        setIsUnavailable(true)
      }
      attempts += 1
    }, 200)

    return () => clearInterval(interval)
  }, [initializeMap])

  useEffect(() => {
    if (map && marker) {
      const newPosition = new google.maps.LatLng(lat, lng)
      marker.setPosition(newPosition)
      map.setCenter(newPosition)
    }
  }, [lat, lng, map, marker])

  if (isUnavailable) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm text-[#8d6e63]">
        <p>Google Maps is unavailable right now.</p>
        <p>Please confirm your address details manually and we will pin it for you.</p>
      </div>
    )
  }

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
