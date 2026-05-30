'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useActionState } from 'react'
import { createUser } from '@/app/actions/users'
import { AtSign, User, Shield, Building2, Loader2, Save, CheckCircle2 } from 'lucide-react'

type Institution = { id: string; name: string; code: string }

export default function UserForm({ institutions }: { institutions: Institution[] }) {
  const [state, action, pending] = useActionState(createUser, undefined)
  const [role, setRole] = useState('UNIVERSITY')

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        {/* Email */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Correo Electrónico *
          </label>
          <div className="relative group">
            <AtSign size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              name="email"
              type="email"
              placeholder="nombre@institucion.edu"
              required
              autoComplete="off"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all"
            />
          </div>
          {state?.errors?.email && <p className="text-xs text-error">{state.errors.email[0]}</p>}
        </div>

        {/* Nombre */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Nombre Completo
          </label>
          <div className="relative group">
            <User size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              name="name"
              type="text"
              placeholder="Nombre completo (opcional)"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all"
            />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        {/* Rol */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Rol *
          </label>
          <div className="relative">
            <Shield size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <select
              name="role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer"
            >
              <option value="UNIVERSITY">Universidad</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          {state?.errors?.role && <p className="text-xs text-error">{state.errors.role[0]}</p>}
        </div>

        {/* Institución — solo si rol es UNIVERSITY */}
        {role === 'UNIVERSITY' && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
              Institución *
            </label>
            <div className="relative">
              <Building2 size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              <select
                name="institutionId"
                required
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecciona una institución...</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code})
                  </option>
                ))}
              </select>
            </div>
            {state?.errors?.institutionId && (
              <p className="text-xs text-error">{state.errors.institutionId[0]}</p>
            )}
            {institutions.length === 0 && (
              <p className="text-xs text-amber-600">
                No hay instituciones activas. Crea una primero en Administración → Instituciones.
              </p>
            )}
          </div>
        )}

        {/* Feedback */}
        {state?.message && !state.success && (
          <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
            {state.message}
          </div>
        )}
        {state?.success && (
          <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} strokeWidth={2} />
            {state.message ?? 'Usuario creado y correo de activación enviado.'}
          </div>
        )}

        <p className="text-xs text-secondary leading-relaxed">
          El usuario recibirá un correo con un enlace de activación válido por 24 horas.
        </p>

        {/* Acciones */}
        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/users" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {pending ? (
              <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Creando...</>
            ) : (
              <><Save size={16} strokeWidth={1.75} />Crear Usuario</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
