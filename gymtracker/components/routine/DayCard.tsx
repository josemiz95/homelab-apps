import Link from 'next/link'
import type { Day } from '@/lib/types'

export default function DayCard({ day }: { day: Day }) {
  const count = day.exercises.length

  return (
    <Link
      href={`/routine/${day.id}`}
      className="block rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 transition-colors hover:border-[#e8ff47]"
    >
      <span className="block text-xl font-bold tracking-tight text-[#f5f5f5]">{day.name}</span>
      <span className="mt-1 block text-sm text-[#666]">
        {count} {count === 1 ? 'ejercicio' : 'ejercicios'}
      </span>
    </Link>
  )
}
