'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import MapView from '@/components/MapView'
import Timeline from '@/components/Timeline'
import CategoryLens from '@/components/CategoryLens'
import EventPanel from '@/components/EventPanel'
import InfoOverlay from '@/components/InfoOverlay'
import {
  TIME_PRESETS,
  type EventCardData,
  type EventFeature,
  type EventFeatureCollection,
  type EventProperties,
  type ViewportState,
} from '@/lib/types'

const NYC: [number, number] = [40.748, -73.985]
const HALF_DAY_MS = 12 * 60 * 60 * 1000

// Format a Date as UTC ISO-8601 with no milliseconds. Ticketmaster requires
// UTC datetimes (HH:mm:ssZ). Local wall-clock values are converted to UTC.
function fmtISO(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function getTimeRange(index: number): { start: string; end: string } {
  const now = new Date()
  const preset = TIME_PRESETS[index]

  if (preset.value === 'now') {
    const end = new Date(now.getTime() + preset.hours! * 60 * 60 * 1000)
    return { start: fmtISO(now), end: fmtISO(end) }
  }

  if (preset.value === 'tonight') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), preset.startHour!)
    const end = new Date(start.getTime() + preset.hours! * 60 * 60 * 1000)
    return { start: fmtISO(start), end: fmtISO(end) }
  }

  // Multi-day presets — start at local midnight (converted to UTC for the API).
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let startDate = startOfDay

  if (preset.startDay === 'friday') {
    const daysUntilFriday = (5 - startDate.getDay() + 7) % 7
    startDate = new Date(startDate.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000)
  } else if (preset.days !== undefined && preset.days > 0) {
    startDate = new Date(startDate.getTime() + preset.days * 24 * 60 * 60 * 1000)
  }

  const endDate = new Date(
    startDate.getTime() + (preset.days ?? 1) * 24 * 60 * 60 * 1000
  )
  return { start: fmtISO(startDate), end: fmtISO(endDate) }
}

// 14 half-day bars (7 days), aligned to local midnight. Buckets the returned
// events so the waveform reflects the actual local-time distribution.
function computeDailyCounts(events: EventFeatureCollection | null): number[] {
  const counts = new Array(14).fill(0)
  const now = new Date()
  const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (const f of events?.features ?? []) {
    const t = f.properties.startTime
    if (!t) continue
    const d = new Date(t)
    if (Number.isNaN(d.getTime())) continue
    const slot = Math.floor((d.getTime() - localToday.getTime()) / HALF_DAY_MS)
    if (slot >= 0 && slot < 14) counts[slot]++
  }
  return counts
}

// Highlight range (bars in the 14-bar waveform) for each time preset so the
// active selection aligns with the events it actually covers.
function getActiveBars(index: number): [number, number] {
  const hours = TIME_PRESETS[index].hours ?? TIME_PRESETS[index].days! * 24
  const startBar = Math.max(0, Math.floor((new Date().getHours() * 60) / (12 * 60)))
  const endBar = Math.min(14, startBar + Math.ceil(hours / 12))
  return [startBar, endBar]
}

async function fetchEventsApi(
  lat: number,
  lng: number,
  timeIndex: number,
  category: string
): Promise<EventFeatureCollection> {
  const timeRange = getTimeRange(timeIndex)
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lng: lng.toFixed(4),
    startDateTime: timeRange.start,
    endDateTime: timeRange.end,
  })
  if (category !== 'all') {
    params.set('classificationName', category)
  }

  const res = await fetch(`/api/events?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return res.json()
}

function eventFromFeature(f: EventFeature): EventCardData {
  return eventFromProps(f.properties)
}

function eventFromProps(props: EventProperties): EventCardData {
  return {
    id: props.id,
    title: props.title,
    category: props.category,
    genre: props.genre,
    startTime: props.startTime,
    venue: props.venue,
    address: props.address,
    priceMin: props.priceMin,
    priceMax: props.priceMax,
    currency: props.currency,
    image: props.image,
    url: props.url,
  }
}

export default function Home() {
  const [viewport, setViewport] = useState<ViewportState | null>(null)
  const [timeIndex, setTimeIndex] = useState(0)
  const [category, setCategory] = useState('all')
  const [events, setEvents] = useState<EventFeatureCollection | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventCardData | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fetchedViewportRef = useRef('')

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      queueMicrotask(() => setError('Geolocation not available. Showing New York City.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCenter([pos.coords.latitude, pos.coords.longitude])
      },
      () => {
        setError('Location access denied. Showing New York City.')
        setTimeout(() => setError(null), 5000)
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }, [])

  // Fetch events when viewport, time, or category changes
  const doFetch = useCallback(async (vp: ViewportState, ti: number, cat: string) => {
    const key = `${vp.center[0].toFixed(2)},${vp.center[1].toFixed(2)},${ti},${cat}`
    if (fetchedViewportRef.current === key) return
    fetchedViewportRef.current = key

    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchEventsApi(vp.center[0], vp.center[1], ti, cat)
      setEvents(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load events'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const debouncedFetch = useCallback(
    (vp: ViewportState, ti: number, cat: string) => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => doFetch(vp, ti, cat), 400)
    },
    [doFetch]
  )

  useEffect(() => {
    if (viewport) {
      debouncedFetch(viewport, timeIndex, category)
    }
  }, [viewport, timeIndex, category, debouncedFetch])

  // Retry uses the current params directly (bypasses debounce + dedupe).
  const handleRetry = useCallback(() => {
    if (!viewport) return
    fetchedViewportRef.current = ''
    doFetch(viewport, timeIndex, category)
  }, [viewport, timeIndex, category, doFetch])

  const handleViewportChange = useCallback((vp: ViewportState) => {
    setViewport(vp)
  }, [])

  const handleEventClick = useCallback(
    (evt: unknown) => {
      const props = evt as EventProperties
      setSelectedEvent(eventFromProps(props))
      const idx = events?.features?.findIndex((f) => f.properties.id === props.id) ?? -1
      setSelectedIndex(idx)
    },
    [events]
  )

  const selectByOffset = useCallback(
    (offset: number) => {
      const features = events?.features ?? []
      if (features.length === 0) return
      const idx = (selectedIndex + offset + features.length) % features.length
      const f = features[idx]
      if (f) {
        setSelectedEvent(eventFromFeature(f))
        setSelectedIndex(idx)
      }
    },
    [events, selectedIndex]
  )

  const handlePrev = useCallback(() => selectByOffset(-1), [selectByOffset])
  const handleNext = useCallback(() => selectByOffset(1), [selectByOffset])

  const handleClose = useCallback(() => {
    setSelectedEvent(null)
    setSelectedIndex(-1)
  }, [])

  const dailyCounts = useMemo(() => computeDailyCounts(events), [events])
  const activeBars = useMemo(() => getActiveBars(timeIndex), [timeIndex])

  const eventCount = events?.features?.length ?? 0
  const mapCenter = userCenter ?? NYC

  return (
    <div className="relative w-full h-full min-h-[100dvh] bg-[#0f0f1a]">
      <MapView
        events={events}
        center={mapCenter}
        selectedEventId={selectedEvent?.id}
        onViewportChange={handleViewportChange}
        onEventClick={handleEventClick}
      />

      <InfoOverlay count={eventCount} isLoading={isLoading} error={error} onRetry={handleRetry} />

      <CategoryLens selected={category} onSelect={setCategory} />

      <Timeline
        selectedIndex={timeIndex}
        activeBars={activeBars}
        onChange={setTimeIndex}
        dailyCounts={dailyCounts}
      />

      <EventPanel
        event={selectedEvent}
        onClose={handleClose}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  )
}