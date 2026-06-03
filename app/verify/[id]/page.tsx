import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import { BadgeCheck, ShieldCheck, Clock, ExternalLink, AlertTriangle } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: { student: { select: { name: true } } },
  })
  if (!cert) return { title: `${PROJECT_NAME} — Certificado no encontrado` }
  return { title: `${PROJECT_NAME} — Verificar certificado de ${cert.student.name}` }
}

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, dni: true } },
      career:  { select: { name: true } },
      process: {
        include: {
          institution:     { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
    },
  })

  const isAmoy = process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK !== 'polygon'
  const polygonscanBase = isAmoy ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com'

  if (!cert) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-surface-container p-12 max-w-md text-center">
          <AlertTriangle size={40} strokeWidth={1} className="text-outline/40 mb-4 mx-auto" />
          <h1 className="text-xl font-extrabold text-on-surface">Certificado no encontrado</h1>
          <p className="text-sm text-secondary mt-2">El ID proporcionado no corresponde a ningún certificado.</p>
        </div>
      </div>
    )
  }

  if (cert.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-surface-container p-12 max-w-md text-center">
          <AlertTriangle size={40} strokeWidth={1} className="text-outline/40 mb-4 mx-auto" />
          <h1 className="text-xl font-extrabold text-on-surface">Certificado pendiente</h1>
          <p className="text-sm text-secondary mt-2">Este certificado aún no ha sido emitido oficialmente.</p>
        </div>
      </div>
    )
  }

  const isRegistered = cert.status === 'REGISTERED'

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-surface-container p-10 max-w-xl w-full">

        <div className="flex items-center gap-3 mb-8">
          <div className={`p-3 rounded-xl ${isRegistered ? 'bg-blue-50' : 'bg-emerald-50'}`}>
            {isRegistered
              ? <ShieldCheck size={24} strokeWidth={1.75} className="text-blue-600" />
              : <BadgeCheck size={24} strokeWidth={1.75} className="text-emerald-600" />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{PROJECT_NAME}</p>
            <h1 className="text-xl font-extrabold text-on-surface tracking-tight">
              {isRegistered ? 'Certificado verificado en Blockchain' : 'Certificado emitido'}
            </h1>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <Row label="Estudiante" value={cert.student.name} />
          <Row label="DNI" value={cert.student.dni} />
          <Row label="Institución" value={cert.process.institution.name} />
          <Row label="Tipo" value={cert.process.certificateType.name} />
          <Row label="Proceso" value={cert.process.name} />
          {cert.career && <Row label="Carrera" value={cert.career.name} />}
          <Row label="Fecha" value={new Date(cert.process.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })} />
          {cert.issuedAt && <Row label="Emitido el" value={new Date(cert.issuedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })} />}
        </div>

        {isRegistered && cert.txHash ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
              <ShieldCheck size={16} strokeWidth={2} />
              Registrado en Polygon
            </div>
            {cert.registeredAt && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Clock size={12} strokeWidth={2} />
                {new Date(cert.registeredAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            <a
              href={`${polygonscanBase}/tx/${cert.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline break-all"
            >
              <ExternalLink size={12} strokeWidth={2} />
              Ver transacción en Polygonscan
            </a>
            <p className="text-[10px] text-blue-500 font-mono break-all">{cert.txHash}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700 font-medium">
              Este certificado ha sido emitido oficialmente. El registro en blockchain está pendiente.
            </p>
          </div>
        )}

        <p className="text-[10px] text-secondary mt-6 text-center">ID: {cert.id}</p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-surface-container last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary shrink-0">{label}</span>
      <span className="text-sm font-semibold text-on-surface text-right">{value}</span>
    </div>
  )
}
