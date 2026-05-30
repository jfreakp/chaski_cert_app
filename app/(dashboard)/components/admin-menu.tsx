'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Users, Building2, ChevronDown } from 'lucide-react'

const adminLinks = [
  { href: '/dashboard/institutions', icon: Building2, label: 'Instituciones' },
  { href: '/dashboard/users', icon: Users, label: 'Usuarios' },
]

export default function AdminMenu() {
  const [open, setOpen] = useState(true)

  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all w-full"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} strokeWidth={1.75} />
          <span>Administración</span>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-0.5 pl-6">
          {adminLinks.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all"
            >
              <Icon size={17} strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
