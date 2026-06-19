'use client'

import { useTransition } from 'react'
import { removeParticipant, generateCertificates } from '@/app/actions/processes'
import { Users, Trash2, Loader2, Award } from 'lucide-react'

type Participant = {
  id: string
  studentId: string
  student: { name: string; dni: string }
}

function RowActions({ participant, isCertified, isAdmin }: { participant: Participant; isCertified: boolean; isAdmin: boolean }) {
  const [pending, startDelete] = useTransition()
  if (isAdmin || isCertified) return null

  return (
    <button
      onClick={() => {
        if (confirm(`¿Quitar a "${participant.student.name}" del proceso?`))
          startDelete(() => removeParticipant(participant.id))
      }}
      disabled={pending}
      className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40"
      title="Quitar"
    >
      {pending ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
    </button>
  )
}

export default function ParticipantTable({
  participants,
  processId,
  isAdmin,
  certifiedIds,
  pendingCount,
}: {
  participants: Participant[]
  processId: string
  isAdmin: boolean
  certifiedIds: string[]
  pendingCount: number
}) {
  const [pendingGen, startGen] = useTransition()
  const certifiedSet = new Set(certifiedIds)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-on-surface tracking-tight flex items-center gap-2">
          <Users size={20} strokeWidth={1.75} />
          Participantes
        </h2>
        {!isAdmin && pendingCount > 0 && (
          <button
            onClick={() => startGen(() => generateCertificates(processId))}
            disabled={pendingGen}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg transition-all text-sm disabled:opacity-60"
          >
            {pendingGen
              ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Generando...</>
              : <><Award size={16} strokeWidth={1.75} />Generar {pendingCount} Certificado{pendingCount !== 1 ? 's' : ''}</>}
          </button>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary border border-surface-container">
          <Users size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
          <p className="text-sm font-medium">No hay participantes en este proceso.</p>
          {!isAdmin && <p className="text-xs mt-1">Usa el botón "Agregar Estudiante" para añadir participantes.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-container bg-surface-container-lowest">
                <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estudiante</th>
                <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">DNI</th>
                <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Certificado</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {participants.map((p) => {
                const hasCert = certifiedSet.has(p.studentId)
                return (
                  <tr key={p.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-on-surface">{p.student.name}</td>
                    <td className="px-6 py-4 text-secondary hidden md:table-cell">{p.student.dni}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${hasCert ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {hasCert ? 'Generado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <RowActions participant={p} isCertified={hasCert} isAdmin={isAdmin} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
