import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const exerciseId = Number(body.exerciseId)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!Number.isInteger(exerciseId) || !name) {
      return NextResponse.json({ error: 'exerciseId and name are required' }, { status: 400 })
    }
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } })
    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }
    const variant = await prisma.exerciseVariant.create({
      data: { exerciseId, name },
    })
    return NextResponse.json(variant, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error creating variant' }, { status: 500 })
  }
}
