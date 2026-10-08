import type { Plan } from '../lib/types'

function duration(h: number) { const mins=Math.round(h*60); const hr=Math.floor(mins/60); const m=mins%60; return `${hr}h ${m}m` }
export default function TripSummary({ plan }: { plan: Plan }) {
  const stops = plan.events.filter(e => ['Fuel stop','30-minute rest break','10-hour off-duty reset','34-hour cycle restart','Pick-up','Drop-off'].includes(e.label))
  return <>
    <div className="summary-grid">
      <div><span>Route</span><strong>{plan.summary.distance_miles.toLocaleString()} mi</strong></div>
      <div><span>Drive time</span><strong>{duration(plan.summary.estimated_drive_hours)}</strong></div>
      <div><span>Planned days</span><strong>{plan.summary.planned_days}</strong></div>
      <div><span>Cycle remaining</span><strong>{plan.summary.cycle_remaining_after_route}h</strong></div>
    </div>
    <section className="panel stops-panel"><div className="panel-title"><div><span className="eyebrow">OPERATIONS</span><h2>Stops & rest schedule</h2></div><span className="count-badge">{stops.length} events</span></div>
      <div className="timeline-list">{stops.map((e,i)=><div className="timeline-item" key={`${e.start}-${i}`}><div className={`timeline-dot ${e.status}`} /><div className="timeline-content"><div><b>{e.label}</b><span>Day {e.day} · {new Date(e.start).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</span></div><p>{e.location || e.description}</p></div></div>)}</div>
    </section>
    <section className="panel instructions"><div className="panel-title"><div><span className="eyebrow">NAVIGATION</span><h2>Route instructions</h2></div></div>
      <ol>{plan.instructions.slice(0, 16).map((s,i)=><li key={i}><span>{i+1}</span><div><b>{s.instruction}</b><small>{s.road} · {s.distance_miles} mi · {s.duration_minutes} min</small></div></li>)}</ol>
      {plan.instructions.length > 16 && <p className="muted">Showing the first 16 maneuver steps. The full route geometry is displayed on the map.</p>}
    </section>
  </>
}
