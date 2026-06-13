import DayCard from './DayCard'
import type { Day } from '@/lib/types'

export default function DayGrid({ days }: { days: Day[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {days.map((day) => (
        <DayCard key={day.id} day={day} />
      ))}
    </div>
  )
}
