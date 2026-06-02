import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import ImportForm from './import-form'

export const metadata = { title: `${PROJECT_NAME} — Importar Participantes` }

export default async function ImportParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processId } = await params
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect(`/dashboard/processes/${processId}`)

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { id: true, name: true, institutionId: true },
  })
  if (!proc) notFound()
  if (institutionId && proc.institutionId !== institutionId) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/dashboard/processes/${processId}`}
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6">
          ← Volver al proceso
        </Link>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Importar Participantes</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{proc.name}</h1>
      </div>
      <ImportForm processId={processId} />
    </div>
  )
}
