import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'
import { getStudentSession } from '@/app/lib/student-session'
import { prisma } from '@/app/lib/prisma'
import { generateCertificatePdf } from '@/app/lib/pdf'

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

  const safeName = cert.student.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const filename = `certificado-${safeName}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
