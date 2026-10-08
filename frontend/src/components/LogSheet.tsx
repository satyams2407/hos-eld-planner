import type { DailyLog, TripEvent, Status } from '../lib/types'

const ROWS: { key: Status; label: string }[] = [
  { key: 'off_duty', label: '1. Off Duty' },
  { key: 'sleeper', label: '2. Sleeper Berth' },
  { key: 'driving', label: '3. Driving' },
  { key: 'on_duty', label: '4. On Duty\n(not driving)' },
]

function hourPosition(date: Date, dayStart: Date) {
  return ((date.getTime() - dayStart.getTime()) / 3600000) / 24 * 100
}

function EventLine({ event, dayStart }: { event: TripEvent; dayStart: Date }) {
  const start = new Date(event.start)
  const end = new Date(event.end)
  const left = Math.max(0, hourPosition(start, dayStart))
  const width = Math.max(0.25, Math.min(100 - left, hourPosition(end, dayStart) - left))
  return <div className="log-event" style={{ left: `${left}%`, width: `${width}%` }} title={`${event.label}: ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`} />
}

export default function LogSheet({ log }: { log: DailyLog }) {
  const dayStart = new Date(log.from)
  dayStart.setHours(0, 0, 0, 0)
  const hourMarks = Array.from({ length: 25 }, (_, i) => i)
  return (
    <div className="log-sheet">
      <div className="log-header">
        <div><div className="log-title">Drivers Daily Log</div><small>24 hours</small></div>
        <div className="date-box"><span>Day {log.day}</span><strong>{new Date(log.date).toLocaleDateString()}</strong></div>
      </div>
      <div className="log-meta">
        <span>From <b>{new Date(log.from).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</b></span>
        <span>To <b>{new Date(log.to).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</b></span>
        <span>Cycle remaining <b>{log.cycle_remaining}h</b></span>
      </div>
      <div className="grid-hours">{hourMarks.map(h => <span key={h} style={{ left: `${(h / 24) * 100}%` }}>{h === 0 ? 'Mid' : h === 12 ? 'Noon' : h > 12 ? h - 12 : h}</span>)}</div>
      <div className="eld-grid">
        {ROWS.map(row => (
          <div className="eld-row" key={row.key}>
            <div className="eld-label">{row.label.split('\n').map((s, i) => <div key={i}>{s}</div>)}</div>
            <div className="eld-track">
              {hourMarks.map(h => <i key={h} style={{ left: `${(h / 24) * 100}%` }} />)}
              {log.events.filter(e => e.status === row.key).map((event, i) => <EventLine key={`${event.start}-${i}`} event={event} dayStart={dayStart} />)}
            </div>
          </div>
        ))}
      </div>
      <div className="log-totals">
        <span>Off duty <b>{log.totals.off_duty}h</b></span>
        <span>Driving <b>{log.totals.driving}h</b></span>
        <span>On duty <b>{log.totals.on_duty}h</b></span>
        <span>Sleeper <b>{log.totals.sleeper}h</b></span>
      </div>
      <div className="remarks"><strong>Remarks</strong>{log.events.filter(e => e.label !== 'Driving').map((e, i) => <div key={i}><span>{e.label}</span> — {e.location || e.description}</div>)}</div>
    </div>
  )
}
