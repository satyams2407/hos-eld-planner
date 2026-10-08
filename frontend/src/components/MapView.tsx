import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
import type { LocationPoint, Plan } from '../lib/types'

const icons = {
  start: new L.DivIcon({ className: 'map-pin start-pin', html: '<span>S</span>', iconSize: [34, 34], iconAnchor: [17, 17] }),
  pickup: new L.DivIcon({ className: 'map-pin pickup-pin', html: '<span>P</span>', iconSize: [34, 34], iconAnchor: [17, 17] }),
  dropoff: new L.DivIcon({ className: 'map-pin dropoff-pin', html: '<span>D</span>', iconSize: [34, 34], iconAnchor: [17, 17] }),
}

function FitBounds({ locations }: { locations: LocationPoint[] }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds(locations.map(p => [p.lat, p.lon] as [number, number]))
    map.fitBounds(bounds, { padding: [30, 30] })
  }, [locations, map])
  return null
}

export default function MapView({ plan }: { plan: Plan }) {
  const positions = plan.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number])
  return (
    <MapContainer center={positions[0]} zoom={5} className="map">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={positions} pathOptions={{ className: 'route-line', weight: 5 }} />
      {plan.locations.map((p, i) => (
        <Marker key={p.query} position={[p.lat, p.lon]} icon={icons[i === 0 ? 'start' : i === 1 ? 'pickup' : 'dropoff']}>
          <Popup><strong>{i === 0 ? 'Current location' : i === 1 ? 'Pickup' : 'Drop-off'}</strong><br />{p.display_name}</Popup>
        </Marker>
      ))}
      <FitBounds locations={plan.locations} />
    </MapContainer>
  )
}
