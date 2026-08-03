'use client'

import type { EventCardData } from '@/lib/types'

interface EventPanelProps {
  event: EventCardData | null
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function EventPanel({ event, onClose, onNext, onPrev }: EventPanelProps) {
  if (!event) return null

  return (
    <div className="fixed inset-x-0 bottom-24 z-30 px-4 pointer-events-none">
      <div className="max-w-md mx-auto bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden pointer-events-auto transition-all duration-300 animate-slide-up">
        {/* Image */}
        {event.image ? (
          <div className="relative h-36 bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <button
              onClick={onClose}
              className="absolute top-2 right-2 bg-black/50 rounded-full w-7 h-7 flex items-center justify-center text-white text-xs hover:bg-black/70"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="relative h-16 bg-gradient-to-r from-gray-800 to-gray-700 flex items-center px-4">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 bg-black/50 rounded-full w-7 h-7 flex items-center justify-center text-white text-xs hover:bg-black/70"
            >
              ✕
            </button>
            <div className="text-xs text-white/50 uppercase tracking-wider">
              {event.category}{event.genre ? ` · ${event.genre}` : ''}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-semibold text-base leading-tight mb-2">
            {event.title}
          </h3>

          <div className="space-y-1 text-sm text-white/70 mb-3">
            {event.startTime && (
              <div className="flex items-center gap-2">
                <span className="text-white/40">🕐</span>
                {formatTime(event.startTime)}
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-2">
                <span className="text-white/40">📍</span>
                <span>
                  {event.venue}
                  {event.address ? ` · ${event.address}` : ''}
                </span>
              </div>
            )}
            {event.priceMin != null && (
              <div className="flex items-center gap-2">
                <span className="text-white/40">💰</span>
                <span>
                  {event.currency ?? '$'}
                  {event.priceMin}
                  {event.priceMax && event.priceMax !== event.priceMin
                    ? ` – ${event.currency ?? '$'}${event.priceMax}`
                    : ''}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-white text-black text-sm font-medium py-2 rounded-xl hover:bg-white/90 transition-colors"
            >
              Get Tickets
            </a>
            <button
              onClick={onPrev}
              className="bg-white/10 text-white text-xs py-2 px-3 rounded-xl hover:bg-white/20 transition-colors"
              title="Previous event"
            >
              ←
            </button>
            <button
              onClick={onNext}
              className="bg-white/10 text-white text-xs py-2 px-3 rounded-xl hover:bg-white/20 transition-colors"
              title="Next event"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
