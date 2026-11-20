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
    walkBadge: {
      html: `
        <div style="background:#0E1433;color:#FFFFFF;font-size:10px;font-weight:700;padding:2px 7px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);border:1.5px solid #FFFFFF;display:inline-flex;align-items:center;gap:3px;pointer-events:none;">
          <span>🚶 ${label}</span>
        </div>
      `,
      className: 'walk-midpoint-badge',
      iconSize: [70, 20],
      iconAnchor: [35, 10],
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
          map.setView([lat, lng], zoom || 14, { animate: true })
        } catch (e) {
          console.warn('Map setView error:', e)
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
  const { polyline, routeColor, isApproximateRoute, journeyLegs, markers, circle } = useMapStore()
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
  const selectedBusPos =
    selectedTrip?.position?.lat &&
    selectedTrip?.position?.lng &&
    !Number.isNaN(Number(selectedTrip.position.lat)) &&
    !Number.isNaN(Number(selectedTrip.position.lng))
      ? { lat: Number(selectedTrip.position.lat), lng: Number(selectedTrip.position.lng) }
      : null

  const isValidUserPos =
    userPos &&
    !Number.isNaN(Number(userPos.lat)) &&
    !Number.isNaN(Number(userPos.lng)) &&
    Number.isFinite(Number(userPos.lat)) &&
    Number.isFinite(Number(userPos.lng))

  const uLat = isValidUserPos ? Number(userPos.lat) : null
  const uLng = isValidUserPos ? Number(userPos.lng) : null

  const hasAnyApproximate = isApproximateRoute || (journeyLegs && journeyLegs.some((l) => l.isApproximate))

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

        {/* 1. Single Route Polyline (e.g. Route detail) */}
        {polyline && polyline.length > 1 && (
          isApproximateRoute ? (
            <Polyline
              positions={polyline}
              pathOptions={{
                color: routeColor || '#3451F2',
                weight: 4,
                dashArray: '8, 8',
                opacity: 0.9,
              }}
            />
          ) : (
            <>
              {/* 2px white casing */}
              <Polyline
                positions={polyline}
                pathOptions={{
                  color: '#FFFFFF',
                  weight: 7,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Solid line in route colour */}
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
          )
        )}

        {/* 2. Multi-leg Journey (Walking legs + Bus legs) */}
        {journeyLegs && journeyLegs.length > 0 && (
          journeyLegs.map((leg, lIdx) => {
            if (!leg.polyline || leg.polyline.length < 2) return null

            if (leg.type === 'walk') {
              return (
                <div key={`walk-${lIdx}`}>
                  {/* Walking leg: DOTTED line (dashArray "2 8", round caps, ink colour, weight 4) */}
                  <Polyline
                    positions={leg.polyline}
                    pathOptions={{
                      color: '#0E1433',
                      weight: 4,
                      dashArray: '2, 8',
                      lineCap: 'round',
                      opacity: 0.85,
                    }}
                  />
                  {/* Walk badge at midpoint */}
                  {leg.midpoint && (
                    <Marker
                      position={leg.midpoint}
                      icon={createMarkerIcon('walkBadge', `${leg.walkMinutes || 1} min (${leg.distanceMeters || 0}m)`)}
                      zIndexOffset={400}
                    />
                  )}
                </div>
              )
            }

            // Bus leg: solid line in route color on top of 2px white casing
            return leg.isApproximate ? (
              <Polyline
                key={`bus-${lIdx}`}
                positions={leg.polyline}
                pathOptions={{
                  color: leg.color || '#3451F2',
                  weight: 4,
                  dashArray: '8, 8',
                  opacity: 0.9,
                }}
              />
            ) : (
              <div key={`bus-${lIdx}`}>
                <Polyline
                  positions={leg.polyline}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 7,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                <Polyline
                  positions={leg.polyline}
                  pathOptions={{
                    color: leg.color || '#3451F2',
                    weight: 5,
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </div>
            )
          })
        )}

        {/* Radius Circle (e.g. for Nearby) */}
        {circle &&
          !Number.isNaN(Number(circle.lat)) &&
          !Number.isNaN(Number(circle.lng)) &&
          Number.isFinite(Number(circle.lat)) &&
          Number.isFinite(Number(circle.lng)) &&
          Number(circle.radiusM) > 0 && (
            <Circle
              center={[Number(circle.lat), Number(circle.lng)]}
              radius={Number(circle.radiusM)}
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
        {isValidUserPos && (
          <>
            <Circle
              center={[uLat, uLng]}
              radius={Math.min(Number(accuracy) || 30, 250)}
              pathOptions={{
                color: '#3451F2',
                fillColor: '#3451F2',
                fillOpacity: 0.12,
                weight: 1.5,
                dashArray: '3, 3',
              }}
            />
            <Marker
              position={[uLat, uLng]}
              icon={createMarkerIcon('user')}
              zIndexOffset={500}
            />
          </>
        )}

        {/* Thin Dashed Line Between User and Selected Bus (Live Screen) */}
        {showUserBusLink && isValidUserPos && selectedBusPos && (
          <Polyline
            positions={[
              [uLat, uLng],
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
        {markers
          .filter(
            (m) =>
              m &&
              !Number.isNaN(Number(m.lat)) &&
              !Number.isNaN(Number(m.lng)) &&
              Number.isFinite(Number(m.lat)) &&
              Number.isFinite(Number(m.lng))
          )
          .map((m, idx) => (
            <Marker
              key={m.id || idx}
              position={[Number(m.lat), Number(m.lng)]}
              icon={createMarkerIcon(m.type || 'stop', m.label)}
              zIndexOffset={300}
            />
        ))}

        {/* Live Buses (Rendered on top with highest z-index) */}
        {trips
          .filter(
            (t) =>
              t?.position &&
              !Number.isNaN(Number(t.position.lat)) &&
              !Number.isNaN(Number(t.position.lng)) &&
              Number.isFinite(Number(t.position.lat)) &&
              Number.isFinite(Number(t.position.lng))
          )
          .map((trip) => (
            <BusMarker
              key={trip.id}
              trip={trip}
              isSelected={selectedTripId === trip.id}
              onClick={() => setSelectedTripId(trip.id)}
            />
        ))}
      </MapContainer>

      {/* Approximate Path Chip (Problem 1.4) */}
      {hasAnyApproximate && (
        <div className="absolute bottom-2 left-2 z-[400] bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-pill border border-line text-[10px] font-bold text-text-secondary shadow-xs pointer-events-none flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
          <span>Approximate path</span>
        </div>
      )}
    </div>
  )
}
