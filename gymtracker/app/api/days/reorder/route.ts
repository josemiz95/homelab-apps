import { NextRequest, NextResponse } from 'next/server'
import { prisma, getErrorCode } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const ids: unknown = body.ids
    if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id))) {
      return NextResponse.json({ error: 'ids must be an array of numbers' }, { status: 400 })
    }
    await prisma.$transaction(
      (ids as number[]).map((id, index) =>
        prisma.day.update({ where: { id }, data: { order: index + 1 } })
      )
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error reordering days' }, { status: 500 })
  }
}
