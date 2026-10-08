export type Status = 'driving' | 'on_duty' | 'off_duty' | 'sleeper'

export interface LocationPoint {
  query: string
  display_name: string
  lat: number
  lon: number
}

export interface TripEvent {
  day: number
  start: string
  end: string
  status: Status
  label: string
  location: string
  distance_miles: number
  description: string
}

export interface DailyLog {
  day: number
  date: string
  from: string
  to: string
  events: TripEvent[]
  totals: Record<Status, number>
  cycle_remaining: number
}

export interface Plan {
  summary: {
    distance_miles: number
    estimated_drive_hours: number
    planned_days: number
    cycle_used_initial: number
    cycle_remaining_after_route: number
  }
  locations: LocationPoint[]
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  instructions: { instruction: string; road: string; distance_miles: number; duration_minutes: number }[]
  events: TripEvent[]
  daily_logs: DailyLog[]
  assumptions: string[]
  warnings: string[]
}
