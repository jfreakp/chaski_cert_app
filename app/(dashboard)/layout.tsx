import Link from 'next/link'
import { getCurrentUser } from '@/app/lib/dal'
import { Role } from '@/app/lib/definitions'
import { PROJECT_NAME } from '@/app/lib/config'
import {
  LayoutDashboard,
  GraduationCap,
  Cpu,
  Settings,
  Bell,
  Users,
} from 'lucide-react'
import UserDropdown from './components/user-dropdown'

const navLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    href: '/dashboard/students',
    icon: GraduationCap,
    label: 'Estudiantes',
    roles: [Role.ADMIN, Role.ISSUER],
  },
  {
    href: '/dashboard/processes',
    icon: Cpu,
    label: 'Procesos',
    roles: [Role.ADMIN, Role.ISSUER],
  },
  {
    href: '/dashboard/users',
    icon: Users,
    label: 'Usuarios',
    roles: [Role.ADMIN],
  },
  {
    href: '/dashboard/settings',
    icon: Settings,
    label: 'Configuración',
    roles: [Role.ADMIN],
  },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  const visibleLinks = navLinks.filter(
    (link) => !link.roles || (user && link.roles.includes(user.role))
  )

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase()

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? '—'

  return (
    <div className="min-h-screen bg-surface-container-lowest">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r border-surface-container-low z-40">
        {/* Logo */}
        <div className="px-8 py-8">
          <p className="text-lg font-black tracking-tighter text-primary-container uppercase">
            {PROJECT_NAME}
          </p>
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.2em] mt-0.5">
            {user?.role === Role.ADMIN ? 'Admin Panel' : 'Academic Ledger'}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-4">
          {visibleLinks.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all"
            >
              <Icon size={20} strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Usuario al fondo */}
        <div className="px-4 py-6">
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-xl">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{displayName}</p>
              <p className="text-[10px] text-tertiary uppercase tracking-wider font-bold">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Header ── */}
      <header className="fixed top-0 right-0 left-0 md:left-64 z-30 bg-white border-b border-surface-container-low flex items-center justify-between px-6 h-16">
        <p className="text-lg font-black tracking-tighter text-on-surface md:hidden">
          {PROJECT_NAME}
        </p>

        <div className="flex items-center gap-2 ml-auto">
          <button className="p-2 text-secondary hover:bg-surface-container rounded-full transition-colors">
            <Bell size={20} strokeWidth={1.75} />
          </button>

          {user && (
            <UserDropdown
              name={user.name ?? null}
              email={user.email ?? undefined}
              role={user.role}
            />
          )}
        </div>
      </header>

      {/* ── Contenido ── */}
      <main className="md:ml-64 pt-16 min-h-screen">
        {children}
      </main>
    </div>
  )
}
