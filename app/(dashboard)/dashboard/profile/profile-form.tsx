'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/app/actions/auth'
import type { Role } from '@/app/lib/definitions'
import { FileText, Pencil, Lock, Loader2, Save, CheckCircle2 } from 'lucide-react'

type Props = {
  name: string | null
  email: string
  position: string | null
  institution: string | null
  role: Role
  createdAt: Date
}

const roleLabel: Record<Role, string> = {
  ADMIN: 'Administrador Senior',
  UNIVERSITY: 'Universidad',
}

export default function ProfileForm({
  name,
  email,
  position,
  institution,
  role,
  createdAt,
}: Props) {
  const [state, action, pending] = useActionState(updateProfile, undefined)

  const initials = name
    ? name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : email[0].toUpperCase()

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Formulario principal — col 8 */}
      <div className="md:col-span-8">
        <div className="bg-white shadow-[0_20px_40px_rgba(25,28,29,0.04)] p-10 rounded-xl">
          <div className="flex items-center gap-3 mb-10 border-b border-surface-container pb-6">
            <FileText size={20} strokeWidth={1.75} className="text-primary-container" />
            <h3 className="text-xl font-bold tracking-tight">
              Información Personal
            </h3>
          </div>

          <form action={action}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {/* Nombre */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
                  Nombre Completo
                </label>
                <div className="relative group">
                  <input
                    name="name"
                    type="text"
                    defaultValue={name ?? ''}
                    placeholder="Tu nombre completo"
                    className="w-full bg-surface-container-low border-none rounded-sm px-4 py-3 focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all"
                  />
                  <Pencil size={14} strokeWidth={1.75} className="absolute right-3 top-3.5 text-secondary opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                </div>
                {state?.errors?.name && (
                  <p className="text-xs text-error">{state.errors.name[0]}</p>
                )}
              </div>

              {/* Cargo */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
                  Cargo
                </label>
                <div className="relative group">
                  <input
                    name="position"
                    type="text"
                    defaultValue={position ?? ''}
                    placeholder="Ej: Director de Registros Académicos"
                    className="w-full bg-surface-container-low border-none rounded-sm px-4 py-3 focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all"
                  />
                  <Pencil size={14} strokeWidth={1.75} className="absolute right-3 top-3.5 text-secondary opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </div>

              {/* Institución — solo lectura, asignada por el admin */}
              {institution && (
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
                    Institución (Solo Lectura)
                  </label>
                  <div className="flex items-center gap-3 bg-surface-container-highest/30 border border-outline-variant/20 rounded-sm px-4 py-3">
                    <Lock size={14} strokeWidth={1.75} className="text-secondary shrink-0" />
                    <span className="text-secondary font-medium text-sm">{institution}</span>
                  </div>
                </div>
              )}

              {/* Email — solo lectura */}
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
                  Correo Electrónico (Solo Lectura)
                </label>
                <div className="flex items-center gap-3 bg-surface-container-highest/30 border border-outline-variant/20 rounded-sm px-4 py-3">
                  <Lock size={14} strokeWidth={1.75} className="text-secondary shrink-0" />
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-secondary cursor-not-allowed font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Feedback */}
            {state?.message && (
              <div className="mt-6 px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
                {state.message}
              </div>
            )}
            {state?.success && (
              <div className="mt-6 px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} strokeWidth={2} />
                Perfil actualizado correctamente.
              </div>
            )}

            {/* Acciones */}
            <div className="mt-12 flex justify-end items-center gap-6">
              <button
                type="reset"
                className="text-sm font-bold text-secondary hover:text-on-surface transition-colors"
              >
                Descartar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="bg-primary-container hover:bg-primary text-white font-bold py-4 px-10 rounded-lg transition-all shadow-xl shadow-primary-container/10 active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending ? (
                  <>
                    <Loader2 size={18} strokeWidth={2} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} strokeWidth={1.75} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Columna lateral — col 4 */}
      <div className="md:col-span-4 space-y-8">
        {/* Card de acceso */}
        <div className="bg-surface-container-low p-8 rounded-xl border-l-4 border-primary-container">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-white text-xl font-bold">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-surface-container-low rounded-full" />
            </div>
            <div>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                Nivel de Acceso
              </p>
              <p className="text-sm font-bold">{roleLabel[role]}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-secondary">Miembro desde</span>
              <span className="font-bold">
                {new Date(createdAt).toLocaleDateString('es-PE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
              <div
                className="bg-primary-container h-full"
                style={{ width: role === 'ADMIN' ? '100%' : '60%' }}
              />
            </div>
          </div>
        </div>

        {/* Estado de seguridad */}
        <div className="bg-surface-container p-8 rounded-xl">
          <h4 className="text-sm font-bold mb-6 uppercase tracking-tighter">
            Estado de Seguridad
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-medium">Cuenta Activa</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-medium">Sesión JWT Válida</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-xs font-medium">
                Contraseña: actualizar recomendado
              </span>
            </div>
          </div>
          <button className="w-full mt-8 py-3 px-4 border border-outline-variant/30 text-xs font-bold uppercase tracking-widest hover:bg-white transition-all rounded-sm text-secondary">
            Actualizar Credenciales
          </button>
        </div>

        {/* Actividad reciente */}
        <div className="p-4">
          <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-secondary mb-6">
            Actividad Reciente
          </h4>
          <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-surface-container-highest">
            <div className="relative pl-8">
              <div className="absolute left-0 top-1 w-4 h-4 bg-white border-2 border-primary-container rounded-full" />
              <p className="text-xs font-bold">Inicio de Sesión</p>
              <p className="text-[10px] text-secondary">Hoy</p>
            </div>
            <div className="relative pl-8 opacity-60">
              <div className="absolute left-0 top-1 w-4 h-4 bg-white border-2 border-secondary-container rounded-full" />
              <p className="text-xs font-bold">Cuenta Creada</p>
              <p className="text-[10px] text-secondary">
                {new Date(createdAt).toLocaleDateString('es-PE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
