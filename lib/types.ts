export interface EventData {
  id: string
  title: string
  url: string
  image: string | null
  startTime: string
  endTime: string | null
  timezone: string
  venue: VenueData | null
  category: string
  genre: string | null
  priceMin: number | null
  priceMax: number | null
  currency: string | null
}

export interface VenueData {
  name: string
  address: string
  lat: number
  lng: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface ViewportState {
  center: [number, number]
  zoom: number
  bounds: MapBounds | null
}

export interface EventProperties {
  id: string
  title: string
  category: string
  genre: string | null
  startTime: string
  venue: string | null
  address: string | null
  priceMin: number | null
  priceMax: number | null
  currency: string | null
  image: string | null
  url: string
  weight: number
}

export type EventCardData = Omit<EventProperties, 'weight'>

export interface EventFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: EventProperties
}

export interface EventFeatureCollection {
  type: 'FeatureCollection'
  features: EventFeature[]
  meta?: {
    total: number
    mapped: number
  }
}

export interface CategoryOption {
  id: string
  label: string
  emoji: string
}

export interface TimePreset {
  label: string
  value: string
  hours?: number
  startHour?: number
  days?: number
  startDay?: string
}

export const TIME_PRESETS: TimePreset[] = [
  { label: 'Now', value: 'now', hours: 4 },
  { label: 'Tonight', value: 'tonight', hours: 12, startHour: 18 },
  { label: 'Tomorrow', value: 'tomorrow', days: 1 },
  { label: 'This Weekend', value: 'weekend', days: 3, startDay: 'friday' },
  { label: 'This Week', value: 'week', days: 7 },
]

export const CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'All', emoji: '🌎' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'arts', label: 'Arts', emoji: '🎭' },
  { id: 'theatre', label: 'Theatre', emoji: '🎪' },
  { id: 'film', label: 'Film', emoji: '🎬' },
  { id: 'comedy', label: 'Comedy', emoji: '😂' },
  { id: 'miscellaneous', label: 'More', emoji: '📌' },
]