import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound } from 'next/navigation'
import { Role } from '@/app/lib/definitions'
import { ShieldCheck } from 'lucide-react'
import ProfileForm from './profile-form'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Mi Perfil` }

export default async function ProfilePage() {
  const session = await verifySession()

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      position: true,
      isActive: true,
      createdAt: true,
      institution: { select: { name: true } },
    },
  })

  if (!user) notFound()

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrador Senior',
    UNIVERSITY: 'Universidad',
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header editorial */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
        <div className="max-w-xl">
          <span className="inline-block px-3 py-1 bg-primary-container text-white text-[10px] font-bold tracking-[0.1em] rounded-sm mb-4 uppercase">
            Cuenta Soberana
          </span>
          <h1 className="text-6xl font-extrabold tracking-tighter text-on-surface mb-4">
            Mi Perfil
          </h1>
          <p className="text-secondary text-lg leading-relaxed font-light">
            Gestiona tu identidad digital y los parámetros de seguridad de tu
            cuenta en la red de {PROJECT_NAME}. Todos los cambios son auditados.
          </p>
        </div>

        {/* Card de resumen */}
        <div className="bg-surface-container-low p-8 rounded-xl min-w-[280px] border-l-4 border-primary-container shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-white text-xl font-bold">
                {user.name
                  ? user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
                  : user.email[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-surface-container-low rounded-full" />
            </div>
            <div>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                Último Acceso
              </p>
              <p className="text-sm font-medium">Hoy</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-secondary">Nivel de Acceso</span>
              <span className="font-bold">{roleLabel[user.role]}</span>
            </div>
            {user.institution && (
              <div className="flex justify-between text-xs">
                <span className="text-secondary">Institución</span>
                <span className="font-bold text-right max-w-[160px] truncate">{user.institution.name}</span>
              </div>
            )}
            <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
              <div
                className="bg-primary-container h-full"
                style={{ width: user.role === 'ADMIN' ? '100%' : '60%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <ProfileForm
        name={user.name}
        email={user.email}
        position={user.position}
        institution={user.institution?.name ?? null}
        role={user.role as Role}
        createdAt={user.createdAt}
      />

      {/* Footer */}
      <footer className="mt-24 pt-12 border-t border-surface-container flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-surface-container-highest rounded-sm flex items-center justify-center">
            <ShieldCheck size={16} strokeWidth={1.75} className="text-secondary" />
          </div>
          <p className="text-[10px] text-secondary max-w-[200px] leading-tight">
            Su identidad está respaldada por una red de nodos validadores
            descentralizados.
          </p>
        </div>
        <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-secondary">
          <a href="#" className="hover:text-primary-container transition-colors">
            Términos de Nodo
          </a>
          <a href="#" className="hover:text-primary-container transition-colors">
            Protocolo de Privacidad
          </a>
          <a href="#" className="hover:text-primary-container transition-colors">
            Soporte Chaski
          </a>
        </div>
      </footer>
    </div>
  )
}
