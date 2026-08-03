'use client'

import { useMemo } from 'react'
import { TIME_PRESETS } from '@/lib/types'

interface TimelineProps {
  selectedIndex: number
  onChange: (index: number) => void
  dailyCounts: number[]
  activeBars: [number, number]
}

export default function Timeline({
  selectedIndex,
  onChange,
  dailyCounts,
  activeBars,
}: TimelineProps) {
  const [startBar, endBar] = activeBars
  const maxCount = useMemo(
    () => Math.max(...dailyCounts, 1),
    [dailyCounts]
  )

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 pb-6 pt-2 px-4">
      <div className="max-w-lg mx-auto bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-3">
        {/* Waveform */}
        <div className="flex items-end justify-between gap-0.5 h-8 mb-2 px-1">
          {dailyCounts.map((count, i) => {
            const height = (count / maxCount) * 100
            const inRange = i >= startBar && i < endBar
            return (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${Math.max(height, 2)}%`,
                  background: inRange
                    ? 'rgba(255,255,255,0.8)'
                    : 'rgba(255,255,255,0.2)',
                  transition: 'background 0.3s, height 0.5s',
                }}
                title={`${count} events`}
              />
            )
          })}
        </div>

        {/* Snap points */}
        <div className="flex gap-1">
          {TIME_PRESETS.map((preset, i) => {
            const active = i === selectedIndex
            return (
              <button
                key={preset.label}
                onClick={() => onChange(i)}
                className={`
                  flex-1 py-2 rounded-xl text-xs font-medium transition-all
                  ${
                    active
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
