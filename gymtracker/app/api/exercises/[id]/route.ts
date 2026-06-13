import { NextRequest, NextResponse } from 'next/server'
import { prisma, getErrorCode } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    // Renames apply everywhere the exercise is used, since it is shared.
    const exercise = await prisma.exercise.update({ where: { id }, data: { name } })
    return NextResponse.json(exercise)
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error updating exercise' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const { searchParams } = new URL(request.url)
    const dayIdParam = searchParams.get('dayId')

    if (dayIdParam !== null) {
      // Remove from one day only; delete the exercise entirely (with its
      // variants and history) when no day uses it anymore.
      const dayId = Number(dayIdParam)
      if (!Number.isInteger(dayId)) {
        return NextResponse.json({ error: 'Invalid dayId' }, { status: 400 })
      }
      const removed = await prisma.dayExercise.deleteMany({ where: { exerciseId: id, dayId } })
      if (removed.count === 0) {
        return NextResponse.json({ error: 'Exercise not in this day' }, { status: 404 })
      }
      const remaining = await prisma.dayExercise.count({ where: { exerciseId: id } })
      if (remaining === 0) {
        await prisma.exercise.delete({ where: { id } })
      }
      return NextResponse.json({ ok: true, deletedEverywhere: remaining === 0 })
    }

    await prisma.exercise.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error deleting exercise' }, { status: 500 })
  }
}
