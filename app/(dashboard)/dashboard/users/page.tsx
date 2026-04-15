import Link from 'next/link'
import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { Users, UserPlus } from 'lucide-react'
import UserTable from './user-table'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Usuarios` }

export default async function UsersPage() {
  await requireAdmin()

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
            Administración
          </span>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
            Usuarios
          </h1>
          <p className="text-secondary mt-2">
            Gestiona los accesos a la plataforma {PROJECT_NAME}.
          </p>
        </div>

        <Link
          href="/dashboard/users/new"
          className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm"
        >
          <UserPlus size={18} strokeWidth={1.75} />
          Nuevo Usuario
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Activos</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Admins</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">
            {users.filter((u) => u.role === 'ADMIN').length}
          </p>
        </div>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary">
          <Users size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
          <p className="text-sm font-medium">No hay usuarios registrados.</p>
        </div>
      ) : (
        <UserTable users={users} />
      )}
    </div>
  )
}
