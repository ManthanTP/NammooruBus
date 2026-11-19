import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Bus, Clock } from 'lucide-react'

/**
 * Creates custom HTML marker for a moving bus.
 */
function createBusDivIcon(trip, isSelected) {
  const code = trip.route?.code || 'BUS'
  const routeColor = trip.route?.color || '#3451F2'

  const now = Date.now()
  const updatedAt = trip.position?.updated_at ? new Date(trip.position.updated_at).getTime() : now
  const ageSeconds = Math.floor((now - updatedAt) / 1000)
  const isStale = ageSeconds > 60

  const bgColor = isStale ? '#6B7494' : routeColor
  const pulseHtml = isSelected
    ? `<span style="position:absolute;inset:-6px;border-radius:9999px;border:3px solid ${bgColor};animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.75;"></span>`
    : ''

  const staleBadge = isStale
    ? `<span style="position:absolute;-top:18px;left:50%;transform:translateX(-50%);background:#0E1433;color:#F1F4FA;font-size:9px;font-weight:600;padding:1px 4px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        ${Math.max(1, Math.floor(ageSeconds / 60))}m ago
      </span>`
    : ''

  const html = `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s;">
      ${pulseHtml}
      ${staleBadge}
      <div style="background:${bgColor};color:#FFFFFF;border:2px solid #FFFFFF;box-shadow:0 3px 10px rgba(14,20,51,0.35);padding:2px 6px;border-radius:9999px;display:flex;align-items:center;gap:3px;font-family:'DotGothic16',monospace;font-weight:bold;font-size:11px;letter-spacing:0.5px;min-width:38px;justify-content:center;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.2 6 18.2 6H5.8C4.8 6 3.9 6.8 3.6 7.8L2.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        <span>${code}</span>
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'bus-live-marker',
    iconSize: [44, 26],
    iconAnchor: [22, 13],
  })
}

export default function BusMarker({ trip, isSelected, onClick }) {
  if (!trip?.position?.lat || !trip?.position?.lng) return null

  const icon = createBusDivIcon(trip, isSelected)

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
