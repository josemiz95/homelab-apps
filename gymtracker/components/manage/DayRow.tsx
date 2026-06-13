'use client'

import { useState } from 'react'
import type { Day } from '@/lib/types'

interface Props {
  day: Day
  selected: boolean
  isFirst: boolean
  isLast: boolean
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => Promise<void>
}

export default function DayRow({
  day,
  selected,
  isFirst,
  isLast,
  onSelect,
  onMoveUp,
  onMoveDown,
  onChanged,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(day.name)

  const submitRename = async () => {
    const trimmed = name.trim()
    setEditing(false)
    if (!trimmed || trimmed === day.name) {
      setName(day.name)
      return
    }
    await fetch(`/api/days/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    await onChanged()
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar el día "${day.name}" y todos sus ejercicios?`)) return
    await fetch(`/api/days/${day.id}`, { method: 'DELETE' })
    await onChanged()
  }

  return (
    <li
      className={`flex items-center gap-1 rounded border px-2 py-1.5 ${
        selected ? 'border-[#e8ff47]' : 'border-transparent'
      }`}
    >
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename()
            if (e.key === 'Escape') {
              setName(day.name)
              setEditing(false)
            }
          }}
          className="min-w-0 flex-1 rounded border border-[#e8ff47] bg-[#0f0f0f] px-2 py-1 text-sm text-white outline-none"
        />
      ) : (
        <button
          onClick={onSelect}
          className="min-w-0 flex-1 truncate text-left text-sm text-[#f5f5f5]"
        >
          {day.name}
        </button>
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
    </li>
  )
}
