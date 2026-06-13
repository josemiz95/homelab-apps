'use client'

import { useState } from 'react'

export interface ExerciseSuggestion {
  id: number
  name: string
  variants: string[]
}

interface Props {
  dayId: number
  suggestions: ExerciseSuggestion[]
  onDone: () => Promise<void>
  onCancel: () => void
}

export default function AddExerciseForm({ dayId, suggestions, onDone, onCancel }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [focused, setFocused] = useState(false)

  const filtered = suggestions.filter((s) =>
    s.name.toLowerCase().includes(name.trim().toLowerCase())
  )

  // exerciseId set -> link the existing shared exercise (history carries over);
  // otherwise create by name (the API also reuses an exact name match).
  const submit = async (exerciseName: string, exerciseId?: number) => {
    const trimmed = exerciseName.trim()
    if ((!trimmed && exerciseId === undefined) || saving) return
    setSaving(true)
    await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        exerciseId !== undefined ? { dayId, exerciseId } : { dayId, name: trimmed }
      ),
    })
    await onDone()
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={name}
          disabled={saving}
          placeholder="Nombre del ejercicio…"
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(name)
            if (e.key === 'Escape') onCancel()
          }}
          className="min-w-0 flex-1 rounded border border-[#e8ff47] bg-[#0f0f0f] px-2 py-1.5 text-sm text-white outline-none disabled:opacity-50"
        />
        <button
          onClick={() => submit(name)}
          disabled={saving}
          title="Confirmar"
          className="px-2 py-1 text-[#4ade80] hover:opacity-80 disabled:opacity-50"
        >
          ✓
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          title="Cancelar"
          className="px-2 py-1 text-[#f87171] hover:opacity-80 disabled:opacity-50"
        >
          ✗
        </button>
      </div>

      {focused && filtered.length > 0 && (
        <ul className="absolute left-0 right-10 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded border border-[#2a2a2a] bg-[#1a1a1a] py-1 shadow-lg">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                // onMouseDown so it fires before the input's blur hides the list
                onMouseDown={(e) => {
                  e.preventDefault()
                  submit(s.name, s.id)
                }}
                disabled={saving}
                className="flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left text-sm text-[#f5f5f5] hover:bg-[#2a2a2a] disabled:opacity-50"
              >
                <span>{s.name}</span>
                {s.variants.length > 0 && (
                  <span className="truncate text-xs text-[#666]">{s.variants.join(' · ')}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
