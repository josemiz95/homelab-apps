import { NextRequest, NextResponse } from 'next/server'
import { prisma, getErrorCode } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const dayId = Number(body.dayId)
    const ids: unknown = body.ids
    if (!Number.isInteger(dayId)) {
      return NextResponse.json({ error: 'dayId is required' }, { status: 400 })
    }
    if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id))) {
      return NextResponse.json({ error: 'ids must be an array of numbers' }, { status: 400 })
    }
    // ids are exercise ids in their new order within the given day.
    await prisma.$transaction(
      (ids as number[]).map((exerciseId, index) =>
        prisma.dayExercise.update({
          where: { dayId_exerciseId: { dayId, exerciseId } },
          data: { order: index + 1 },
        })
      )
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return NextResponse.json({ error: 'Exercise not found in day' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error reordering exercises' }, { status: 500 })
  }
}
