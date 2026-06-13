'use client'

import { useCallback, useEffect, useState } from 'react'
import DayList from '@/components/manage/DayList'
import ExerciseList from '@/components/manage/ExerciseList'
import type { Day } from '@/lib/types'

export default function ManagePage() {
  const [days, setDays] = useState<Day[]>([])
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDays = useCallback(async () => {
    try {
      const res = await fetch('/api/days')
      if (!res.ok) throw new Error('fetch failed')
      const data: Day[] = await res.json()
      setDays(data)
      setError(null)
    } catch {
      setError('Error cargando la rutina. Recarga la página.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDays()
  }, [loadDays])

  const selectedDay = days.find((d) => d.id === selectedDayId) ?? null

  // Existing exercises (from any day) offered for reuse in the add-exercise
  // autocomplete, excluding ones already present in the selected day.
  // Picking one links the shared exercise, so weight history carries over.
  const suggestions = (() => {
    if (!selectedDay) return []
    const inDay = new Set(selectedDay.exercises.map((e) => e.id))
    const byId = new Map<number, { id: number; name: string; variants: string[] }>()
    for (const d of days) {
      for (const e of d.exercises) {
        if (inDay.has(e.id) || byId.has(e.id)) continue
        byId.set(e.id, { id: e.id, name: e.name, variants: e.variants.map((v) => v.name) })
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  })()

  if (loading) {
    return (
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="h-64 w-full animate-pulse rounded-lg bg-[#1a1a1a] md:w-64" />
        <div className="h-64 flex-1 animate-pulse rounded-lg bg-[#1a1a1a]" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Gestionar rutina</h1>
      {error && <p className="mb-4 text-sm text-[#f87171]">{error}</p>}
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="w-full md:w-64">
          <DayList
            days={days}
            selectedDayId={selectedDayId}
            onSelect={setSelectedDayId}
            onChanged={loadDays}
          />
        </div>
        <div className="min-w-0 flex-1">
          {selectedDay ? (
            <ExerciseList day={selectedDay} suggestions={suggestions} onChanged={loadDays} />
          ) : (
            <p className="py-16 text-center italic text-[#666]">
              Selecciona un día para ver sus ejercicios.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
