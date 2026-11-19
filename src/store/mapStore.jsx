import { create } from 'zustand'

export const useMapStore = create((set) => ({
  polyline: null,
  routeColor: '#3451F2',
  markers: [],
  circle: null,
  bounds: null,
  center: null,
  zoom: null,

  setRoute: (polyline, color = '#3451F2') => {
    set({ polyline, routeColor: color })
  },

  setMarkers: (markers = []) => {
    set({ markers })
  },

  setCircle: (circle = null) => {
    set({ circle })
  },

  fitBounds: (bounds) => {
    set({ bounds })
  },

  setView: (center, zoom = 14) => {
    set({ center, zoom })
  },

  clearMap: () => {
    set({
      polyline: null,
      routeColor: '#3451F2',
      markers: [],
      circle: null,
      bounds: null,
    })
  },
}))
