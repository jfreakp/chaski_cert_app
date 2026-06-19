import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'
import { getStudentSession } from '@/app/lib/student-session'
import { prisma } from '@/app/lib/prisma'
import { generateCertificatePdf, generateCustomCertificatePdf } from '@/app/lib/pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  const studentSession = await getStudentSession()

  if (!session?.userId && !studentSession?.studentId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id } = await params

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, dni: true } },
      career: { select: { name: true } },
      process: {
        include: {
          institution: { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
    },
  })

  if (!cert) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })

  // Un estudiante solo puede descargar sus propios certificados
  if (studentSession?.studentId && !session?.userId) {
    if (cert.studentId !== studentSession.studentId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const safeName = cert.student.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

  // ── PDF con plantilla custom ──────────────────────────────────────────────
  const type = _req.nextUrl.searchParams.get('type')

  if (type === 'custom') {
    const proc = await prisma.certificateProcess.findUnique({
      where: { id: cert.processId },
      select: {
        templateKey:    true,
        nameX:          true,
        nameY:          true,
        nameFontSize:   true,
        nameFontFamily: true,
        nameColor:      true,
      },
    })

    if (!proc?.templateKey || proc.nameX == null || proc.nameY == null) {
      return NextResponse.json({ error: 'Sin plantilla configurada.' }, { status: 404 })
    }

    const pdfBytes = await generateCustomCertificatePdf({
      studentName:    cert.student.name,
      verifyUrl:      `${appUrl}/verify/${cert.id}`,
      templateKey:    proc.templateKey,
      nameX:          proc.nameX,
      nameY:          proc.nameY,
      nameFontSize:   proc.nameFontSize   ?? 28,
      nameFontFamily: proc.nameFontFamily ?? 'Helvetica-Bold',
      nameColor:      proc.nameColor      ?? '#0d0d1e',
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-plantilla-${safeName}.pdf"`,
      },
    })
  }
  // ── PDF del sistema (flujo existente) ─────────────────────────────────────

  const pdfBytes = await generateCertificatePdf({
    id: cert.id,
    studentName: cert.student.name,
    studentDni: cert.student.dni,
    careerName: cert.career?.name ?? null,
    eventName: cert.process.name,
    eventDate: cert.process.date,
    institutionName: cert.process.institution.name,
    certificateTypeName: cert.process.certificateType.name,
    issuedAt: cert.issuedAt ?? cert.createdAt,
    verifyUrl: `${appUrl}/verify/${cert.id}`,
  })

  const filename = `certificado-${safeName}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
