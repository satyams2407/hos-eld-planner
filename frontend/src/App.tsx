import { useState } from 'react'
import PlannerForm from './components/PlannerForm'
import MapView from './components/MapView'
import TripSummary from './components/TripSummary'
import LogSheet from './components/LogSheet'
import { planTrip, type TripInput } from './lib/api'
import type { Plan } from './lib/types'

export default function App() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function submit(input: TripInput) {
    setLoading(true); setError('')
    try { setPlan(await planTrip(input)); window.scrollTo({top: 0, behavior: 'smooth'}) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to plan trip.') }
    finally { setLoading(false) }
  }
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">H</span><span>HOS<span>ELD</span></span></div><div className="topbar-note">Driver operations planner <span className="status-dot"/> Live routing</div></header>
    <main>
      <section className="hero"><div className="hero-copy"><span className="eyebrow">FULL-STACK ASSESSMENT · HOS / ELD</span><h2>Turn a trip into a <em>driver-ready</em> plan.</h2><p>Route intelligence, HOS-aware rest planning, fueling stops and daily log sheets in one clear workflow.</p></div><div className="rule-chips"><span>11h drive</span><span>14h window</span><span>70 / 8 cycle</span><span>30m break</span></div></section>
      <section className="workspace"><aside><PlannerForm onSubmit={submit} loading={loading}/>{error && <div className="error-box"><b>Planning failed</b><p>{error}</p><small>Check the location names and make sure the Django API can reach the public geocoding/routing services.</small></div>}</aside><div className="results">{!plan && <div className="empty-state"><div className="empty-icon">↗</div><h2>Your trip plan will appear here</h2><p>Enter three locations and the driver's current cycle usage. The planner will calculate route distance, HOS-aware stops, and daily ELD logs.</p><div className="empty-cards"><span>01 Route</span><span>02 Stops & rests</span><span>03 ELD logs</span></div></div>}{plan && <><div className="map-card"><MapView plan={plan}/><div className="map-legend"><span><i className="legend-line"/> Route</span><span><i className="legend-dot start"/> Start</span><span><i className="legend-dot pickup"/> Pickup</span><span><i className="legend-dot dropoff"/> Drop-off</span></div></div><TripSummary plan={plan}/><section className="logs-section"><div className="section-heading"><div><span className="eyebrow">ELD OUTPUT</span><h2>Daily log sheets</h2><p>Generated from the planned event timeline, using the provided paper-log format as the visual reference.</p></div><span className="count-badge">{plan.daily_logs.length} sheets</span></div>{plan.daily_logs.map(log=><LogSheet key={log.day} log={log}/>)}</section><section className="panel assumptions"><div className="panel-title"><div><span className="eyebrow">TRANSPARENCY</span><h2>Assumptions & limitations</h2></div></div><ul>{plan.assumptions.concat(plan.warnings).map((x,i)=><li key={i}>{x}</li>)}</ul></section></>}</div></section>
    </main>
    <footer>HOS ELD Trip Planner · Map data © OpenStreetMap contributors · Routing by OSRM · For assessment/planning use</footer>
  </div>
}
