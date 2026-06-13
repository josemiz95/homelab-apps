'use client'

import { useState } from 'react'
import ExerciseRow from './ExerciseRow'
import AddExerciseForm, { type ExerciseSuggestion } from './AddExerciseForm'
import type { Day } from '@/lib/types'

interface Props {
  day: Day
  suggestions: ExerciseSuggestion[]
  onChanged: () => Promise<void>
}

export default function ExerciseList({ day, suggestions, onChanged }: Props) {
  const [adding, setAdding] = useState(false)

  const moveExercise = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= day.exercises.length) return
    const ids = day.exercises.map((e) => e.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await fetch('/api/exercises/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayId: day.id, ids }),
    })
    await onChanged()
  }

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <h2 className="mb-3 text-lg font-bold tracking-tight text-[#f5f5f5]">{day.name}</h2>
      {day.exercises.length === 0 && (
        <p className="py-6 text-center italic text-[#666]">
          Este día no tiene ejercicios todavía.
        </p>
      )}
      <ul className="space-y-2">
        {day.exercises.map((exercise, index) => (
          <ExerciseRow
            key={exercise.id}
            exercise={exercise}
            dayId={day.id}
            isFirst={index === 0}
            isLast={index === day.exercises.length - 1}
            onMoveUp={() => moveExercise(index, -1)}
            onMoveDown={() => moveExercise(index, 1)}
            onChanged={onChanged}
          />
        ))}
      </ul>
      {adding ? (
        <div className="mt-3">
          <AddExerciseForm
            dayId={day.id}
            suggestions={suggestions}
            onDone={async () => {
              setAdding(false)
              await onChanged()
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full rounded border border-dashed border-[#2a2a2a] px-3 py-2 text-sm text-[#666] transition-colors hover:border-[#e8ff47] hover:text-[#e8ff47]"
        >
          + Añadir ejercicio
        </button>
      )}
    </div>
  )
}
