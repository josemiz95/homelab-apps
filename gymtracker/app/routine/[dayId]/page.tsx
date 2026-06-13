'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import UserToggle from '@/components/routine/UserToggle'
import ExerciseCard from '@/components/routine/ExerciseCard'
import type { Day, Session, User, VariantSessionMap } from '@/lib/types'

export default function WorkoutPage() {
  const params = useParams<{ dayId: string }>()
  const dayId = Number(params.dayId)

  const [users, setUsers] = useState<User[]>([])
  const [activeUser, setActiveUser] = useState<User | null>(null)
  const [day, setDay] = useState<Day | null>(null)
  const [sessionMap, setSessionMap] = useState<VariantSessionMap>({})
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeUserRef = useRef<User | null>(null)
  activeUserRef.current = activeUser

  // Initial load: users + day structure
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [usersRes, daysRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/days'),
        ])
        if (!usersRes.ok || !daysRes.ok) throw new Error('fetch failed')
        const usersData: User[] = await usersRes.json()
        const daysData: Day[] = await daysRes.json()
        if (cancelled) return
        setUsers(usersData)
        setActiveUser(usersData[0] ?? null)
        setDay(daysData.find((d) => d.id === dayId) ?? null)
      } catch {
        if (!cancelled) setError('Error cargando los datos. Recarga la página.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [dayId])

  // Fetch sessions whenever the active user changes
  useEffect(() => {
    if (!activeUser) return
    let cancelled = false
    setSessionsLoading(true)
    fetch(`/api/sessions?dayId=${dayId}&userId=${activeUser.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed')
        return res.json()
      })
      .then((data: { variantSessions: VariantSessionMap }) => {
        if (!cancelled) setSessionMap(data.variantSessions)
      })
      .catch(() => {
        if (!cancelled) setError('Error cargando las sesiones.')
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeUser, dayId])

  const handleSave = useCallback(
    async (variantId: number, weight: number | null, reps: number | null) => {
      if (!activeUser) throw new Error('no user')
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, userId: activeUser.id, weight, reps }),
      })
      if (!res.ok) throw new Error('save failed')
      const saved: Session = await res.json()
      // A late response from a save fired right before a user switch must not
      // be merged into the new user's session map.
      if (activeUserRef.current?.id !== activeUser.id) return
      setSessionMap((prev) => {
        const key = String(variantId)
        const existing = prev[key] ?? []
        // The API updates today's session in place, so replace it by id;
        // otherwise prepend the newly created one.
        const next =
          existing[0] && existing[0].id === saved.id
            ? [saved, ...existing.slice(1)]
            : [saved, ...existing].slice(0, 2)
        return { ...prev, [key]: next }
      })
    },
    [activeUser]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-[#1a1a1a]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-[#1a1a1a]" />
        ))}
      </div>
    )
  }

  if (!day) {
    return (
      <div>
        <Link href="/routine" className="text-sm text-[#666] hover:text-[#e8ff47]">
          ← Días
        </Link>
        <p className="py-16 text-center italic text-[#666]">Este día no existe.</p>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <Link href="/routine" className="text-sm text-[#666] hover:text-[#e8ff47]">
        ← Días
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{day.name}</h1>
        {activeUser && (
          <UserToggle users={users} activeUser={activeUser} onChange={setActiveUser} />
        )}
      </div>

      {error && <p className="mb-4 text-sm text-[#f87171]">{error}</p>}

      {day.exercises.length === 0 ? (
        <p className="py-16 text-center italic text-[#666]">
          Este día no tiene ejercicios todavía.
        </p>
      ) : sessionsLoading ? (
        <div className="space-y-4">
          {day.exercises.map((e) => (
            <div key={e.id} className="h-48 animate-pulse rounded-lg bg-[#1a1a1a]" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {day.exercises.map((exercise) => (
            <ExerciseCard
              key={`${exercise.id}-${activeUser?.id}`}
              exercise={exercise}
              sessionMap={sessionMap}
              activeUserId={activeUser?.id ?? 0}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  )
}
