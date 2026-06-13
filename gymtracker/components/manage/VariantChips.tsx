'use client'

import { useState } from 'react'
import AddVariantForm from './AddVariantForm'
import type { ExerciseVariant } from '@/lib/types'

interface Props {
  exerciseId: number
  variants: ExerciseVariant[]
  onChanged: () => Promise<void>
}

export default function VariantChips({ exerciseId, variants, onChanged }: Props) {
  const [adding, setAdding] = useState(false)

  const handleDelete = async (variant: ExerciseVariant) => {
    if (!confirm(`¿Eliminar la variante "${variant.name}" y sus sesiones?`)) return
    await fetch(`/api/variants/${variant.id}`, { method: 'DELETE' })
    await onChanged()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {variants.map((variant) => (
        <span
          key={variant.id}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#2a2a2a] px-3 py-1 text-sm text-[#999]"
        >
          {variant.name}
          <button
            onClick={() => handleDelete(variant)}
            title="Eliminar variante"
            className="text-[#666] hover:text-[#f87171]"
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <AddVariantForm
          exerciseId={exerciseId}
          onDone={async () => {
            setAdding(false)
            await onChanged()
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="rounded-full border border-dashed border-[#2a2a2a] px-3 py-1 text-sm text-[#666] transition-colors hover:border-[#e8ff47] hover:text-[#e8ff47]"
        >
          + añadir variante
        </button>
      )}
    </div>
  )
}
