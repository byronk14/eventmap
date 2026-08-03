'use client'

interface InfoOverlayProps {
  count: number
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

export default function InfoOverlay({ count, isLoading, error, onRetry }: InfoOverlayProps) {
  if (error) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-red-500/90 text-white px-4 py-2 rounded-full text-sm shadow-lg backdrop-blur-sm flex items-center gap-3">
          <span>⚠️ {error}</span>
          <button
            onClick={onRetry}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1 rounded-full transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm shadow-lg backdrop-blur-sm flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
          Finding events...
        </div>
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 text-center">
        <div className="bg-black/60 text-white px-5 py-2 rounded-full text-sm shadow-lg backdrop-blur-sm">
          No events in this area. Try expanding time or panning around.
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="bg-black/50 text-white px-4 py-1.5 rounded-full text-xs shadow-lg backdrop-blur-sm">
        {count} event{count !== 1 ? 's' : ''} near you
      </div>
    </div>
  )
}
