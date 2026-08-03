import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents } from '@/lib/ticketmaster'
import type { EventFeatureCollection } from '@/lib/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const radius = parseInt(searchParams.get('radius') ?? '50', 10)
  const startDateTime = searchParams.get('startDateTime')
  const endDateTime = searchParams.get('endDateTime')
  const classificationName = searchParams.get('classificationName') || undefined

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'lat and lng query params are required' },
      { status: 400 }
    )
  }

  if (!startDateTime || !endDateTime) {
    return NextResponse.json(
      { error: 'startDateTime and endDateTime query params are required' },
      { status: 400 }
    )
  }

  if (!process.env.TICKETMASTER_API_KEY) {
    return NextResponse.json(
      { error: 'TICKETMASTER_API_KEY not configured. Set it in .env.local' },
      { status: 500 }
    )
  }

  try {
    const events = await fetchEvents({
      lat,
      lng,
      radius,
      startDateTime,
      endDateTime,
      classificationName,
      size: 200,
    })

    const features = events
      .filter((e) => e.venue && e.venue.lat && e.venue.lng)
      .map((e) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [e.venue!.lng, e.venue!.lat] as [number, number],
        },
        properties: {
          id: e.id,
          title: e.title,
          category: e.category,
          genre: e.genre,
          startTime: e.startTime,
          venue: e.venue?.name ?? null,
          address: e.venue?.address ?? null,
          priceMin: e.priceMin,
          priceMax: e.priceMax,
          currency: e.currency,
          image: e.image,
          url: e.url,
          weight: 1,
        },
      }))

    const response: EventFeatureCollection = {
      type: 'FeatureCollection',
      features,
      meta: {
        total: events.length,
        mapped: features.length,
      },
    }

    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
