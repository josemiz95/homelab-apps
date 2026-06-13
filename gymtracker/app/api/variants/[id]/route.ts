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
    const variant = await prisma.exerciseVariant.update({ where: { id }, data: { name } })
    return NextResponse.json(variant)
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error updating variant' }, { status: 500 })
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
    await prisma.exerciseVariant.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error deleting variant' }, { status: 500 })
  }
}
