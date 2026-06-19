import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { downloadTemplate } from '@/app/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id } = await params

  const proc = await prisma.certificateProcess.findUnique({
    where: { id },
    select: { templateKey: true, institutionId: true },
  })

  if (!proc?.templateKey) {
    return NextResponse.json({ error: 'Sin plantilla.' }, { status: 404 })
  }

  if (session.role !== 'ADMIN') {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { institutionId: true },
    })
    if (!user?.institutionId || user.institutionId !== proc.institutionId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }
  }

  const buffer = await downloadTemplate(proc.templateKey)

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/pdf' },
  })
}
