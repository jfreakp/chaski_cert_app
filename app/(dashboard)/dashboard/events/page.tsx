import Link from 'next/link'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { CalendarDays, Plus } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'
import EventTable from './event-table'

export const metadata = { title: `${PROJECT_NAME} — Eventos` }

export default async function EventsPage() {
  const { session, institutionId } = await requireInstitution()
  const isAdmin = session.role === 'ADMIN'

  const events = await prisma.event.findMany({
    where: institutionId ? { institutionId } : undefined,
    select: {
      id: true,
      name: true,
      date: true,
      location: true,
      isActive: true,
      institution: { select: { name: true, code: true } },
      certificateType: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Eventos</span>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Eventos y Ceremonias</h1>
          <p className="text-secondary mt-2">
            {isAdmin ? 'Todos los eventos registrados.' : 'Eventos de tu institución para emisión de certificados.'}
          </p>
        </div>
        {!isAdmin && (
          <Link href="/dashboard/events/new"
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm">
            <Plus size={18} strokeWidth={1.75} />
            Nuevo Evento
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{events.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Activos</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{events.filter(e => e.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Este año</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">
            {events.filter(e => new Date(e.date).getFullYear() === new Date().getFullYear()).length}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary">
          <CalendarDays size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
          <p className="text-sm font-medium">No hay eventos registrados.</p>
          {!isAdmin && <p className="text-xs mt-1">Crea un evento para poder emitir certificados.</p>}
        </div>
      ) : (
        <EventTable events={events} showInstitution={isAdmin} isAdmin={isAdmin} />
      )}
    </div>
  )
}
