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
    const data: { name?: string; order?: number } = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.order === 'number') data.order = body.order
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    const day = await prisma.day.update({ where: { id }, data })
    return NextResponse.json(day)
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error updating day' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await prisma.day.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error deleting day' }, { status: 500 })
  }
}
