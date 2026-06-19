'use client'

import { useState } from 'react'
import { Building2, Phone, AtSign, Calendar, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import type { AccountRequestModel as AccountRequest } from '@/app/generated/prisma/models'

function MessageCell({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = message.length > 80

  return (
    <div>
      <p className="text-sm text-on-surface">
        {isLong && !expanded ? `${message.slice(0, 80)}…` : message}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-primary-container hover:underline uppercase tracking-wider"
        >
          {expanded ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver más</>}
        </button>
      )}
    </div>
  )
}

export default function RequestsTable({ requests }: { requests: AccountRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary border border-surface-container">
        <MessageSquare size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
        <p className="text-sm font-medium">Sin solicitudes aún.</p>
        <p className="text-xs mt-1">Cuando alguien solicite acceso aparecerá aquí.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Solicitante</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Contacto</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Institución</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Mensaje</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {requests.map((r) => {
            const initials = r.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
            return (
              <tr key={r.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-container text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface truncate">{r.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-secondary">
                      <AtSign size={12} strokeWidth={1.75} />
                      <span className="truncate max-w-[180px]">{r.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-secondary">
                      <Phone size={12} strokeWidth={1.75} />
                      <span>{r.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 text-sm text-on-surface">
                    <Building2 size={14} strokeWidth={1.75} className="text-secondary shrink-0" />
                    <span className="truncate max-w-[180px]">{r.institution}</span>
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <MessageCell message={r.message} />
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 text-xs text-secondary whitespace-nowrap">
                    <Calendar size={12} strokeWidth={1.75} />
                    {new Date(r.createdAt).toLocaleDateString('es-PE', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
