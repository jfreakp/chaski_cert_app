import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import StudentPickerFilters from './student-picker-filters'
import StudentPickerTable from './student-picker-table'

export const metadata = { title: `${PROJECT_NAME} — Agregar Participantes` }

export default async function NewParticipantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; career?: string }>
}) {
  const { id: processId } = await params
  const { q = '', career = '' } = await searchParams
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect(`/dashboard/processes/${processId}`)

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: {
      id: true,
      name: true,
      institutionId: true,
      careerId: true,
      certificateType: { select: { requiresCareer: true } },
      career: { select: { name: true } },
    },
  })
  if (!proc) notFound()
  if (institutionId && proc.institutionId !== institutionId) notFound()

  const requiresCareer = proc.certificateType.requiresCareer

  const existingIds = new Set(
    (
      await prisma.processParticipant.findMany({
        where: { processId },
        select: { studentId: true },
      })
    ).map(p => p.studentId)
  )

  const careerWhere = requiresCareer
    ? { careerId: proc.careerId ?? null }
    : career
    ? { careerId: career }
    : {}

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      institutionId: proc.institutionId,
      ...careerWhere,
      student: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { dni: { contains: q } },
              ],
            }
          : {}),
      },
    },
    include: {
      student: { select: { id: true, name: true, dni: true } },
      career: { select: { name: true } },
    },
    orderBy: { student: { name: 'asc' } },
  })

  const students = enrollments
    .filter(e => !existingIds.has(e.student.id))
    .map(e => ({
      id: e.student.id,
      name: e.student.name,
      dni: e.student.dni,
      career: e.career?.name ?? null,
    }))

  const careers = requiresCareer
    ? []
    : await prisma.career.findMany({
        where: { institutionId: proc.institutionId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/dashboard/processes/${processId}`}
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6"
        >
          ← Volver al proceso
        </Link>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Agregar Participantes
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{proc.name}</h1>
      </div>

      <StudentPickerFilters
        processId={processId}
        initialQ={q}
        initialCareer={career}
        careers={careers}
        fixedCareerName={requiresCareer ? (proc.career?.name ?? null) : null}
      />

      <StudentPickerTable students={students} processId={processId} />
    </div>
  )
}
