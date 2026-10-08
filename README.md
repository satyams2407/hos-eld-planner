# HOS ELD Trip Planner

A full-stack assessment implementation using **Django + React**. It plans a property-carrying driver's trip, applies the provided FMCSA HOS assumptions, returns route instructions/stops/rests, and renders daily ELD logs.

## Stack
- Backend: Python, Django, lightweight JSON API
- Frontend: React + Vite + TypeScript
- Mapping: Leaflet + OpenStreetMap tiles
- Geocoding: Nominatim (OpenStreetMap)
- Routing: OSRM public routing API

## HOS assumptions implemented
- Property-carrying driver
- 70 hours / 8 days cycle
- 11 hours maximum driving per daily duty window
- 14 consecutive hours in the daily duty window
- 10 consecutive hours off duty to start a fresh daily window
- 30-minute interruption after 8 cumulative driving hours
- Fuel stop at least every 1,000 route miles
- 1 hour pickup and 1 hour drop-off
- Fueling stop modeled as 30 minutes on-duty/not-driving
- No adverse driving conditions

> This is a planning/assessment tool, not legal advice. Real-world HOS compliance can depend on additional exceptions, exemptions, sleeper-berth rules, state/federal applicability, and actual driver activity.

## Run locally

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). The frontend proxies `/api` to Django.

## Environment
Optional frontend variable:
- `VITE_API_BASE_URL` — use this only when the API is hosted on a different origin.

Optional backend variables:
- `CORS_ALLOWED_ORIGINS` — comma-separated frontend origins.
- `NOMINATIM_USER_AGENT` — recommended user-agent for the geocoding request.
- `ROUTING_API_URL` — defaults to the public OSRM demo service.
- `GEOCODING_API_URL` — defaults to Nominatim.

## API
`POST /api/plan-trip/`

```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "Indianapolis, IN",
  "dropoff_location": "Columbus, OH",
  "current_cycle_used": 12.5
}
```

Returns route geometry, summary, route instructions, planned events, daily logs, and warnings.
