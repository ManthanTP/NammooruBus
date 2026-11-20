import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '@/store/mapStore'
import { useLiveStore } from '@/store/liveStore'
import { useLocationStore } from '@/store/locationStore'
import { getTileUrl, TILE_ATTRIBUTION } from '@/lib/mapConfig'
import BusMarker from './BusMarker'

// Helper to create clean custom HTML markers with SVG
function createMarkerIcon(type, label = '') {
  const configs = {
    user: {
      html: `
        <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
          <span style="position:absolute;inset:0;border-radius:50%;background:#3451F2;opacity:0.4;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <div style="width:14px;height:14px;border-radius:50%;background:#3451F2;border:2.5px solid #FFFFFF;box-shadow:0 0 10px rgba(52,81,242,0.7);z-index:2;"></div>
        </div>
      `,
      className: 'you-location-marker',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
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
    if (bounds && Array.isArray(bounds) && bounds.length >= 2) {
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
        try {
          map.fitBounds(valid, { padding: [40, 40], maxZoom: 16, animate: true })
        } catch (e) {
          console.warn('Map fitBounds error:', e)
        }
      }
    }
  }, [bounds, map])

  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      const lat = Number(center[0])
      const lng = Number(center[1])
      if (
        !Number.isNaN(lat) &&
        !Number.isNaN(lng) &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        try {
          map.flyTo([lat, lng], zoom || 14, { animate: true, duration: 0.8 })
        } catch (e) {
          console.warn('Map flyTo error:', e)
        }
      }
    }
  }, [center, zoom, map])

  useEffect(() => {
    // Invalidate size on mount / updates
    const timer = setTimeout(() => {
      try {
        map.invalidateSize()
      } catch (e) {
        // Ignored
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [map])

  return null
}

export default function MapView({ showUserBusLink = true }) {
  const { polyline, routeColor, markers, circle } = useMapStore()
  const { trips, selectedTripId, setSelectedTripId } = useLiveStore()
  const { position: userPos, accuracy } = useLocationStore()

  const parsedLat = parseFloat(import.meta.env.VITE_DEFAULT_LAT)
  const parsedLng = parseFloat(import.meta.env.VITE_DEFAULT_LNG)
  const defaultLat = !Number.isNaN(parsedLat) && Number.isFinite(parsedLat) ? parsedLat : 15.3647
  const defaultLng = !Number.isNaN(parsedLng) && Number.isFinite(parsedLng) ? parsedLng : 75.1240
  const tileUrl = getTileUrl()
  const attribution = TILE_ATTRIBUTION

  // Find selected bus if active
  const selectedTrip = trips.find((t) => t.id === selectedTripId)
  const selectedBusPos = selectedTrip?.position?.lat && selectedTrip?.position?.lng
    ? { lat: selectedTrip.position.lat, lng: selectedTrip.position.lng }
    : null

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

        {/* Radius Circle (e.g. for Nearby) */}
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

        {/* User Location Pulsing Dot + Accuracy Circle (Rendered above polylines, below buses) */}
        {userPos && (
          <>
            <Circle
              center={[userPos.lat, userPos.lng]}
              radius={Math.min(accuracy || 30, 250)}
              pathOptions={{
                color: '#3451F2',
                fillColor: '#3451F2',
                fillOpacity: 0.12,
                weight: 1.5,
                dashArray: '3, 3',
              }}
            />
            <Marker
              position={[userPos.lat, userPos.lng]}
              icon={createMarkerIcon('user')}
              zIndexOffset={500}
            />
          </>
        )}

        {/* Thin Dashed Line Between User and Selected Bus (Live Screen) */}
        {showUserBusLink && userPos && selectedBusPos && (
          <Polyline
            positions={[
              [userPos.lat, userPos.lng],
              [selectedBusPos.lat, selectedBusPos.lng],
            ]}
            pathOptions={{
              color: '#3451F2',
              weight: 2,
              dashArray: '5, 5',
              opacity: 0.75,
            }}
          />
        )}

        {/* Custom Stop Markers */}
        {markers.map((m, idx) => (
          <Marker
            key={m.id || idx}
            position={[m.lat, m.lng]}
            icon={createMarkerIcon(m.type || 'stop', m.label)}
            zIndexOffset={300}
          />
        ))}

        {/* Live Buses (Rendered on top with highest z-index) */}
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
