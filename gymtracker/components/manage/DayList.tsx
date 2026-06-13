'use client'

import { useState } from 'react'
import DayRow from './DayRow'
import AddDayForm from './AddDayForm'
import type { Day } from '@/lib/types'

interface Props {
  days: Day[]
  selectedDayId: number | null
  onSelect: (id: number) => void
  onChanged: () => Promise<void>
}

export default function DayList({ days, selectedDayId, onSelect, onChanged }: Props) {
  const [adding, setAdding] = useState(false)

  const moveDay = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= days.length) return
    const ids = days.map((d) => d.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await fetch('/api/days/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    await onChanged()
  }

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#666]">
        Días
      </h2>
      <ul className="space-y-1">
        {days.map((day, index) => (
          <DayRow
            key={day.id}
            day={day}
            selected={day.id === selectedDayId}
            isFirst={index === 0}
            isLast={index === days.length - 1}
            onSelect={() => onSelect(day.id)}
            onMoveUp={() => moveDay(index, -1)}
            onMoveDown={() => moveDay(index, 1)}
            onChanged={onChanged}
          />
        ))}
      </ul>
      {adding ? (
        <div className="mt-2">
          <AddDayForm
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
          className="mt-2 w-full rounded border border-dashed border-[#2a2a2a] px-3 py-2 text-sm text-[#666] transition-colors hover:border-[#e8ff47] hover:text-[#e8ff47]"
        >
          + Añadir día
        </button>
      )}
    </div>
  )
}
