'use client'

import { useState, useMemo } from 'react'
import { Search, Filter } from 'lucide-react'
import StudentTable from './student-table'

type Enrollment = {
  id: string
  createdAt: Date
  student: { id: string; name: string; dni: string; email: string | null; isActive: boolean }
  institution: { name: string; code: string }
  career: { name: string } | null
}

type Career = { id: string; name: string }

export default function StudentFilters({
  enrollments,
  careers,
  showInstitution,
}: {
  enrollments: Enrollment[]
  careers: Career[]
  showInstitution: boolean
}) {
  const [query, setQuery] = useState('')
  const [careerId, setCareerId] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return enrollments.filter((e) => {
      const matchesQuery =
        !q ||
        e.student.name.toLowerCase().includes(q) ||
        e.student.dni.includes(q) ||
        (e.student.email?.toLowerCase().includes(q) ?? false)

      const matchesCareer =
        !careerId ||
        (careerId === '__none__' ? !e.career : e.career?.name === careers.find((c) => c.id === careerId)?.name)

      return matchesQuery && matchesCareer
    })
  }, [enrollments, query, careerId, careers])

  return (
    <div className="space-y-4">
      {/* Controles de filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, cédula o correo..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-container rounded-lg text-sm font-medium text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary-container outline-none transition-all"
          />
        </div>

        {/* Filtro por carrera */}
        {careers.length > 0 && (
          <div className="relative sm:w-64">
            <Filter size={15} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <select
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-container rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none appearance-none cursor-pointer transition-all"
            >
              <option value="">Todas las carreras</option>
              {careers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="__none__">Sin carrera</option>
            </select>
          </div>
        )}
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-secondary border border-surface-container">
          <Search size={32} strokeWidth={1} className="text-outline/40 mb-2 mx-auto" />
          <p className="text-sm font-medium">Sin resultados para "{query || ''}"</p>
          <button onClick={() => { setQuery(''); setCareerId('') }} className="mt-2 text-xs text-primary-container font-bold hover:underline">
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          {(query || careerId) && (
            <p className="text-xs text-secondary font-medium">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              {query && <> para <span className="font-bold">"{query}"</span></>}
              {careerId && careerId !== '__none__' && <> · {careers.find(c => c.id === careerId)?.name}</>}
              {careerId === '__none__' && <> · Sin carrera</>}
            </p>
          )}
          <StudentTable enrollments={filtered} showInstitution={showInstitution} />
        </>
      )}
    </div>
  )
}
