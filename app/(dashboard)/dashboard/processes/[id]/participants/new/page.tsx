import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import ParticipantForm from './participant-form'

export const metadata = { title: `${PROJECT_NAME} — Agregar Estudiante` }

export default async function NewParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processId } = await params
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect(`/dashboard/processes/${processId}`)

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { id: true, name: true, institutionId: true, careerId: true },
  })
  if (!proc) notFound()
  if (institutionId && proc.institutionId !== institutionId) notFound()

  const existingParticipants = await prisma.processParticipant.findMany({
    where: { processId },
    select: { studentId: true },
  })
  const participantIds = new Set(existingParticipants.map(p => p.studentId))

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      institutionId: proc.institutionId,
      // Si el proceso tiene carrera, filtrar solo estudiantes de esa carrera
      ...(proc.careerId ? { careerId: proc.careerId } : {}),
    },
    include: {
      student: { select: { id: true, name: true, dni: true, isActive: true } },
      career:  { select: { name: true } },
    },
    orderBy: { student: { name: 'asc' } },
  })

  const available = enrollments
    .filter(e => e.student.isActive && !participantIds.has(e.student.id))
    .map(e => ({
      id:     e.student.id,
      name:   e.student.name,
      dni:    e.student.dni,
      career: e.career?.name ?? null,
    }))

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/dashboard/processes/${processId}`}
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6">
          ← Volver al proceso
        </Link>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Agregar Participante</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{proc.name}</h1>
      </div>
      <ParticipantForm processId={processId} students={available} />
    </div>
  )
}
