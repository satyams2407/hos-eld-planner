import json
import math
import os
from datetime import datetime, timedelta
from urllib.parse import quote

import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

MILE_METERS = 1609.344
HOS_DRIVE_LIMIT = 11.0
HOS_WINDOW = 14.0
HOS_RESET = 10.0
CYCLE_LIMIT = 70.0
BREAK_AFTER_DRIVING = 8.0
BREAK_LENGTH = 0.5
FUEL_INTERVAL_MILES = 1000.0
FUEL_DURATION = 0.5
SERVICE_DURATION = 1.0
PLANNING_START = datetime(2026, 1, 1, 6, 0, 0)


def health(request):
    return JsonResponse({'ok': True, 'service': 'HOS ELD Planner API'})


def _json_error(message, status=400, details=None):
    payload = {'error': message}
    if details:
        payload['details'] = details
    return JsonResponse(payload, status=status)


def _geocode(query):
    params = {'q': query, 'format': 'jsonv2', 'limit': 1, 'addressdetails': 1}
    headers = {'User-Agent': settings.NOMINATIM_USER_AGENT}
    try:
        response = requests.get(settings.NOMINATIM_URL, params=params, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise RuntimeError(f'Geocoding service unavailable: {exc}') from exc
    if not data:
        raise ValueError(f'Could not find location: {query}')
    item = data[0]
    return {
        'query': query,
        'display_name': item.get('display_name', query),
        'lat': float(item['lat']),
        'lon': float(item['lon']),
    }


def _route(points):
    coordinates = ';'.join(f"{p['lon']},{p['lat']}" for p in points)
    url = f"{settings.ROUTING_API_URL}/{coordinates}"
    params = {
        'overview': 'full',
        'geometries': 'geojson',
        'steps': 'true',
        'annotations': 'false',
    }
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise RuntimeError(f'Routing service unavailable: {exc}') from exc
    if data.get('code') != 'Ok' or not data.get('routes'):
        raise RuntimeError('The routing service could not calculate a route for these locations.')
    route = data['routes'][0]
    return route


def _hours(minutes):
    return round(minutes / 60.0, 2)


def _format_duration(hours):
    total = max(0, int(round(hours * 60)))
    h, m = divmod(total, 60)
    if h and m:
        return f'{h}h {m}m'
    if h:
        return f'{h}h'
    return f'{m}m'


def _event(day, start, end, status, label, location='', distance_miles=0.0, description=''):
    return {
        'day': day,
        'start': start.isoformat(),
        'end': end.isoformat(),
        'status': status,
        'label': label,
        'location': location,
        'distance_miles': round(distance_miles, 1),
        'description': description,
    }


def _split_route_distance(total_miles, segment_breaks):
    # segment_breaks is a list of milestone distances from trip origin.
    out = []
    prev = 0.0
    for distance in segment_breaks:
        if distance > prev:
            out.append(distance - prev)
            prev = distance
    if total_miles > prev:
        out.append(total_miles - prev)
    return out


def _build_plan(points, route, cycle_used):
    total_miles = route['distance'] / MILE_METERS
    total_drive_hours = route['duration'] / 3600.0
    legs = route.get('legs', [])

    # Route milestones are measured from the trip origin. This lets the planner place
    # pickup, fueling and drop-off at the correct point in the route instead of treating
    # pickup as if it happened before the truck reached the pickup location.
    milestones = []
    cumulative = 0.0
    if legs:
        pickup_leg_miles = legs[0].get('distance', 0) / MILE_METERS
        milestones.append({'mile': pickup_leg_miles, 'label': 'Pick-up', 'duration': SERVICE_DURATION,
                           'status': 'on_duty', 'location': points[1]['display_name'],
                           'description': 'Assignment assumption: 1 hour for pickup.'})
    next_fuel = FUEL_INTERVAL_MILES
    while next_fuel < total_miles - 0.01:
        # Avoid placing a fuel event on top of pickup/drop-off.
        if not any(abs(next_fuel - m['mile']) < 1 for m in milestones):
            milestones.append({'mile': next_fuel, 'label': 'Fuel stop', 'duration': FUEL_DURATION,
                               'status': 'on_duty', 'location': 'Planned fuel point',
                               'description': 'Fueling scheduled at least every 1,000 route miles.'})
        next_fuel += FUEL_INTERVAL_MILES
    milestones.append({'mile': total_miles, 'label': 'Drop-off', 'duration': SERVICE_DURATION,
                       'status': 'on_duty', 'location': points[2]['display_name'],
                       'description': 'Assignment assumption: 1 hour for drop-off.'})
    milestones.sort(key=lambda x: x['mile'])

    events = []
    now = PLANNING_START
    day = 1
    window_start = now
    driving_today = 0.0
    driving_since_break = 0.0
    cycle_remaining = max(0.0, CYCLE_LIMIT - cycle_used)
    miles_done = 0.0
    milestone_index = 0

    def push(status, duration, label, location='', distance=0.0, description=''):
        nonlocal now
        end = now + timedelta(hours=duration)
        events.append(_event(day, now, end, status, label, location, distance, description))
        now = end

    def reset_day(label='10-hour off-duty reset', duration=HOS_RESET):
        nonlocal now, day, window_start, driving_today, driving_since_break
        push('off_duty', duration, label, '', 0,
             'Required off-duty reset before the next daily driving window.' if duration == HOS_RESET
             else 'Cycle restart after reaching the 70-hour / 8-day limit.')
        day += 1
        window_start = now
        driving_today = 0.0
        driving_since_break = 0.0

    def take_break():
        nonlocal driving_since_break
        push('off_duty', BREAK_LENGTH, '30-minute rest break', '', 0,
             'Required interruption after 8 cumulative driving hours.')
        driving_since_break = 0.0

    while milestone_index < len(milestones):
        if day > 8:
            raise ValueError('The trip would require more than 8 planning days under the configured 70/8 cycle.')
        if cycle_remaining <= 0.01:
            reset_day('34-hour cycle restart', 34.0)
            cycle_remaining = CYCLE_LIMIT
            continue

        milestone = milestones[milestone_index]
        miles_to_milestone = max(0.0, milestone['mile'] - miles_done)
        hours_to_milestone = total_drive_hours * (miles_to_milestone / total_miles) if total_miles else 0.0
        window_elapsed = (now - window_start).total_seconds() / 3600.0
        available_drive = min(
            HOS_DRIVE_LIMIT - driving_today,
            BREAK_AFTER_DRIVING - driving_since_break,
            HOS_WINDOW - window_elapsed,
            cycle_remaining,
        )

        if available_drive <= 0.01:
            if driving_since_break >= BREAK_AFTER_DRIVING - 0.01:
                take_break()
                continue
            reset_day()
            continue

        drive_now = min(hours_to_milestone, available_drive)
        miles_now = miles_to_milestone if hours_to_milestone <= available_drive + 1e-9 else total_miles * (drive_now / total_drive_hours)
        push('driving', drive_now, 'Driving', 'En route', miles_now,
             'Driving segment under HOS limits.')
        miles_done += miles_now
        driving_today += drive_now
        driving_since_break += drive_now
        cycle_remaining -= drive_now

        if miles_done >= milestone['mile'] - 0.01:
            push(milestone['status'], milestone['duration'], milestone['label'], milestone['location'], 0, milestone['description'])
            milestone_index += 1

        # A break is required after 8 cumulative driving hours, even if the driver
        # just completed a service stop; the service stop itself is not automatically
        # counted as a qualifying 30-minute break in this conservative plan.
        if milestone_index < len(milestones) and driving_since_break >= BREAK_AFTER_DRIVING - 0.01:
            take_break()
        elif milestone_index < len(milestones):
            window_elapsed = (now - window_start).total_seconds() / 3600.0
            if driving_today >= HOS_DRIVE_LIMIT - 0.01 or window_elapsed >= HOS_WINDOW - 0.01:
                reset_day()

    # Group events into daily log sheets.
    grouped = {}
    for event in events:
        grouped.setdefault(event['day'], []).append(event)

    logs = []
    for day_number, day_events in sorted(grouped.items()):
        totals = {key: 0.0 for key in ['off_duty', 'sleeper', 'driving', 'on_duty']}
        for event in day_events:
            duration = (datetime.fromisoformat(event['end']) - datetime.fromisoformat(event['start'])).total_seconds() / 3600
            if event['status'] in totals:
                totals[event['status']] += duration
        logs.append({
            'day': day_number,
            'date': day_events[0]['start'][:10],
            'from': day_events[0]['start'],
            'to': day_events[-1]['end'],
            'events': day_events,
            'totals': {key: round(value, 2) for key, value in totals.items()},
            'cycle_remaining': round(cycle_remaining, 2),
        })

    instruction_steps = []
    for leg in legs:
        for step in leg.get('steps', []):
            name = step.get('name') or step.get('ref') or 'Unnamed road'
            maneuver = step.get('maneuver', {})
            instruction = maneuver.get('instruction') or f"Continue on {name}"
            instruction_steps.append({
                'instruction': instruction,
                'road': name,
                'distance_miles': round(step.get('distance', 0) / MILE_METERS, 1),
                'duration_minutes': round(step.get('duration', 0) / 60, 1),
            })

    return {
        'summary': {
            'distance_miles': round(total_miles, 1),
            'estimated_drive_hours': round(total_drive_hours, 2),
            'planned_days': len(logs),
            'cycle_used_initial': round(cycle_used, 2),
            'cycle_remaining_after_route': round(cycle_remaining, 2),
        },
        'locations': points,
        'geometry': route['geometry'],
        'instructions': instruction_steps,
        'events': events,
        'daily_logs': logs,
        'assumptions': [
            'Property-carrying driver, 70 hours / 8 days.',
            'No adverse driving conditions.',
            'Fuel stop at least once every 1,000 miles; each fuel stop is modeled as 30 minutes on-duty/not-driving.',
            'Pickup and drop-off are each modeled as 1 hour on-duty/not-driving.',
            'A 30-minute interruption is scheduled after 8 cumulative driving hours.',
            'A 10-hour off-duty reset is used when the daily 11-hour/14-hour limits are exhausted.',
        ],
        'warnings': [
            'Times are a planning simulation starting at 06:00 on Day 1 because the input does not include a calendar start time.',
            'Public Nominatim/OSRM services have usage limits; for production deployment, use a dedicated geocoder/routing provider or self-host the services.',
        ],
    }


@csrf_exempt
def plan_trip(request):
    if request.method != 'POST':
        return _json_error('Only POST is supported.', 405)
    try:
        body = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return _json_error('Request body must be valid JSON.')

    required = ['current_location', 'pickup_location', 'dropoff_location', 'current_cycle_used']
    missing = [key for key in required if body.get(key) in (None, '')]
    if missing:
        return _json_error('Missing required fields.', details=missing)
    try:
        cycle_used = float(body['current_cycle_used'])
    except (TypeError, ValueError):
        return _json_error('Current cycle used must be a number.')
    if cycle_used < 0 or cycle_used > 70:
        return _json_error('Current cycle used must be between 0 and 70 hours.')

    try:
        points = [_geocode(body['current_location']), _geocode(body['pickup_location']), _geocode(body['dropoff_location'])]
        route = _route(points)
        plan = _build_plan(points, route, cycle_used)
        return JsonResponse(plan)
    except ValueError as exc:
        return _json_error(str(exc))
    except RuntimeError as exc:
        return _json_error(str(exc), 502)
    except Exception as exc:
        return _json_error('Unexpected planning error.', 500, str(exc) if settings.DEBUG else None)
