import { prisma } from '@/lib/prisma'
import DayGrid from '@/components/routine/DayGrid'

export const dynamic = 'force-dynamic'

export default async function RoutinePage() {
  const raw = await prisma.day.findMany({
    orderBy: { order: 'asc' },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: { exercise: { include: { variants: true } } },
      },
    },
  })
  const days = raw.map((day) => ({
    id: day.id,
    name: day.name,
    order: day.order,
    exercises: day.exercises.map((de) => ({
      id: de.exercise.id,
      name: de.exercise.name,
      order: de.order,
      variants: de.exercise.variants,
    })),
  }))

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">¿Qué toca hoy?</h1>
      {days.length === 0 ? (
        <p className="py-16 text-center italic text-[#666]">
          No hay días en tu rutina. Ve a Gestionar para crearlos.
        </p>
      ) : (
        <DayGrid days={days} />
      )}
    </div>
  )
}
