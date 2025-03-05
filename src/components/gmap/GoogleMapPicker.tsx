"use client"

import React, { useEffect, useRef, useState } from "react"

interface GoogleMapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  lat?: number
  lng?: number
}

const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({ onLocationSelect, lat = 12.9716, lng = 77.5946 }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)

  useEffect(() => {
    const initializeMap = () => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("Google Maps API is not loaded yet.")
        return
      }

      const defaultLocation = { lat, lng }
      const newMap = new window.google.maps.Map(mapRef.current as HTMLDivElement, {
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

      if (searchRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(searchRef.current, {
          componentRestrictions: { country: "IN" },
          fields: ["geometry", "formatted_address"],
        })

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace()
          if (!place.geometry || !place.geometry.location) {
            console.warn("No valid location found for this place.")
            return
          }

          const { location } = place.geometry
          newMap.setCenter(location)
          newMarker.setPosition(location)

          onLocationSelect(location.lat(), location.lng(), place.formatted_address || "")
        })
      }

      newMarker.addListener("dragend", () => {
        const newPosition = newMarker.getPosition()
        if (newPosition) {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: newPosition }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              onLocationSelect(newPosition.lat(), newPosition.lng(), results[0].formatted_address)
            }
          })
        }
      })
    }

    if (typeof window !== "undefined" && window.google && window.google.maps) {
      initializeMap()
    } else {
      const interval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(interval)
          initializeMap()
        }
      }, 500)
    }
  }, [onLocationSelect, lat, lng]) // Re-run when lat/lng props change

  // Update marker position when lat/lng props change
  useEffect(() => {
    if (map && marker) {
      const newPosition = new google.maps.LatLng(lat, lng)
      marker.setPosition(newPosition)
      map.setCenter(newPosition)
    }
  }, [lat, lng, map, marker])

  return (
    <div className="space-y-2">
      <input ref={searchRef} type="text" placeholder="Search location..." className="w-full p-2 border rounded-md" />
      <div ref={mapRef} className="w-full h-64 border rounded-md" />
    </div>
  )
}

export default GoogleMapPicker
