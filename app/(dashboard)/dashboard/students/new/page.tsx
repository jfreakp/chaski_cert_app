import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import StudentForm from './student-form'

export const metadata = { title: `${PROJECT_NAME} — Nuevo Estudiante` }

export default async function NewStudentPage() {
  const { session, institutionId } = await requireInstitution()
  if (session.role === 'ADMIN') redirect('/dashboard/students')

  const careers = institutionId
    ? await prisma.career.findMany({
        where: { institutionId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Estudiantes
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
          Nuevo Estudiante
        </h1>
        <p className="text-secondary mt-2 text-sm">
          Registra un estudiante en tu institución.
        </p>
      </div>
      <StudentForm careers={careers} />
    </div>
  )
}
