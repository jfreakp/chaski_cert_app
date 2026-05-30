import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import UserForm from './user-form'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Nuevo Usuario` }

export default async function NewUserPage() {
  await requireAdmin()

  const institutions = await prisma.institution.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Administración · Usuarios
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
          Nuevo Usuario
        </h1>
        <p className="text-secondary mt-2 text-sm leading-relaxed">
          Se enviará un correo de activación para que el usuario establezca su contraseña.
        </p>
      </div>

      <UserForm institutions={institutions} />
    </div>
  )
}
