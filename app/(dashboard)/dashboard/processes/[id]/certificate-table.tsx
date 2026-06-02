'use client'

import { FileText, Download } from 'lucide-react'

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

export default function CertificateTable({
  certificates,
  isAdmin,
}: {
  certificates: Certificate[]
  isAdmin: boolean
}) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-on-surface tracking-tight flex items-center gap-2 mb-4">
        <FileText size={20} strokeWidth={1.75} />
        Certificados Generados
      </h2>
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
                  <a
                    href={`/api/certificates/${c.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all inline-flex"
                    title="Descargar PDF"
                  >
                    <Download size={16} strokeWidth={1.75} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
