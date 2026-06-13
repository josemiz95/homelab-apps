'use client'

import type { ExerciseVariant } from '@/lib/types'

interface Props {
  variants: ExerciseVariant[]
  activeVariantId: number
  onChange: (id: number) => void
}

export default function VariantPills({ variants, activeVariantId, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => {
        const active = variant.id === activeVariantId
        return (
          <button
            key={variant.id}
            onClick={() => onChange(variant.id)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              active
                ? 'bg-[#e8ff47] font-semibold text-black'
                : 'bg-[#2a2a2a] text-[#999]'
            }`}
          >
            {variant.name}
          </button>
        )
      })}
    </div>
  )
}
