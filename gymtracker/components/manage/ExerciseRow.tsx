'use client'

import { useState } from 'react'
import VariantChips from './VariantChips'
import type { Exercise } from '@/lib/types'

interface Props {
  exercise: Exercise
  dayId: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => Promise<void>
}

export default function ExerciseRow({
  exercise,
  dayId,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onChanged,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(exercise.name)

  const submitRename = async () => {
    const trimmed = name.trim()
    setEditing(false)
    if (!trimmed || trimmed === exercise.name) {
      setName(exercise.name)
      return
    }
    await fetch(`/api/exercises/${exercise.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    await onChanged()
  }

  const handleDelete = async () => {
    if (
      !confirm(
        `¿Quitar "${exercise.name}" de este día? Si no está en ningún otro día, se eliminará junto con su historial.`
      )
    )
      return
    await fetch(`/api/exercises/${exercise.id}?dayId=${dayId}`, { method: 'DELETE' })
    await onChanged()
  }

  return (
    <li className="rounded border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Contraer' : 'Expandir'}
          className="px-1 text-[#666] hover:text-[#e8ff47]"
        >
          {expanded ? '▾' : '▸'}
        </button>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename()
              if (e.key === 'Escape') {
                setName(exercise.name)
                setEditing(false)
              }
            }}
            className="min-w-0 flex-1 rounded border border-[#e8ff47] bg-[#0f0f0f] px-2 py-1 text-sm text-white outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-[#f5f5f5]">{exercise.name}</span>
        )}
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="Subir"
          className="px-1 text-[#666] hover:text-[#e8ff47] disabled:opacity-30"
        >
          ↑
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="Bajar"
          className="px-1 text-[#666] hover:text-[#e8ff47] disabled:opacity-30"
        >
          ↓
        </button>
        <button
          onClick={() => setEditing(true)}
          title="Renombrar"
          className="px-1 text-[#666] hover:text-[#e8ff47]"
        >
          ✎
        </button>
        <button
          onClick={handleDelete}
          title="Eliminar"
          className="px-1 text-[#666] hover:text-[#f87171]"
        >
          ✕
        </button>
      </div>
      {expanded && (
        <div className="mt-2 border-t border-[#2a2a2a] pt-2">
          <VariantChips
            exerciseId={exercise.id}
            variants={exercise.variants}
            onChanged={onChanged}
          />
        </div>
      )}
    </li>
  )
}
