import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EventForm from './event-form'

export const metadata = { title: `${PROJECT_NAME} — Nuevo Evento` }

export default async function NewEventPage() {
  const { session } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard/events')

  const certTypes = await prisma.certificateType.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Eventos</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Nuevo Evento</h1>
        <p className="text-secondary mt-2 text-sm">Registra un evento o ceremonia para emitir certificados.</p>
      </div>
      <EventForm certTypes={certTypes} />
    </div>
  )
}
