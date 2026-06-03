# Filtros de Auditoría — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar formulario de búsqueda a `/dashboard/audit` con filtros de rango de fecha y acción (requeridos) y usuario (opcional), donde la tabla no carga hasta que se apliquen los filtros.

**Architecture:** Client Component `AuditFilters` maneja el formulario y pushea los params a la URL vía `useRouter`. El Server Component `page.tsx` lee esos params, construye el `where` de Prisma y muestra estado vacío si no hay filtros activos. Paginación preserva los params del filtro.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Tailwind CSS 4, lucide-react.

> **Nota:** El usuario gestiona los commits. No ejecutar `git add` ni `git commit`.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `app/(dashboard)/dashboard/audit/audit-filters.tsx` |
| Modificar | `app/(dashboard)/dashboard/audit/page.tsx` |

---

## Task 1: Crear AuditFilters Client Component

**Files:**
- Create: `app/(dashboard)/dashboard/audit/audit-filters.tsx`

- [ ] **Paso 1: Crear el archivo**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

const ACTION_OPTIONS = [
  { value: 'CERTIFICATES_ISSUED',   label: 'Emisión de certificados' },
  { value: 'BLOCKCHAIN_REGISTERED', label: 'Registro en Blockchain' },
  { value: 'STUDENT_CREATED',       label: 'Estudiante creado' },
  { value: 'STUDENT_UPDATED',       label: 'Estudiante editado' },
  { value: 'USER_LOGIN',            label: 'Login' },
]

interface Props {
  defaultValues: {
    from: string
    to: string
    action: string
    user: string
  }
}

export default function AuditFilters({ defaultValues }: Props) {
  const router = useRouter()
  const [from,   setFrom]   = useState(defaultValues.from)
  const [to,     setTo]     = useState(defaultValues.to)
  const [action, setAction] = useState(defaultValues.action)
  const [user,   setUser]   = useState(defaultValues.user)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams({ from, to, action, page: '1' })
    if (user.trim()) params.set('user', user.trim())
    router.push(`/dashboard/audit?${params.toString()}`)
  }

  function handleClear() {
    setFrom('')
    setTo('')
    setAction('')
    setUser('')
    router.push('/dashboard/audit')
  }

  const inputClass = 'w-full px-3 py-2.5 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none text-sm font-medium text-on-surface transition-all'
  const labelClass = 'text-[10px] font-extrabold uppercase tracking-widest text-secondary mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-container p-6 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fecha desde */}
        <div>
          <label className={labelClass}>Desde *</label>
          <input
            type="date"
            required
            value={from}
            onChange={e => setFrom(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Fecha hasta */}
        <div>
          <label className={labelClass}>Hasta *</label>
          <input
            type="date"
            required
            value={to}
            onChange={e => setTo(e.target.value)}
            min={from || undefined}
            className={inputClass}
          />
        </div>

        {/* Acción */}
        <div>
          <label className={labelClass}>Acción *</label>
          <select
            required
            value={action}
            onChange={e => setAction(e.target.value)}
            className={`${inputClass} appearance-none cursor-pointer`}
          >
            <option value="" disabled>Seleccioná una acción</option>
            {ACTION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Usuario */}
        <div>
          <label className={labelClass}>Usuario</label>
          <input
            type="text"
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="Nombre o email"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-2.5 px-5 rounded-lg transition-all text-sm"
        >
          <Search size={14} strokeWidth={2} />
          Buscar
        </button>
        {(from || to || action || user) && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:text-error transition-colors"
          >
            <X size={14} strokeWidth={2} />
            Limpiar
          </button>
        )}
      </div>
    </form>
  )
}
```

- [ ] **Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "audit-filters" | head -5
```

Salida esperada: sin errores.

---

## Task 2: Actualizar page.tsx con filtros y estado vacío

**Files:**
- Modify: `app/(dashboard)/dashboard/audit/page.tsx`

- [ ] **Paso 1: Reemplazar el contenido completo de page.tsx**

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'
import { PROJECT_NAME } from '@/app/lib/config'
import { ScrollText, Search } from 'lucide-react'
import AuditFilters from './audit-filters'

export const metadata = { title: `${PROJECT_NAME} — Auditoría` }

const PAGE_SIZE = 50

const actionLabels: Record<string, string> = {
  CERTIFICATES_ISSUED:   'Emisión',
  BLOCKCHAIN_REGISTERED: 'Blockchain',
  STUDENT_CREATED:       'Estudiante creado',
  STUDENT_UPDATED:       'Estudiante editado',
  USER_LOGIN:            'Login',
}

