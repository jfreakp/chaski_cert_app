'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { toggleUserStatus, deleteUser, sendPasswordReset } from '@/app/actions/users'
import { Pencil, Trash2, KeyRound, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type User = {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
  createdAt: Date
  institution: { name: string; code: string } | null
}

const roleLabel: Record<string, string> = {
  ADMIN: 'Administrador',
  UNIVERSITY: 'Universidad',
}

const roleBadge: Record<string, string> = {
  ADMIN: 'bg-primary-container/15 text-primary-container',
  UNIVERSITY: 'bg-tertiary/10 text-tertiary',
}

function RowActions({ user }: { user: User }) {
  const [pendingToggle, startToggle] = useTransition()
  const [pendingDelete, startDelete] = useTransition()
  const [pendingReset, startReset] = useTransition()

  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        onClick={() => startReset(() => sendPasswordReset(user.id))}
        disabled={pendingReset || !user.isActive}
        title="Enviar reset de contraseña"
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pendingReset ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <KeyRound size={16} strokeWidth={1.75} />}
      </button>

      <Link
        href={`/dashboard/users/${user.id}/edit`}
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all"
        title="Editar usuario"
      >
        <Pencil size={16} strokeWidth={1.75} />
      </Link>

      <button
        onClick={() => startToggle(() => toggleUserStatus(user.id))}
        disabled={pendingToggle}
        title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
        className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-all disabled:opacity-40"
      >
        {pendingToggle ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : user.isActive ? (
          <XCircle size={16} strokeWidth={1.75} className="hover:text-amber-500" />
        ) : (
          <CheckCircle size={16} strokeWidth={1.75} className="hover:text-green-600" />
        )}
      </button>

      <button
        onClick={() => {
          toast.warning(`¿Eliminar permanentemente a ${user.email}?`, {
            action: { label: 'Eliminar', onClick: () => startDelete(() => deleteUser(user.id)) },
            cancel: { label: 'Cancelar', onClick: () => {} },
          })
        }}
        disabled={pendingDelete}
        title="Eliminar usuario"
        className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40"
      >
        {pendingDelete ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
      </button>
    </div>
  )
}

export default function UserTable({ users }: { users: User[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Usuario</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Rol</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Institución</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Creado</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {users.map((user) => {
            const initials = user.name
              ? user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
              : user.email[0].toUpperCase()

            return (
              <tr key={user.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                {/* Usuario */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface truncate">{user.name ?? '—'}</p>
                      <p className="text-xs text-secondary truncate">{user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Rol */}
                <td className="px-6 py-4 hidden md:table-cell">
                  <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${roleBadge[user.role] ?? ''}`}>
                    {roleLabel[user.role] ?? user.role}
                  </span>
                </td>

                {/* Institución */}
                <td className="px-6 py-4 hidden lg:table-cell">
                  {user.institution ? (
                    <div>
                      <p className="text-sm font-medium text-on-surface truncate max-w-[180px]">{user.institution.name}</p>
                      <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider">{user.institution.code}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-outline">—</span>
                  )}
                </td>

                {/* Fecha */}
                <td className="px-6 py-4 text-xs text-secondary hidden lg:table-cell">
                  {new Date(user.createdAt).toLocaleDateString('es-PE', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </td>

                {/* Estado */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-secondary'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>

                {/* Acciones */}
                <td className="px-6 py-4">
                  <RowActions user={user} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
