import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditEventForm from './edit-event-form'

export const metadata = { title: `${PROJECT_NAME} — Editar Evento` }

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { session } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard/events')

  const { id } = await params
  const [event, certTypes] = await Promise.all([
    prisma.event.findUnique({ where: { id } }),
    prisma.certificateType.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!event) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Eventos</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Editar Evento</h1>
        <p className="text-secondary mt-2 text-sm">{event.name}</p>
      </div>
      <EditEventForm
        eventId={event.id}
        defaultName={event.name}
        defaultDescription={event.description}
        defaultDate={event.date.toISOString().split('T')[0]}
        defaultLocation={event.location}
        defaultCertificateTypeId={event.certificateTypeId}
        certTypes={certTypes}
      />
    </div>
  )
}
