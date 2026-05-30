import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditStudentForm from './edit-student-form'

export const metadata = { title: `${PROJECT_NAME} — Editar Estudiante` }

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  const { id } = await params  // id = enrollmentId

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id },
    select: {
      id: true,
      careerId: true,
      student: { select: { id: true, name: true, dni: true, email: true } },
      institution: { select: { id: true, name: true } },
    },
  })

  if (!enrollment) notFound()

  // ADMIN ve carreras de la institución del enrollment; UNIVERSITY ve las suyas
  const careersInstitutionId = session.role === 'ADMIN'
    ? enrollment.institution.id
    : (await prisma.user.findUnique({
        where: { id: session.userId },
        select: { institutionId: true },
      }))?.institutionId ?? null

  const careers = careersInstitutionId
    ? await prisma.career.findMany({
        where: { institutionId: careersInstitutionId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Estudiantes · {enrollment.institution.name}
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Editar Estudiante</h1>
        <p className="text-secondary mt-2 text-sm">{enrollment.student.name}</p>
      </div>
      <EditStudentForm
        enrollmentId={enrollment.id}
        defaultName={enrollment.student.name}
        defaultDni={enrollment.student.dni}
        defaultEmail={enrollment.student.email}
        defaultCareerId={enrollment.careerId}
        careers={careers}
      />
    </div>
  )
}
