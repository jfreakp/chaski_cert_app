import Link from 'next/link'
import { requireStudentSession } from '@/app/lib/student-session'
import { getMyCertificates } from '@/app/actions/student-portal'
import { PROJECT_NAME } from '@/app/lib/config'
import { FileText, Download, ShieldCheck, BadgeCheck, GraduationCap } from 'lucide-react'
import CopyLinkButton from './copy-link-button'

export const metadata = { title: `${PROJECT_NAME} — Mis Certificados` }

const statusStyles = {
  ISSUED:     'bg-emerald-50 text-emerald-700',
  REGISTERED: 'bg-blue-50 text-blue-700',
}
const statusLabels = {
  ISSUED:     'Emitido',
  REGISTERED: 'En Blockchain',
}

export default async function PortalPage() {
  const session = await requireStudentSession()
  const certificates = await getMyCertificates()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">
          Portal Estudiante
        </p>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
          Mis Certificados
        </h1>
        <p className="text-sm text-secondary mt-1">
          Bienvenido, <span className="font-semibold text-on-surface">{session.name}</span>
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-container p-12 text-center">
          <GraduationCap size={40} strokeWidth={1} className="text-outline/40 mx-auto mb-4" />
          <p className="font-semibold text-on-surface">Aún no tenés certificados emitidos</p>
          <p className="text-sm text-secondary mt-1">Cuando tu institución emita un certificado, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => {
            const status = cert.status as 'ISSUED' | 'REGISTERED'
            const verifyUrl = `${appUrl}/verify/${cert.id}`
            return (
              <div
                key={cert.id}
                className="bg-white rounded-xl border border-surface-container p-6 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusStyles[status]}`}>
                      {status === 'REGISTERED'
                        ? <ShieldCheck size={10} strokeWidth={2.5} />
                        : <BadgeCheck size={10} strokeWidth={2.5} />}
                      {statusLabels[status]}
                    </span>
                  </div>
                  <p className="font-extrabold text-on-surface tracking-tight">
                    {cert.process.certificateType.name}
                  </p>
                  <p className="text-sm text-secondary mt-0.5">
                    {cert.process.name} · {cert.process.institution.name}
                  </p>
                  {cert.career && (
                    <p className="text-xs text-secondary mt-0.5">{cert.career.name}</p>
                  )}
                  {cert.issuedAt && (
                    <p className="text-xs text-outline mt-1">
                      Emitido el {new Date(cert.issuedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <CopyLinkButton url={verifyUrl} />
                  <a
                    href={`/api/certificates/${cert.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-primary-container hover:bg-primary text-white font-bold py-2 px-4 rounded-lg transition-colors text-xs"
                  >
                    <Download size={12} strokeWidth={2} />
                    Descargar PDF
                  </a>
                  {cert.process.templateKey && (
                    <a
                      href={`/api/certificates/${cert.id}/pdf?type=custom`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 border border-primary-container text-primary-container hover:bg-primary-container/5 font-bold py-2 px-4 rounded-lg transition-colors text-xs"
                    >
                      <FileText size={12} strokeWidth={2} />
                      Con plantilla
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/portal/profile" className="text-xs text-secondary hover:text-on-surface transition-colors">
          <FileText size={12} strokeWidth={1.75} className="inline mr-1" />
          Ver mis datos personales
        </Link>
      </div>
    </div>
  )
}
