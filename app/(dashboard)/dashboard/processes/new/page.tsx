import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import ProcessForm from './process-form'

export const metadata = { title: `${PROJECT_NAME} — Nuevo Proceso` }

export default async function NewProcessPage() {
  const { session } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard/processes')

  const { institutionId } = await requireInstitution()

  const [certTypes, careers] = await Promise.all([
    prisma.certificateType.findMany({
      where: { isActive: true },
      select: { id: true, name: true, requiresCareer: true },
      orderBy: { name: 'asc' },
    }),
    prisma.career.findMany({
      where: { institutionId: institutionId!, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Procesos</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Nuevo Proceso</h1>
        <p className="text-secondary mt-2 text-sm">Crea un proceso de certificación y agrega los estudiantes participantes.</p>
      </div>
      <ProcessForm certTypes={certTypes} careers={careers} />
    </div>
  )
}
