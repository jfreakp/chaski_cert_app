'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, BookOpen } from 'lucide-react'

type Career = { id: string; name: string }

export default function StudentPickerFilters({
  processId,
  initialQ,
  initialCareer,
  careers,
  fixedCareerName,
}: {
  processId: string
  initialQ: string
  initialCareer: string
  careers: Career[]
  fixedCareerName: string | null
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialQ)
  const [careerId, setCareerId] = useState(initialCareer)

  function pushURL(newQ: string, newCareer: string) {
    const params = new URLSearchParams()
    if (newQ.trim()) params.set('q', newQ.trim())
    if (newCareer) params.set('career', newCareer)
    const qs = params.toString()
    router.push(`/dashboard/processes/${processId}/participants/new${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); pushURL(e.target.value, careerId) }}
          placeholder="Buscar por nombre o cédula..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-container rounded-lg text-sm font-medium text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary-container outline-none transition-all"
        />
      </div>

      {fixedCareerName ? (
        <div className="sm:w-64 flex items-center gap-2 px-4 py-2.5 bg-surface-container-low rounded-lg border border-transparent">
          <BookOpen size={15} strokeWidth={1.75} className="text-secondary shrink-0" />
          <span className="text-sm font-medium text-on-surface truncate">{fixedCareerName}</span>
        </div>
      ) : (
        <div className="relative sm:w-64">
          <Filter size={15} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          <select
            value={careerId}
            onChange={(e) => { setCareerId(e.target.value); pushURL(q, e.target.value) }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-container rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="">Todas las carreras</option>
            {careers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
