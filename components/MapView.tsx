'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { EventFeatureCollection, ViewportState } from '@/lib/types'

interface MapViewProps {
  events: EventFeatureCollection | null
  onViewportChange: (vp: ViewportState) => void
  onEventClick: (event: unknown) => void
  center?: [number, number]
  zoom?: number
}

const STADIA_API_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY ?? ''
const STADIA_STYLE = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json'

// Keyless fallback: plain OpenStreetMap raster tiles.
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

const HEAT_COLORS: maplibregl.ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['heatmap-density'],
  0,
  'rgba(33,102,172,0)',
  0.05,
  'rgba(103,169,207,0.3)',
  0.15,
  'rgba(209,229,240,0.4)',
  0.3,
  'rgba(253,219,199,0.6)',
  0.5,
  'rgba(239,138,98,0.8)',
  0.7,
  'rgba(255,100,50,0.9)',
  0.9,
  'rgba(255,50,30,0.95)',
  1,
  'rgba(178,24,43,1)',
]

export default function MapView({
  events,
  onViewportChange,
  onEventClick,
  center = [40.748, -73.985],
  zoom = 11,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null!)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const reportRef = useRef(onViewportChange)
  const [fatal, setFatal] = useState<string | null>(null)

  useEffect(() => {
    reportRef.current = onViewportChange
  }, [onViewportChange])

  useEffect(() => {
    if (mapRef.current) return

    // Diagnose WebGL availability up front.
    const probe = document.createElement('canvas')
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl')
    if (!gl) {
      queueMicrotask(() =>
        setFatal('Map failed: WebGL is not available. Enable it or hardware acceleration in your browser.')
      )
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STADIA_API_KEY ? STADIA_STYLE : FALLBACK_STYLE,
      center: [center[1], center[0]],
      zoom,
      attributionControl: { compact: true },
      transformRequest: (url) => {
        if (url.includes('stadiamaps.com') && STADIA_API_KEY && !url.includes('api_key=')) {
          const sep = url.includes('?') ? '&' : '?'
          return { url: `${url}${sep}api_key=${STADIA_API_KEY}` }
        }
      },
    })

    map.on('error', (e) => {
      console.error('MapLibre error:', e.error)
      setFatal((prev) => prev ?? `Map error: ${e?.error?.message ?? 'failed to load'}`)
    })

    map.on('styleerror', () => {
      setFatal((prev) => prev ?? 'Map style failed to load.')
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.on('load', () => {
      map.addSource('events', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'events-heat',
        type: 'heatmap',
        source: 'events',
        paint: {
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 8, 8, 14, 20],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.9, 14, 0.7],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 4],
          'heatmap-color': HEAT_COLORS,
          'heatmap-weight': ['get', 'weight'],
        },
      })

      map.addLayer({
        id: 'events-pin',
        type: 'circle',
        source: 'events',
        filter: ['!=', ['get', 'id'], ''],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 0, 14, 4, 18, 8],
          'circle-color': '#ff6b35',
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 14, 0.8, 18, 1],
          'circle-stroke-color': '#333333',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 14, 0.5, 18, 1.5],
        },
      })

      const vp: ViewportState = {
        center: [map.getCenter().lat, map.getCenter().lng],
        zoom: map.getZoom(),
        bounds: map.getBounds()
          ? {
              north: map.getBounds().getNorth(),
              south: map.getBounds().getSouth(),
              east: map.getBounds().getEast(),
              west: map.getBounds().getWest(),
            }
          : null,
      }
      reportRef.current(vp)
    })

    map.on('moveend', () => {
      const vp: ViewportState = {
        center: [map.getCenter().lat, map.getCenter().lng],
        zoom: map.getZoom(),
        bounds: map.getBounds()
          ? {
              north: map.getBounds().getNorth(),
              south: map.getBounds().getSouth(),
              east: map.getBounds().getEast(),
              west: map.getBounds().getWest(),
            }
          : null,
      }
      reportRef.current(vp)
    })

    map.on('click', 'events-pin', (e) => {
      if (!e.features?.[0]) return
      const props = e.features[0].properties
      onEventClick({
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
      })
    })

    map.on('mouseenter', 'events-pin', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'events-pin', () => {
      map.getCanvas().style.cursor = ''
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prevCenter = useRef<[number, number]>([center[0], center[1]])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const [lat, lng] = center
    const cur = map.getCenter()
    const dist = Math.hypot(cur.lat - lat, cur.lng - lng)
    if (prevCenter.current !== null && dist > 0.01) {
      map.flyTo({ center: [lng, lat], zoom, duration: 2000 })
    }
    prevCenter.current = center
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const source = map.getSource('events') as maplibregl.GeoJSONSource
    if (!source) return

    source.setData(events ?? { type: 'FeatureCollection', features: [] })
  }, [events])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%' }}
    >
      {fatal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
          <div className="bg-red-900/90 border border-red-500/40 text-red-50 text-sm rounded-xl px-4 py-3 max-w-md text-center shadow-xl">
            ⚠️ {fatal}
          </div>
        </div>
      )}
    </div>
  )
}
