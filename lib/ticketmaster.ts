import { EventData } from './types'

const BASE = 'https://app.ticketmaster.com/discovery/v2'

export interface FetchEventsParams {
  lat: number
  lng: number
  radius: number
  startDateTime: string
  endDateTime: string
  classificationName?: string
  size?: number
}

const MAX_PAGES = 50

export async function fetchEvents(
  params: FetchEventsParams
): Promise<EventData[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY
  if (!apiKey) {
    throw new Error('TICKETMASTER_API_KEY not configured')
  }

  const size = params.size ?? 200
  const all: EventData[] = []
  let page = 0

  for (;;) {
    const query = new URLSearchParams({
      apikey: apiKey,
      latlong: `${params.lat},${params.lng}`,
      radius: String(params.radius),
      unit: 'miles',
      startDateTime: params.startDateTime,
      endDateTime: params.endDateTime,
      size: String(size),
      sort: 'date,asc',
      page: String(page),
    })

    if (params.classificationName) {
      query.set('classificationName', params.classificationName)
    }

    const url = `${BASE}/events.json?${query}`
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(`Ticketmaster API error: ${res.status}`)
    }

    const body = await res.json()
    const events = normalizeEvents(body)
    all.push(...events)

    const paging = body.page ?? {}
    const totalElements = paging.totalElements ?? all.length
    if (events.length === 0 || all.length >= totalElements || page >= MAX_PAGES) {
      break
    }
    page++
  }

  return all
}

interface TMVenue {
  name: string
  address?: { line1?: string }
  city?: { name?: string }
  state?: { stateCode?: string }
  location?: { latitude?: string; longitude?: string }
}

interface TMImage {
  url?: string
  ratio?: string
}

interface TMPriceRange {
  min?: number
  max?: number
  currency?: string
}

interface TMClassification {
  segment?: { name?: string }
  genre?: { name?: string }
}

interface TicketmasterEvent {
  id: string
  name: string
  url?: string
  images?: TMImage[]
  priceRanges?: TMPriceRange[]
  classifications?: TMClassification[]
  dates?: {
    start?: { dateTime?: string; localDate?: string }
    end?: { dateTime?: string }
    timezone?: string
  }
  _embedded?: { venues?: TMVenue[] }
}

type TicketmasterResponse = {
  _embedded?: { events?: TicketmasterEvent[] }
  page?: { totalElements?: number }
}

function normalizeEvents(body: TicketmasterResponse): EventData[] {
  const embedded = body._embedded?.events
  if (!embedded || !Array.isArray(embedded)) {
    return []
  }

  return embedded.map(normalizeEvent).filter(Boolean) as EventData[]
}

function normalizeEvent(raw: TicketmasterEvent): EventData | null {
  try {
    const venue = raw._embedded?.venues?.[0]
    const priceRanges = raw.priceRanges?.[0]
    const classification = raw.classifications?.[0]
    const image = raw.images?.find((i) => i.ratio === '3_2')?.url
      ?? raw.images?.[0]?.url
      ?? null

    return {
      id: raw.id,
      title: raw.name,
      url: raw.url ?? '',
      image,
      startTime: raw.dates?.start?.dateTime ?? raw.dates?.start?.localDate ?? '',
      endTime: raw.dates?.end?.dateTime ?? null,
      timezone: raw.dates?.timezone ?? '',
      venue: venue
        ? {
            name: venue.name,
            address: [
              venue.address?.line1,
              venue.city?.name,
              venue.state?.stateCode,
            ]
              .filter(Boolean)
              .join(', '),
            lat: venue.location?.latitude
              ? parseFloat(venue.location.latitude)
              : 0,
            lng: venue.location?.longitude
              ? parseFloat(venue.location.longitude)
              : 0,
          }
        : null,
      category: classification?.segment?.name ?? 'Unknown',
      genre: classification?.genre?.name ?? null,
      priceMin: priceRanges?.min ?? null,
      priceMax: priceRanges?.max ?? null,
      currency: priceRanges?.currency ?? null,
    }
  } catch {
    return null
  }
}
