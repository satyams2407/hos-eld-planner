import { useState } from 'react'
import type { TripInput } from '../lib/api'

const defaults: TripInput = { current_location: 'Chicago, IL', pickup_location: 'Indianapolis, IN', dropoff_location: 'Columbus, OH', current_cycle_used: 12 }

export default function PlannerForm({ onSubmit, loading }: { onSubmit: (input: TripInput) => void; loading: boolean }) {
  const [form, setForm] = useState(defaults)
  const update = (key: keyof TripInput, value: string) => setForm(f => ({ ...f, [key]: key === 'current_cycle_used' ? Number(value) : value }))
  return (
    <form className="planner-form" onSubmit={e => { e.preventDefault(); onSubmit(form) }}>
      <div className="form-heading"><span className="eyebrow">TRIP INPUT</span><h1>Plan your HOS-compliant trip</h1><p>Enter the driver's starting point, stops, and current 70/8 cycle usage.</p></div>
      <label>Current location<input value={form.current_location} onChange={e => update('current_location', e.target.value)} placeholder="e.g. Chicago, IL" required /></label>
      <label>Pickup location<input value={form.pickup_location} onChange={e => update('pickup_location', e.target.value)} placeholder="e.g. Indianapolis, IN" required /></label>
      <label>Drop-off location<input value={form.dropoff_location} onChange={e => update('dropoff_location', e.target.value)} placeholder="e.g. Columbus, OH" required /></label>
      <label>Current cycle used (hours)<div className="number-wrap"><input type="number" min="0" max="70" step="0.25" value={form.current_cycle_used} onChange={e => update('current_cycle_used', e.target.value)} required /><span>/ 70h</span></div></label>
      <button className="primary" disabled={loading}>{loading ? 'Planning route…' : 'Plan trip →'}</button>
      <div className="assumption-mini"><b>Planning rules</b><span>11h driving · 14h window · 30m break after 8h · 70/8 cycle</span></div>
    </form>
  )
}
