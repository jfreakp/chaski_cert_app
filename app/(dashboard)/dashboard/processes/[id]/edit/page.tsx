import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditProcessForm from './edit-process-form'

export const metadata = { title: `${PROJECT_NAME} — Editar Proceso` }

export default async function EditProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard/processes')

  const { id } = await params

  const [proc, certTypes, careers] = await Promise.all([
    prisma.certificateProcess.findUnique({ where: { id } }),
    prisma.certificateType.findMany({ where: { isActive: true }, select: { id: true, name: true, requiresCareer: true }, orderBy: { name: 'asc' } }),
    prisma.career.findMany({
      where: { institutionId: institutionId!, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!proc) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Procesos</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Editar Proceso</h1>
        <p className="text-secondary mt-2 text-sm">{proc.name}</p>
      </div>
      <EditProcessForm
        processId={proc.id}
        defaultName={proc.name}
        defaultDescription={proc.description}
        defaultDate={proc.date.toISOString().split('T')[0]}
        defaultCertificateTypeId={proc.certificateTypeId}
        defaultCareerId={proc.careerId}
        certTypes={certTypes}
        careers={careers}
      />
    </div>
  )
}
