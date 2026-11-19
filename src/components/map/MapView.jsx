import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '@/store/mapStore'
import { useLiveStore } from '@/store/liveStore'
import { getTileUrl, TILE_ATTRIBUTION } from '@/lib/mapConfig'
import BusMarker from './BusMarker'

// Helper to create clean custom HTML markers with SVG
function createMarkerIcon(type, label = '') {
  const configs = {
    user: {
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#3451F2;border:3px solid #FFFFFF;box-shadow:0 0 10px rgba(52,81,242,0.6);"></div>`,
      className: 'user-location-marker',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    },
    pinA: {
      html: `<div style="background:#12A676;color:white;font-weight:800;font-size:11px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">A</div>`,
      className: 'pin-a-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    },
    pinB: {
      html: `<div style="background:#E5484D;color:white;font-weight:800;font-size:11px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">B</div>`,
      className: 'pin-b-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    },
    transfer: {
      html: `<div style="background:#F59E0B;color:white;font-weight:800;font-size:10px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">⇄</div>`,
      className: 'transfer-marker',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    },
    stop: {
      html: `<div style="width:12px;height:12px;border-radius:50%;background:#0E1433;border:2px solid #FFFFFF;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'stop-marker',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    },
  }

  const c = configs[type] || configs.stop
  return L.divIcon({
    html: c.html,
    className: c.className,
    iconSize: c.iconSize,
    iconAnchor: c.iconAnchor,
  })
}

function MapController() {
  const map = useMap()
  const { bounds, center, zoom } = useMapStore()

  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true })
      } catch (e) {
        console.warn('Map fitBounds error:', e)
      }
    }
  }, [bounds, map])

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, { animate: true, duration: 0.8 })
    }
  }, [center, zoom, map])

  return null
}

export default function MapView() {
  const { polyline, routeColor, markers, circle } = useMapStore()
  const { trips, selectedTripId, setSelectedTripId } = useLiveStore()

  const defaultLat = parseFloat(import.meta.env.VITE_DEFAULT_LAT || '15.3647')
  const defaultLng = parseFloat(import.meta.env.VITE_DEFAULT_LNG || '75.1240')
  const tileUrl = getTileUrl()
  const attribution = TILE_ATTRIBUTION

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
      <MapContainer
        center={[defaultLat, defaultLng]}
        zoom={13}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer url={tileUrl} attribution={attribution} maxZoom={19} />
        <MapController />

        {/* Selected Route Polyline */}
        {polyline && polyline.length > 1 && (
          <>
            {/* Casing stroke */}
            <Polyline
              positions={polyline}
              pathOptions={{
                color: '#FFFFFF',
                weight: 7,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Core route stroke */}
            <Polyline
              positions={polyline}
              pathOptions={{
                color: routeColor || '#3451F2',
                weight: 5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* Radius Circle (for Nearby) */}
        {circle && (
          <Circle
            center={[circle.lat, circle.lng]}
            radius={circle.radiusM}
            pathOptions={{
              color: '#3451F2',
              fillColor: '#3451F2',
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Custom Markers */}
        {markers.map((m, idx) => (
          <Marker
            key={m.id || idx}
            position={[m.lat, m.lng]}
            icon={createMarkerIcon(m.type || 'stop', m.label)}
          />
        ))}

        {/* Live Buses */}
        {trips.map((trip) => (
          <BusMarker
            key={trip.id}
            trip={trip}
            isSelected={selectedTripId === trip.id}
            onClick={() => setSelectedTripId(trip.id)}
          />
        ))}
      </MapContainer>
    </div>
  )
}
