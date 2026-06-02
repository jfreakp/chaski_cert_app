import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import CertificateForm from './certificate-form'

export const metadata = { title: `${PROJECT_NAME} — Emitir Certificado` }

export default async function NewCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect(`/dashboard/events/${eventId}`)

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, institutionId: true },
  })
  if (!event) notFound()
  if (institutionId && event.institutionId !== institutionId) notFound()

  const existingCerts = await prisma.certificate.findMany({
    where: { eventId },
    select: { studentId: true },
  })
  const certifiedIds = new Set(existingCerts.map(c => c.studentId))

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { institutionId: event.institutionId },
    include: {
      student: { select: { id: true, name: true, dni: true, isActive: true } },
      career: { select: { name: true } },
    },
    orderBy: { student: { name: 'asc' } },
  })

  const available = enrollments
    .filter(e => e.student.isActive && !certifiedIds.has(e.student.id))
    .map(e => ({
      id: e.student.id,
      name: e.student.name,
      dni: e.student.dni,
      career: e.career?.name ?? null,
    }))

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6"
        >
          ← Volver al evento
        </Link>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Emitir Certificado</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{event.name}</h1>
      </div>
      <CertificateForm eventId={eventId} students={available} />
    </div>
  )
}
