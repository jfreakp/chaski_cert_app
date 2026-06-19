import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import { CalendarDays, BadgeCheck, Plus, ArrowLeft } from 'lucide-react'
import ParticipantTable from './participant-table'
import CertificateTable from './certificate-table'
import RegisterBlockchainButton from './register-blockchain-button'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proc = await prisma.certificateProcess.findUnique({ where: { id }, select: { name: true } })
  return { title: `${PROJECT_NAME} — ${proc?.name ?? 'Proceso'}` }
}

export default async function ProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session, institutionId } = await requireInstitution()
  const isAdmin = session.role === 'ADMIN'

  const proc = await prisma.certificateProcess.findUnique({
    where: { id },
    include: {
      institution:     { select: { name: true } },
      certificateType: { select: { name: true } },
      participants: {
        include: { student: { select: { name: true, dni: true } } },
        orderBy: { createdAt: 'asc' },
      },
      certificates: {
        include: {
          student: { select: { name: true, dni: true } },
          career:  { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!proc) notFound()
  if (institutionId && proc.institutionId !== institutionId) notFound()

  const certifiedStudentIds = proc.certificates.map(c => c.studentId)
  const pendingCount = proc.participants.filter(p =>
    !certifiedStudentIds.includes(p.studentId)
  ).length
  const issuedCount = proc.certificates.filter(c => c.status === 'ISSUED').length

  const polygonscanBaseUrl = process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === 'polygon'
    ? 'https://polygonscan.com'
    : 'https://amoy.polygonscan.com'

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard/processes" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6">
          <ArrowLeft size={16} strokeWidth={1.75} />
          Volver a Procesos
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
              {proc.institution.name}
            </span>
            <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{proc.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-secondary">
              <span className="flex items-center gap-1.5">
                <BadgeCheck size={14} strokeWidth={1.75} />
                {proc.certificateType.name}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} strokeWidth={1.75} />
                {new Date(proc.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {proc.description && <p className="text-sm text-secondary mt-2">{proc.description}</p>}
          </div>

          {isAdmin && (
            <RegisterBlockchainButton processId={id} issuedCount={issuedCount} />
          )}

          {!isAdmin && (
            <div className="flex gap-3">
              <Link href={`/dashboard/processes/${id}/participants/new`}
                className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-5 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm">
                <Plus size={16} strokeWidth={1.75} />
                Agregar Estudiante
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Participantes</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{proc.participants.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Pendientes</p>
          <p className="text-3xl font-extrabold text-amber-600 tracking-tighter">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Certificados</p>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tighter">{proc.certificates.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">En Blockchain</p>
          <p className="text-3xl font-extrabold text-blue-600 tracking-tighter">{proc.certificates.filter(c => c.status === 'REGISTERED').length}</p>
        </div>
      </div>

      <div className="space-y-8">
        <ParticipantTable
          participants={proc.participants.map(p => ({ id: p.id, studentId: p.studentId, student: p.student }))}
          processId={id}
          isAdmin={isAdmin}
          certifiedIds={certifiedStudentIds}
          pendingCount={pendingCount}
        />
        {proc.certificates.length > 0 && (
          <CertificateTable certificates={proc.certificates} isAdmin={isAdmin} polygonscanBaseUrl={polygonscanBaseUrl} />
        )}
      </div>
    </div>
  )
}
