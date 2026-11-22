import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '@/store/mapStore'
import { useLiveStore } from '@/store/liveStore'
import { useLocationStore } from '@/store/locationStore'
import { getTileUrl, TILE_ATTRIBUTION } from '@/lib/mapConfig'
import BusMarker from './BusMarker'

// Helper to create clean custom HTML markers with SVG per Section 5 Design Language
function createMarkerIcon(type, label = '') {
  const configs = {
    // User location: cobalt dot with white border, soft pulsing ring, accuracy circle, label "You"
    user: {
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;inset:-4px;border-radius:50%;background:#0040FF;opacity:0.25;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <div style="width:14px;height:14px;border-radius:50%;background:#0040FF;border:3px solid #FFFFFF;box-shadow:0 0 10px rgba(0,64,255,0.6);z-index:2;"></div>
          </div>
          <span style="margin-top:1px;background:#050F45;color:#FFFFFF;font-size:9.5px;font-weight:700;padding:0.5px 5px;border-radius:9999px;border:1px solid rgba(255,255,255,0.8);white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);line-height:1.2;">
            You
          </span>
        </div>
      `,
      className: 'you-location-marker',
      iconSize: [30, 40],
      iconAnchor: [15, 12],
    },
    // Pin A = cobalt pin SVG with soft drop shadow
    pinA: {
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,32,165,0.35));">
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
            <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#0040FF"/>
            <circle cx="14" cy="14" r="10" fill="#FFFFFF"/>
            <text x="14" y="18" font-family="'Outfit', sans-serif" font-weight="800" font-size="12" fill="#0040FF" text-anchor="middle">A</text>
          </svg>
        </div>
      `,
      className: 'pin-a-marker',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    },
    // Pin B = amber pin SVG with soft drop shadow (from logo)
    pinB: {
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,19,110,0.35));">
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
            <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#FFB400"/>
            <circle cx="14" cy="14" r="10" fill="#00136E"/>
            <text x="14" y="18" font-family="'Outfit', sans-serif" font-weight="800" font-size="12" fill="#FFB400" text-anchor="middle">B</text>
          </svg>
        </div>
      `,
      className: 'pin-b-marker',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    },
    // Transfer = white circle with swap icon on cobalt
    transfer: {
      html: `
        <div style="width:24px;height:24px;border-radius:50%;background:#0040FF;border:2.5px solid #FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,32,165,0.4);color:#FFFFFF;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
          </svg>
        </div>
      `,
      className: 'transfer-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    },
    // Regular Stop = white circle with 3px cobalt ring
    stop: {
      html: `<div style="width:13px;height:13px;border-radius:50%;background:#FFFFFF;border:3px solid #0040FF;box-shadow:0 1px 4px rgba(5,15,69,0.25);"></div>`,
      className: 'stop-marker',
      iconSize: [13, 13],
      iconAnchor: [6.5, 6.5],
    },
    // Terminal Stop = amber pin
    terminalStop: {
      html: `
        <div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <svg width="22" height="28" viewBox="0 0 28 36" fill="none">
            <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#FFB400"/>
            <circle cx="14" cy="14" r="5" fill="#00136E"/>
          </svg>
        </div>
      `,
      className: 'terminal-stop-marker',
      iconSize: [22, 28],
      iconAnchor: [11, 28],
    },
    // Walking leg midpoint badge chip: "N min walk"
    walkBadge: {
      html: `
        <div style="background:#00136E;color:#FFFFFF;font-size:10px;font-weight:700;padding:2px 8px;border-radius:9999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,19,110,0.35);border:1.5px solid #FFFFFF;display:inline-flex;align-items:center;gap:3px;pointer-events:none;">
          <span>${label || 'Walk'}</span>
        </div>
      `,
      className: 'walk-midpoint-badge',
      iconSize: [75, 20],
      iconAnchor: [37.5, 10],
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

  // Calculate nearest bus to user
  let nearestTripId = null
  if (isValidUserPos && trips.length > 0) {
    let minDist = Infinity
    for (const t of trips) {
      if (t?.position?.lat && t?.position?.lng) {
        const d = Math.hypot(Number(t.position.lat) - uLat, Number(t.position.lng) - uLng)
        if (d < minDist) {
          minDist = d
          nearestTripId = t.id
        }
      }
    }
  }

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

        {/* 1. Single Route Polyline (Route detail / selected route) */}
        {/* Signature road styling: 3px white casing, cobalt-500 weight 6, thin white dashed centre line on top */}
        {polyline && polyline.length > 1 && (
          isApproximateRoute ? (
            <Polyline
              positions={polyline}
              pathOptions={{
                color: '#0040FF',
                weight: 4,
                dashArray: '8, 8',
                opacity: 0.9,
              }}
            />
          ) : (
            <>
              {/* Outer 3px White Casing */}
              <Polyline
                positions={polyline}
                pathOptions={{
                  color: '#FFFFFF',
                  weight: 9,
                  opacity: 0.98,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Main Cobalt Road Line */}
              <Polyline
                positions={polyline}
                pathOptions={{
                  color: routeColor || '#0040FF',
                  weight: 6,
                  opacity: 1,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Thin White Dashed Centre Line (like the road in the logo) */}
              <Polyline
                positions={polyline}
                pathOptions={{
                  color: '#FFFFFF',
                  weight: 1.5,
                  dashArray: '5, 8',
                  opacity: 0.9,
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
                  {/* Walking leg: DOTTED navy-900 line, weight 4, round caps */}
                  <Polyline
                    positions={leg.polyline}
                    pathOptions={{
                      color: '#00136E',
                      weight: 4,
                      dashArray: '2, 8',
                      lineCap: 'round',
                      opacity: 0.9,
                    }}
                  />
                  {/* Walk badge at midpoint: "N min walk" */}
                  {leg.midpoint && (
                    <Marker
                      position={leg.midpoint}
                      icon={createMarkerIcon('walkBadge', `${leg.walkMinutes || 1} min walk`)}
                      zIndexOffset={400}
                    />
                  )}
                </div>
              )
            }

            // Bus leg: road ribbon with casing + dashed centre line
            return leg.isApproximate ? (
              <Polyline
                key={`bus-${lIdx}`}
                positions={leg.polyline}
                pathOptions={{
                  color: leg.color || '#0040FF',
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
                    weight: 9,
                    opacity: 0.98,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                <Polyline
                  positions={leg.polyline}
                  pathOptions={{
                    color: leg.color || '#0040FF',
                    weight: 6,
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                <Polyline
                  positions={leg.polyline}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 1.5,
                    dashArray: '5, 8',
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </div>
            )
          })
        )}

        {/* Radius Circle (Nearby) */}
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
                color: '#0040FF',
                fillColor: '#0040FF',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '4, 4',
              }}
            />
          )}

        {/* User Location Pulsing Dot + Accuracy Circle (Cobalt at 12%) */}
        {isValidUserPos && (
          <>
            <Circle
              center={[uLat, uLng]}
              radius={Math.min(Number(accuracy) || 30, 250)}
              pathOptions={{
                color: '#0040FF',
                fillColor: '#0040FF',
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

        {/* Dashed Amber Line Between You and Selected Bus on Live */}
        {showUserBusLink && isValidUserPos && selectedBusPos && (
          <Polyline
            positions={[
              [uLat, uLng],
              [selectedBusPos.lat, selectedBusPos.lng],
            ]}
            pathOptions={{
              color: '#FFB400',
              weight: 2.5,
              dashArray: '6, 6',
              opacity: 0.9,
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
              isNearest={trip.id === nearestTripId}
              onClick={() => setSelectedTripId(trip.id)}
            />
          ))}
      </MapContainer>

      {/* Soft white overlay of 10% on basemap per Section 5 */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none z-[400]" />

      {/* Approximate Path Chip */}
      {hasAnyApproximate && (
        <div className="absolute bottom-2 left-2 z-[450] bg-white/95 backdrop-blur-md px-3 py-1 rounded-pill border border-line text-[10px] font-bold text-muted shadow-xs pointer-events-none flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Approximate path</span>
        </div>
      )}
    </div>
  )
}
