'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import { Role } from '@/app/lib/definitions'
import { ChevronDown, UserCog, LogOut } from 'lucide-react'

type Props = {
  name: string | null
  email: string | undefined
  role: Role
}

const roleLabel: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.ISSUER]: 'Institución Emisora',
}

function getInitials(name: string | null, email: string | undefined) {
  if (name) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  }
  return (email?.[0] ?? '?').toUpperCase()
}

export default function UserDropdown({ name, email, role }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = name ?? email?.split('@')[0] ?? '—'
  const initials = getInitials(name, email)

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-bold text-on-surface leading-tight max-w-[140px] truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-tertiary font-bold uppercase tracking-wider">
            {roleLabel[role]}
          </span>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white border border-surface-container-low rounded-xl shadow-xl shadow-on-surface/5 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 border-b border-surface-container-low">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white font-bold">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-on-surface truncate">{displayName}</p>
                <p className="text-xs text-secondary truncate">{email ?? '—'}</p>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary-container/10 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              <span className="text-[10px] font-bold text-primary-container uppercase tracking-wider">
                {roleLabel[role]}
              </span>
            </div>
          </div>

          {/* Opciones */}
          <div className="py-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <UserCog size={18} strokeWidth={1.75} className="text-secondary" />
              <span className="font-medium">Mi Perfil</span>
            </Link>
          </div>

          {/* Cerrar sesión */}
          <div className="border-t border-surface-container-low py-1">
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-error-container/30 transition-colors"
              >
                <LogOut size={18} strokeWidth={1.75} />
                <span className="font-medium">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
