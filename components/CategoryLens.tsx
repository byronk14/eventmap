'use client'

import { CATEGORIES } from '@/lib/types'

interface CategoryLensProps {
  selected: string
  onSelect: (category: string) => void
}

export default function CategoryLens({ selected, onSelect }: CategoryLensProps) {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20">
      <div className="flex gap-1.5 bg-black/40 backdrop-blur-md rounded-full p-1.5 shadow-xl border border-white/10">
        {CATEGORIES.map((cat) => {
          const active = selected === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                ${
                  active
                    ? 'bg-white text-black shadow-md scale-105'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <span className="mr-1">{cat.emoji}</span>
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
