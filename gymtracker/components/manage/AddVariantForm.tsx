'use client'

import { useState } from 'react'

interface Props {
  exerciseId: number
  onDone: () => Promise<void>
  onCancel: () => void
}

export default function AddVariantForm({ exerciseId, onDone, onCancel }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      onCancel()
      return
    }
    setSaving(true)
    await fetch('/api/variants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, name: trimmed }),
    })
    await onDone()
  }

  return (
    <input
      autoFocus
      value={name}
      disabled={saving}
      placeholder="nombre…"
      onChange={(e) => setName(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit()
        if (e.key === 'Escape') onCancel()
      }}
      className="w-32 rounded-full border border-[#e8ff47] bg-[#0f0f0f] px-3 py-1 text-sm text-white outline-none disabled:opacity-50"
    />
  )
}
