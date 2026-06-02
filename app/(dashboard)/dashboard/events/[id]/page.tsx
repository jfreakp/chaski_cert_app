import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import { CalendarDays, MapPin, BadgeCheck, Plus, ArrowLeft } from 'lucide-react'
import CertificateTable from './certificate-table'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id }, select: { name: true } })
  return { title: `${PROJECT_NAME} — ${event?.name ?? 'Evento'}` }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session, institutionId } = await requireInstitution()
  const isAdmin = session.role === 'ADMIN'

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      institution: { select: { name: true } },
      certificateType: { select: { name: true } },
      certificates: {
        include: {
          student: { select: { name: true, dni: true } },
          career: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!event) notFound()
  if (institutionId && event.institutionId !== institutionId) notFound()

  const issued     = event.certificates.filter(c => c.status === 'ISSUED').length
  const registered = event.certificates.filter(c => c.status === 'REGISTERED').length

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Volver a Eventos
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
              {event.institution.name}
            </span>
            <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{event.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-secondary">
              <span className="flex items-center gap-1.5">
                <BadgeCheck size={14} strokeWidth={1.75} />
                {event.certificateType.name}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} strokeWidth={1.75} />
                {new Date(event.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} strokeWidth={1.75} />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {!isAdmin && (
            <Link
              href={`/dashboard/events/${id}/certificates/new`}
              className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm"
            >
              <Plus size={18} strokeWidth={1.75} />
              Emitir Certificado
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{event.certificates.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Emitidos</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{issued}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">En Blockchain</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{registered}</p>
        </div>
      </div>

      <CertificateTable certificates={event.certificates} eventId={id} isAdmin={isAdmin} />
    </div>
  )
}
