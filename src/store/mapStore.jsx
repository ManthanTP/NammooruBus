import { create } from 'zustand'

export const useMapStore = create((set) => ({
  polyline: null,
  routeColor: '#0040FF',
  isApproximateRoute: false,
  journeyLegs: [], // Array of { type: 'bus'|'walk', polyline, color, distanceMeters, walkMinutes, midpoint, isApproximate }
  markers: [],
  circle: null,
  bounds: null,
  center: null,
  zoom: null,

  setRoute: (polyline, color = '#0040FF', isApproximate = false) => {
    set({ polyline, routeColor: color, isApproximateRoute: isApproximate, journeyLegs: [] })
  },
  setPolyline: (polyline, color = '#0040FF', isApproximate = false) => {
    set({ polyline, routeColor: color, isApproximateRoute: isApproximate, journeyLegs: [] })
  },

  setJourneyLegs: (journeyLegs = []) => {
    set({ journeyLegs, polyline: null })
  },

  setMarkers: (markers = []) => {
    set({ markers })
  },

  setCircle: (circle = null) => {
    set({ circle })
  },

  fitBounds: (bounds) => {
    if (Array.isArray(bounds) && bounds.length >= 2) {
      const valid = bounds.filter(
        (b) =>
          Array.isArray(b) &&
          b.length === 2 &&
          !Number.isNaN(Number(b[0])) &&
          !Number.isNaN(Number(b[1])) &&
          Number.isFinite(Number(b[0])) &&
          Number.isFinite(Number(b[1]))
      )
      if (valid.length >= 2) {
        set({ bounds: valid })
        return
      }
    }
    set({ bounds: null })
  },
  setBounds: (bounds) => {
    if (Array.isArray(bounds) && bounds.length >= 2) {
      const valid = bounds.filter(
        (b) =>
          Array.isArray(b) &&
          b.length === 2 &&
          !Number.isNaN(Number(b[0])) &&
          !Number.isNaN(Number(b[1])) &&
          Number.isFinite(Number(b[0])) &&
          Number.isFinite(Number(b[1]))
      )
      if (valid.length >= 2) {
        set({ bounds: valid })
        return
      }
    }
    set({ bounds: null })
  },

  setView: (center, zoom = 14) => {
    if (Array.isArray(center) && center.length === 2) {
      const lat = Number(center[0])
      const lng = Number(center[1])
      if (
        !Number.isNaN(lat) &&
        !Number.isNaN(lng) &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        set({ center: [lat, lng], zoom })
      }
    }
  },
  setCenter: (center, zoom = 14) => {
    if (Array.isArray(center) && center.length === 2) {
      const lat = Number(center[0])
      const lng = Number(center[1])
      if (
        !Number.isNaN(lat) &&
        !Number.isNaN(lng) &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        set({ center: [lat, lng], zoom })
      }
    }
  },

  clearMap: () => {
    set({
      polyline: null,
      routeColor: '#0040FF',
      isApproximateRoute: false,
      journeyLegs: [],
      markers: [],
      circle: null,
      bounds: null,
    })
  },
}))
