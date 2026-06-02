'use client'

import { useTransition } from 'react'
import { deleteCertificate } from '@/app/actions/certificates'
import { FileText, Trash2, Download, Loader2 } from 'lucide-react'

type Certificate = {
  id: string
  status: 'PENDING' | 'ISSUED' | 'REGISTERED'
  issuedAt: Date | null
  student: { name: string; dni: string }
  career: { name: string } | null
}

const statusStyles: Record<Certificate['status'], string> = {
  PENDING:    'bg-amber-50 text-amber-700',
  ISSUED:     'bg-emerald-50 text-emerald-700',
  REGISTERED: 'bg-blue-50 text-blue-700',
}
const statusLabels: Record<Certificate['status'], string> = {
  PENDING:    'Pendiente',
  ISSUED:     'Emitido',
  REGISTERED: 'En Blockchain',
}

function RowActions({ cert, isAdmin }: { cert: Certificate; isAdmin: boolean }) {
  const [pendingDelete, startDelete] = useTransition()

  return (
    <div className="flex items-center gap-1 justify-end">
      <a
        href={`/api/certificates/${cert.id}/pdf`}
        target="_blank"
        rel="noreferrer"
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all"
        title="Descargar PDF"
      >
        <Download size={16} strokeWidth={1.75} />
      </a>
      {!isAdmin && cert.status !== 'REGISTERED' && (
        <button
          onClick={() => {
            if (confirm(`¿Eliminar certificado de "${cert.student.name}"?`))
              startDelete(() => deleteCertificate(cert.id))
          }}
          disabled={pendingDelete}
          className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40"
          title="Eliminar"
        >
          {pendingDelete
            ? <Loader2 size={16} strokeWidth={2} className="animate-spin" />
            : <Trash2 size={16} strokeWidth={1.75} />}
        </button>
      )}
    </div>
  )
}

export default function CertificateTable({
  certificates,
  eventId,
  isAdmin,
}: {
  certificates: Certificate[]
  eventId: string
  isAdmin: boolean
}) {
  if (certificates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary border border-surface-container">
        <FileText size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
        <p className="text-sm font-medium">No hay certificados emitidos aún.</p>
        {!isAdmin && <p className="text-xs mt-1">Usa el botón "Emitir Certificado" para añadir estudiantes.</p>}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estudiante</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Carrera</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Fecha emisión</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {certificates.map((c) => (
            <tr key={c.id} className="hover:bg-surface-container-lowest/50 transition-colors">
              <td className="px-6 py-4">
                <p className="font-semibold text-on-surface">{c.student.name}</p>
                <p className="text-xs text-secondary mt-0.5">{c.student.dni}</p>
              </td>
              <td className="px-6 py-4 text-sm text-secondary hidden md:table-cell">
                {c.career?.name ?? <span className="text-outline/60 italic">Sin carrera</span>}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusStyles[c.status]}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {statusLabels[c.status]}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell">
                {c.issuedAt
                  ? new Date(c.issuedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </td>
              <td className="px-6 py-4">
                <RowActions cert={c} isAdmin={isAdmin} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
