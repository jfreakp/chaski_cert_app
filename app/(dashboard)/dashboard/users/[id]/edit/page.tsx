import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound } from 'next/navigation'
import { Role } from '@/app/lib/definitions'
import EditUserForm from './edit-user-form'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Editar Usuario` }

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  if (!user) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Usuarios
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
          Editar Usuario
        </h1>
        <p className="text-secondary mt-2 text-sm">{user.email}</p>
      </div>

      <EditUserForm
        userId={user.id}
        defaultName={user.name}
        defaultRole={user.role as Role}
      />
    </div>
  )
}
