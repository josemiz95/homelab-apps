import { NextRequest, NextResponse } from 'next/server'
import { prisma, getErrorCode } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dayId = Number(body.dayId)
    const exerciseId = body.exerciseId === undefined ? null : Number(body.exerciseId)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!Number.isInteger(dayId) || (exerciseId === null && !name)) {
      return NextResponse.json(
        { error: 'dayId and name (or exerciseId) are required' },
        { status: 400 }
      )
    }
    const day = await prisma.day.findUnique({ where: { id: dayId } })
    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }

    // Resolve the exercise to link: explicit id, existing name match (reuse),
    // or create a brand-new one.
    let exercise
    if (exerciseId !== null) {
      exercise = await prisma.exercise.findUnique({
        where: { id: exerciseId },
        include: { variants: true },
      })
      if (!exercise) {
        return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
      }
    } else {
      const all = await prisma.exercise.findMany({ include: { variants: true } })
      exercise =
        all.find((e) => e.name.toLowerCase() === name.toLowerCase()) ?? null
      if (!exercise) {
        const variantNames: string[] = Array.isArray(body.variants)
          ? body.variants.filter((v: unknown) => typeof v === 'string' && (v as string).trim())
          : []
        exercise = await prisma.exercise.create({
          data: {
            name,
            variants: { create: variantNames.map((v) => ({ name: v.trim() })) },
          },
          include: { variants: true },
        })
      }
    }

    const maxOrder = await prisma.dayExercise.aggregate({
      where: { dayId },
      _max: { order: true },
    })
    const link = await prisma.dayExercise.create({
      data: { dayId, exerciseId: exercise.id, order: (maxOrder._max.order ?? 0) + 1 },
    })

    return NextResponse.json(
      { id: exercise.id, name: exercise.name, order: link.order, variants: exercise.variants },
      { status: 201 }
    )
  } catch (error) {
    if (getErrorCode(error) === 'P2002') {
      return NextResponse.json({ error: 'Exercise already in this day' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error creating exercise' }, { status: 500 })
  }
}
