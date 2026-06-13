'use client'

import { useEffect, useRef, useState } from 'react'
import VariantPills from './VariantPills'
import WeightInput from './WeightInput'
import RepsInput from './RepsInput'
import ProgressIndicator from './ProgressIndicator'
import type { Exercise, VariantSessionMap } from '@/lib/types'

const AUTOSAVE_DEBOUNCE_MS = 800

interface Props {
  exercise: Exercise
  sessionMap: VariantSessionMap
  activeUserId: number
  onSave: (variantId: number, weight: number | null, reps: number | null) => Promise<void>
}

export default function ExerciseCard({ exercise, sessionMap, activeUserId, onSave }: Props) {
  const [activeVariantId, setActiveVariantId] = useState(exercise.variants[0]?.id ?? 0)
  const [weight, setWeight] = useState<number | ''>('')
  const [reps, setReps] = useState<number | ''>('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const sessions = sessionMap[String(activeVariantId)] ?? []
  const lastWeight = sessions[0]?.weight
  const lastLastWeight = sessions[1]?.weight

  // Latest pending edit + save fn, readable from unmount cleanup without stale closures.
  const pendingRef = useRef({ isDirty, weight, reps, variantId: activeVariantId })
  pendingRef.current = { isDirty, weight, reps, variantId: activeVariantId }
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  // Flush a pending edit when the card unmounts (user switch, navigation),
  // otherwise the debounced save is silently cancelled and the value lost.
  useEffect(() => {
    return () => {
      const p = pendingRef.current
      if (p.isDirty && (p.weight !== '' || p.reps !== '')) {
        onSaveRef
          .current(p.variantId, p.weight === '' ? null : p.weight, p.reps === '' ? null : p.reps)
          .catch(() => {})
      }
    }
  }, [])

  // Same protection when switching variant pills with an edit pending.
  const handleVariantChange = (id: number) => {
    const p = pendingRef.current
    if (id !== p.variantId && p.isDirty && (p.weight !== '' || p.reps !== '')) {
      onSaveRef
        .current(p.variantId, p.weight === '' ? null : p.weight, p.reps === '' ? null : p.reps)
        .catch(() => {})
      setIsDirty(false)
    }
    setActiveVariantId(id)
  }

  // Populate inputs from the variant's last session when the variant or user changes.
  useEffect(() => {
    const last = (sessionMap[String(activeVariantId)] ?? [])[0]
    setWeight(last?.weight ?? '')
    setReps(last?.reps ?? '')
    setIsDirty(false)
    setSaveError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVariantId, activeUserId])

  // Debounced autosave: any change to weight/reps saves after a short pause.
  // Either field may be empty (bodyweight/static exercises), but not both.
  useEffect(() => {
    if (!isDirty || (weight === '' && reps === '')) return
    const timer = setTimeout(async () => {
      setIsSaving(true)
      setSaveError(null)
      try {
        await onSave(activeVariantId, weight === '' ? null : weight, reps === '' ? null : reps)
        setIsDirty(false)
        setJustSaved(true)
      } catch {
        setSaveError('Error al guardar. Sigue editando para reintentar.')
      } finally {
        setIsSaving(false)
      }
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [weight, reps, isDirty, activeVariantId, onSave])

  // Fade out the "saved" confirmation.
  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 1500)
    return () => clearTimeout(timer)
  }, [justSaved])

  if (exercise.variants.length === 0) {
    return (
      <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
        <h3 className="text-lg font-bold text-white">{exercise.name}</h3>
        <p className="mt-2 text-sm italic text-[#666]">
          Este ejercicio no tiene variantes. Añádelas en Gestionar.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <h3 className="text-lg font-bold text-white">{exercise.name}</h3>

      <div className="mt-3">
        <VariantPills
          variants={exercise.variants}
          activeVariantId={activeVariantId}
          onChange={handleVariantChange}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-[#666]">
            Peso (kg)
          </label>
          <WeightInput
            value={weight}
            onChange={(v) => {
              setWeight(v)
              setIsDirty(true)
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-[#666]">Reps</label>
          <RepsInput
            value={reps}
            onChange={(v) => {
              setReps(v)
              setIsDirty(true)
            }}
          />
        </div>
      </div>

      <div className="mt-4 flex min-h-[24px] items-center justify-between gap-3">
        <ProgressIndicator
          currentWeight={weight}
          lastWeight={lastWeight}
          lastLastWeight={lastLastWeight}
        />
        <span className="ml-auto text-sm">
          {isSaving ? (
            <span className="flex items-center gap-2 text-[#666]">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#666] border-t-[#e8ff47]" />
              Guardando…
            </span>
          ) : justSaved ? (
            <span className="text-[#4ade80]">✓ Guardado</span>
          ) : null}
        </span>
      </div>

      {saveError && <p className="mt-2 text-sm text-[#f87171]">{saveError}</p>}
    </div>
  )
}
