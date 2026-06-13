'use client'

import { useState } from 'react'

interface Props {
  onDone: () => Promise<void>
  onCancel: () => void
}

export default function AddDayForm({ onDone, onCancel }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    await fetch('/api/days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    await onDone()
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={name}
        disabled={saving}
        placeholder="Nombre del día…"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onCancel()
        }}
        className="min-w-0 flex-1 rounded border border-[#e8ff47] bg-[#0f0f0f] px-2 py-1.5 text-sm text-white outline-none disabled:opacity-50"
      />
      <button
        onClick={submit}
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
  )
}
