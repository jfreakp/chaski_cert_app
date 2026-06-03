'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

const ACTION_OPTIONS = [
  { value: 'CERTIFICATES_ISSUED',   label: 'Emisión de certificados' },
  { value: 'BLOCKCHAIN_REGISTERED', label: 'Registro en Blockchain' },
  { value: 'STUDENT_CREATED',       label: 'Estudiante creado' },
  { value: 'STUDENT_UPDATED',       label: 'Estudiante editado' },
  { value: 'USER_LOGIN',            label: 'Login' },
]

interface Props {
  defaultValues: {
    from: string
    to: string
    action: string
    user: string
  }
}

export default function AuditFilters({ defaultValues }: Props) {
  const router = useRouter()
  const [from,   setFrom]   = useState(defaultValues.from)
  const [to,     setTo]     = useState(defaultValues.to)
  const [action, setAction] = useState(defaultValues.action)
  const [user,   setUser]   = useState(defaultValues.user)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams({ from, to, action, page: '1' })
    if (user.trim()) params.set('user', user.trim())
    router.push(`/dashboard/audit?${params.toString()}`)
  }

  function handleClear() {
    setFrom('')
    setTo('')
    setAction('')
    setUser('')
    router.push('/dashboard/audit')
  }

  const inputClass = 'w-full px-3 py-2.5 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none text-sm font-medium text-on-surface transition-all'
  const labelClass = 'text-[10px] font-extrabold uppercase tracking-widest text-secondary mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-container p-6 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fecha desde */}
        <div>
          <label className={labelClass}>Desde *</label>
          <input
            type="date"
            required
            value={from}
            onChange={e => setFrom(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Fecha hasta */}
        <div>
          <label className={labelClass}>Hasta *</label>
          <input
            type="date"
            required
            value={to}
            onChange={e => setTo(e.target.value)}
            min={from || undefined}
            className={inputClass}
          />
        </div>

        {/* Acción */}
        <div>
          <label className={labelClass}>Acción *</label>
          <select
            required
            value={action}
            onChange={e => setAction(e.target.value)}
            className={`${inputClass} appearance-none cursor-pointer`}
          >
            <option value="" disabled>Seleccioná una acción</option>
            {ACTION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Usuario */}
        <div>
          <label className={labelClass}>Usuario</label>
          <input
            type="text"
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="Nombre o email"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-2.5 px-5 rounded-lg transition-all text-sm"
        >
          <Search size={14} strokeWidth={2} />
          Buscar
        </button>
        {(from || to || action || user) && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:text-error transition-colors"
          >
            <X size={14} strokeWidth={2} />
            Limpiar
          </button>
        )}
      </div>
    </form>
  )
}
