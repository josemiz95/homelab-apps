import { NextRequest, NextResponse } from 'next/server'
import { prisma, getErrorCode } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dayId = Number(searchParams.get('dayId'))
    const userId = Number(searchParams.get('userId'))
    if (!Number.isInteger(dayId) || !Number.isInteger(userId)) {
      return NextResponse.json(
        { error: 'dayId and userId query params are required' },
        { status: 400 }
      )
    }

    const day = await prisma.day.findUnique({
      where: { id: dayId },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                variants: {
                  include: {
                    sessions: {
                      where: { userId },
                      orderBy: { date: 'desc' },
                      take: 2,
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }

    const variantSessions: Record<string, unknown[]> = {}
    for (const de of day.exercises) {
      for (const variant of de.exercise.variants) {
        variantSessions[String(variant.id)] = variant.sessions
      }
    }

    return NextResponse.json({ variantSessions })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error fetching sessions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const variantId = Number(body.variantId)
    const userId = Number(body.userId)
    // weight and reps are individually optional (bodyweight/static exercises),
    // but at least one must be provided.
    const weight = body.weight === null || body.weight === undefined || body.weight === ''
      ? null
      : Number(body.weight)
    const reps = body.reps === null || body.reps === undefined || body.reps === ''
      ? null
      : Number(body.reps)

    if (!Number.isInteger(variantId) || !Number.isInteger(userId)) {
      return NextResponse.json({ error: 'variantId and userId are required' }, { status: 400 })
    }
    if (weight === null && reps === null) {
      return NextResponse.json(
        { error: 'at least one of weight or reps is required' },
        { status: 400 }
      )
    }
    if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
      return NextResponse.json({ error: 'weight must be a number >= 0' }, { status: 400 })
    }
    if (reps !== null && (!Number.isInteger(reps) || reps < 1)) {
      return NextResponse.json({ error: 'reps must be an integer >= 1' }, { status: 400 })
    }

    // Autosave-friendly upsert: if a session already exists today for this
    // variant+user, update it instead of stacking intermediate values.
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todays = await prisma.session.findFirst({
      where: { variantId, userId, date: { gte: startOfToday } },
      orderBy: { date: 'desc' },
    })

    if (todays) {
      const session = await prisma.session.update({
        where: { id: todays.id },
        data: { weight, reps, date: new Date() },
      })
      return NextResponse.json(session)
    }

    const session = await prisma.session.create({
      data: { variantId, userId, weight, reps },
    })
    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    if (getErrorCode(error) === 'P2003') {
      return NextResponse.json({ error: 'Variant or user not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error creating session' }, { status: 500 })
  }
}