const actionColors: Record<string, string> = {
  CERTIFICATES_ISSUED:   'bg-emerald-50 text-emerald-700',
  BLOCKCHAIN_REGISTERED: 'bg-blue-50 text-blue-700',
  STUDENT_CREATED:       'bg-amber-50 text-amber-700',
  STUDENT_UPDATED:       'bg-orange-50 text-orange-700',
  USER_LOGIN:            'bg-surface-container text-secondary',
}

function formatDetails(action: string, metadata: unknown): string {
  const m = metadata as Record<string, unknown> | null
  if (!m) return '—'
  switch (action) {
    case 'CERTIFICATES_ISSUED':
      return `${m.count} certificado(s) — ${m.processName}`
    case 'BLOCKCHAIN_REGISTERED':
      return `${String(m.txHash).slice(0, 10)}… — ${m.count} cert(s)`
    case 'STUDENT_CREATED':
    case 'STUDENT_UPDATED':
      return `${m.studentName} (DNI: ${m.studentDni})`
    case 'USER_LOGIN':
      return `${m.email}`
    default:
      return '—'
  }
}

function buildPaginationUrl(page: number, from: string, to: string, action: string, user: string) {
  const params = new URLSearchParams({ from, to, action, page: String(page) })
  if (user) params.set('user', user)
  return `/dashboard/audit?${params.toString()}`
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; action?: string; user?: string; page?: string }>
}) {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'ADMIN') redirect('/dashboard')

  const { from = '', to = '', action = '', user: userFilter = '', page: pageParam = '1' } = await searchParams

  const hasFilters = !!(from && to && action)
  const page  = Math.max(1, parseInt(pageParam, 10))
  const skip  = (page - 1) * PAGE_SIZE

  let logs: Awaited<ReturnType<typeof prisma.auditLog.findMany>> = []
  let total = 0

  if (hasFilters) {
    const where: Prisma.AuditLogWhereInput = {
      createdAt: {
        gte: new Date(from),
        lte: new Date(`${to}T23:59:59.999Z`),
      },
      action,
      ...(userFilter ? {
        user: {
          OR: [
            { name: { contains: userFilter, mode: 'insensitive' } },
            { email: { contains: userFilter, mode: 'insensitive' } },
          ],
        },
      } : {}),
    }

    ;[logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ])
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Administración
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter flex items-center gap-3">
          <ScrollText size={32} strokeWidth={1.5} />
          Auditoría
        </h1>
      </div>

      <AuditFilters defaultValues={{ from, to, action, user: userFilter }} />

      {!hasFilters ? (
        <div className="bg-white rounded-xl border border-surface-container p-12 text-center">
          <Search size={36} strokeWidth={1} className="text-outline/40 mx-auto mb-4" />
          <p className="font-semibold text-on-surface">Aplicá los filtros para ver resultados</p>
          <p className="text-sm text-secondary mt-1">
            Seleccioná un rango de fecha y una acción, luego hacé click en Buscar.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-secondary mb-4">
            {total} resultado(s) encontrado(s)
          </p>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-lowest">
                  <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Fecha</th>
                  <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Acción</th>
                  <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Usuario</th>
                  <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-secondary">
                      No hay resultados para los filtros aplicados.
                    </td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="px-6 py-4 text-xs text-secondary whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('es-PE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${actionColors[log.action] ?? 'bg-surface-container text-secondary'}`}>
                        {actionLabels[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary hidden md:table-cell">
                      {log.user?.name ?? log.user?.email ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell font-mono text-xs">
                      {formatDetails(log.action, log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-secondary">
                Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={buildPaginationUrl(page - 1, from, to, action, userFilter)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-bold text-secondary hover:text-on-surface bg-white border border-surface-container rounded-lg transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildPaginationUrl(page + 1, from, to, action, userFilter)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-bold text-secondary hover:text-on-surface bg-white border border-surface-container rounded-lg transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Salida esperada: sin errores.

---

## Verificación manual

- [ ] `pnpm dev`
- [ ] Ir a `/dashboard/audit` → muestra formulario + estado vacío (sin tabla)
- [ ] Completar solo fecha-desde y fecha-hasta → click Buscar → falla validación (acción requerida)
- [ ] Completar los 3 campos requeridos → click Buscar → tabla carga con resultados filtrados
- [ ] Escribir un nombre/email en Usuario → los resultados se filtran además por usuario
- [ ] Click en Limpiar → vuelve al estado vacío y los campos se resetean
- [ ] Con resultados > 50 → aparecen los botones de paginación que preservan los filtros
