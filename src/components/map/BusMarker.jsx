import { Marker } from 'react-leaflet'
import L from 'leaflet'

/**
 * Creates custom HTML marker for a moving bus according to Section 5:
 * Rounded cobalt square with white bus-front icon, small amber destination board on top,
 * route number in a tiny pill under it, heading rotates slightly.
 * Stale buses (60s) turn grey; nearest bus gets amber ring.
 */
function createBusDivIcon(trip, isSelected, isNearest = false) {
  const code = trip.route?.code || trip.route?.route_number || 'BUS'
  const heading = trip.position?.heading || 0

  const now = Date.now()
  const updatedAt = trip.position?.updated_at ? new Date(trip.position.updated_at).getTime() : now
  const ageSeconds = Math.floor((now - updatedAt) / 1000)
  const isStale = ageSeconds > 60

  const mainColor = isStale ? '#5B6591' : '#0040FF'
  const ringColor = isSelected ? '#FFB400' : isNearest ? '#FFB400' : 'transparent'
  const ringStyle = isSelected || isNearest ? `box-shadow: 0 0 0 3px ${ringColor}, 0 4px 12px rgba(0,32,165,0.3);` : 'box-shadow: 0 3px 10px rgba(0,19,110,0.25);'

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      <!-- Bus box with heading rotation -->
      <div style="transform: rotate(${heading}deg); transition: transform 0.4s ease;">
        <div style="width:30px;height:30px;background:${mainColor};border-radius:9px;border:2px solid #FFFFFF;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;${ringStyle}">
          <!-- Small amber destination board on top of bus -->
          <div style="position:absolute;top:2px;width:14px;height:3px;background:#FFB400;border-radius:1px;"></div>
          <!-- White bus front icon -->
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px;">
            <rect x="4" y="3" width="16" height="16" rx="3"/>
            <path d="M4 11h16"/>
            <path d="M8 7h.01"/>
            <path d="M16 7h.01"/>
            <circle cx="8" cy="15" r="1.5" fill="#FFFFFF"/>
            <circle cx="16" cy="15" r="1.5" fill="#FFFFFF"/>
            <path d="M6 19v2"/>
            <path d="M18 19v2"/>
          </svg>
        </div>
      </div>
      <!-- Route number pill under bus -->
      <div style="margin-top:2px;background:#00136E;color:#FFB400;font-family:'DotGothic16',monospace;font-size:9.5px;font-weight:bold;padding:1px 5px;border-radius:9999px;border:1px solid rgba(255,180,0,0.4);white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);line-height:1.2;">
        ${code}
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'bus-live-marker',
    iconSize: [36, 48],
    iconAnchor: [18, 20],
  })
}

export default function BusMarker({ trip, isSelected, isNearest = false, onClick }) {
  if (!trip?.position?.lat || !trip?.position?.lng) return null

  const icon = createBusDivIcon(trip, isSelected, isNearest)

  return (
    <Marker
      position={[trip.position.lat, trip.position.lng]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (onClick) onClick(trip)
        },
      }}
    />
  )
}
