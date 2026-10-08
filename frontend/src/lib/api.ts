import type { Plan } from './types'

export interface TripInput {
  current_location: string
  pickup_location: string
  dropoff_location: string
  current_cycle_used: number
}

export async function planTrip(input: TripInput): Promise<Plan> {
  const base = import.meta.env.VITE_API_BASE_URL || ''
  const response = await fetch(`${base}/api/plan-trip/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Unable to plan trip.')
  return payload as Plan
}
