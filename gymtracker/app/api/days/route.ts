import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const days = await prisma.day.findMany({
      orderBy: { order: 'asc' },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: { exercise: { include: { variants: true } } },
        },
      },
    })
    // Flatten the DayExercise join so the client keeps the original shape:
    // days[].exercises[] = { id, name, order, variants }
    const shaped = days.map((day) => ({
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
    return NextResponse.json(shaped)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error fetching days' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    const maxOrder = await prisma.day.aggregate({ _max: { order: true } })
    const day = await prisma.day.create({
      data: { name, order: (maxOrder._max.order ?? 0) + 1 },
    })
    return NextResponse.json(day, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error creating day' }, { status: 500 })
  }
}
