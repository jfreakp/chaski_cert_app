# requiresCareer en CertificateType — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar `requiresCareer` a `CertificateType` para que los formularios de proceso muestren el campo carrera solo cuando el tipo lo requiere.

**Architecture:** Cambio en schema Prisma + migración de datos. El server action de tipos recibe el nuevo campo. Los page components pasan `requiresCareer` en el array de `certTypes`; los forms client usan `useState` para trackear el tipo seleccionado y renderizar el campo carrera condicionalmente.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Zod 4, Tailwind CSS 4, TypeScript.

> **Nota:** El usuario gestiona los commits. No ejecutar `git add` ni `git commit`.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `prisma/schema.prisma` |
| Crear | `prisma/migrations/20260602210000_add_requires_career_to_certificate_type/migration.sql` |
| Modificar | `app/actions/certificate-types.ts` |
| Modificar | `app/(dashboard)/dashboard/certificate-types/new/certificate-type-form.tsx` |
| Modificar | `app/(dashboard)/dashboard/certificate-types/[id]/edit/page.tsx` |
| Modificar | `app/(dashboard)/dashboard/certificate-types/[id]/edit/edit-certificate-type-form.tsx` |
| Modificar | `app/(dashboard)/dashboard/certificate-types/certificate-type-table.tsx` |
| Modificar | `app/(dashboard)/dashboard/processes/new/page.tsx` |
| Modificar | `app/(dashboard)/dashboard/processes/new/process-form.tsx` |
| Modificar | `app/(dashboard)/dashboard/processes/[id]/edit/page.tsx` |
| Modificar | `app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx` |

---

## Task 1: Schema Prisma + Migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260602210000_add_requires_career_to_certificate_type/migration.sql`

- [ ] **Paso 1: Agregar `requiresCareer` al modelo `CertificateType` en schema.prisma**

Reemplazar:
```prisma
model CertificateType {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  processes   CertificateProcess[]
}
```
por:
```prisma
model CertificateType {
  id             String   @id @default(uuid())
  name           String   @unique
  description    String?
  isActive       Boolean  @default(true)
  requiresCareer Boolean  @default(false)
  createdAt      DateTime @default(now())

  processes   CertificateProcess[]
}
```

- [ ] **Paso 2: Crear la migración manualmente**

```bash
mkdir -p prisma/migrations/20260602210000_add_requires_career_to_certificate_type
```

Crear el archivo `prisma/migrations/20260602210000_add_requires_career_to_certificate_type/migration.sql` con el contenido:

```sql
-- AlterTable
ALTER TABLE "CertificateType" ADD COLUMN "requiresCareer" BOOLEAN NOT NULL DEFAULT false;

-- Set requiresCareer = true for Título de Grado
UPDATE "CertificateType" SET "requiresCareer" = true WHERE name = 'Título de Grado';
```

- [ ] **Paso 3: Aplicar la migración**

```bash
pnpm prisma migrate dev --name add_requires_career_to_certificate_type
```

Salida esperada: `Your database is now in sync with your schema.`

Si el nombre ya existe, ejecutar:

```bash
pnpm prisma migrate deploy
```

- [ ] **Paso 4: Verificar que el campo existe y el UPDATE se aplicó**

```bash
pnpm prisma db execute --stdin << 'SQL'
SELECT name, "requiresCareer" FROM "CertificateType" ORDER BY name;
SQL
```

Salida esperada: `Título de Grado` con `requiresCareer = true`, el resto con `false`.

---

## Task 2: Server Action — certificate-types.ts

**Files:**
- Modify: `app/actions/certificate-types.ts`

- [ ] **Paso 1: Agregar `requiresCareer` al Zod Schema y actualizar los actions**

Reemplazar el contenido completo de `app/actions/certificate-types.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'

const Schema = z.object({
  name:           z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  description:    z.string().trim().optional(),
  requiresCareer: z.preprocess(v => v === 'true', z.boolean()),
})

type FormState =
  | { errors?: { name?: string[]; description?: string[] }; message?: string; success?: boolean }
  | undefined

export async function createCertificateType(state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()

  const validated = Schema.safeParse({
    name:           formData.get('name'),
    description:    formData.get('description'),
    requiresCareer: formData.get('requiresCareer'),
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as { name?: string[]; description?: string[] } }

  const existing = await prisma.certificateType.findUnique({ where: { name: validated.data.name } })
  if (existing) return { errors: { name: ['Este tipo ya existe.'] } }

  await prisma.certificateType.create({
    data: {
      name:           validated.data.name,
      description:    validated.data.description || null,
      requiresCareer: validated.data.requiresCareer,
    },
  })
  revalidatePath('/dashboard/certificate-types')
  redirect('/dashboard/certificate-types')
}

export async function updateCertificateType(id: string, state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()

  const validated = Schema.safeParse({
    name:           formData.get('name'),
    description:    formData.get('description'),
    requiresCareer: formData.get('requiresCareer'),
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as { name?: string[]; description?: string[] } }

  const existing = await prisma.certificateType.findUnique({ where: { name: validated.data.name } })
  if (existing && existing.id !== id) return { errors: { name: ['Este tipo ya existe.'] } }

  await prisma.certificateType.update({
    where: { id },
    data: {
      name:           validated.data.name,
      description:    validated.data.description || null,
      requiresCareer: validated.data.requiresCareer,
    },
  })
  revalidatePath('/dashboard/certificate-types')
  return { success: true }
}

export async function toggleCertificateTypeStatus(id: string) {
  await requireAdmin()
  const ct = await prisma.certificateType.findUnique({ where: { id }, select: { isActive: true } })
  if (!ct) return
  await prisma.certificateType.update({ where: { id }, data: { isActive: !ct.isActive } })
  revalidatePath('/dashboard/certificate-types')
}

export async function deleteCertificateType(id: string) {
  await requireAdmin()
  const processes = await prisma.certificateProcess.count({ where: { certificateTypeId: id } })
  if (processes > 0) return
  await prisma.certificateType.delete({ where: { id } })
  revalidatePath('/dashboard/certificate-types')
}
```

---

## Task 3: UI — Formularios de tipo de certificado

**Files:**
- Modify: `app/(dashboard)/dashboard/certificate-types/new/certificate-type-form.tsx`
- Modify: `app/(dashboard)/dashboard/certificate-types/[id]/edit/page.tsx`
- Modify: `app/(dashboard)/dashboard/certificate-types/[id]/edit/edit-certificate-type-form.tsx`

- [ ] **Paso 1: Agregar toggle en certificate-type-form.tsx (nuevo tipo)**

Reemplazar el contenido completo:

```tsx
'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createCertificateType } from '@/app/actions/certificate-types'
import { BadgeCheck, FileText, GraduationCap, Loader2, Save } from 'lucide-react'

export default function CertificateTypeForm() {
  const [state, action, pending] = useActionState(createCertificateType, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre *</label>
          <div className="relative">
            <BadgeCheck size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input name="name" type="text" required placeholder="Ej: Título de Grado, Congreso, Seminario"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all" />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Descripción</label>
          <div className="relative">
            <FileText size={16} strokeWidth={1.75} className="absolute left-4 top-3.5 text-secondary" />
            <textarea name="description" rows={3} placeholder="Descripción opcional del tipo de certificado"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all resize-none" />
          </div>
        </div>

        <label className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg cursor-pointer group">
          <div className="flex items-center gap-3">
            <GraduationCap size={18} strokeWidth={1.75} className="text-secondary group-has-[:checked]:text-primary-container transition-colors" />
            <div>
              <p className="text-sm font-semibold text-on-surface">Requiere carrera específica</p>
              <p className="text-xs text-secondary mt-0.5">Los procesos de este tipo deben tener una carrera asignada.</p>
            </div>
          </div>
          <div className="relative">
            <input type="checkbox" name="requiresCareer" value="true" className="sr-only peer" />
            <div className="w-11 h-6 bg-outline/30 rounded-full peer peer-checked:bg-primary-container after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </div>
        </label>

        {state?.message && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/certificate-types" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Crear Tipo</>}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Paso 2: Pasar `defaultRequiresCareer` desde edit/page.tsx**

Reemplazar el contenido completo de `app/(dashboard)/dashboard/certificate-types/[id]/edit/page.tsx`:

```tsx
import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditCertificateTypeForm from './edit-certificate-type-form'

export const metadata = { title: `${PROJECT_NAME} — Editar Tipo de Certificado` }

export default async function EditCertificateTypePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const type = await prisma.certificateType.findUnique({ where: { id } })
  if (!type) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Administración · Tipos de Certificado</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Editar Tipo</h1>
        <p className="text-secondary mt-2 text-sm">{type.name}</p>
      </div>
      <EditCertificateTypeForm
        id={type.id}
        defaultName={type.name}
        defaultDescription={type.description}
        defaultRequiresCareer={type.requiresCareer}
      />
    </div>
  )
}
```

- [ ] **Paso 3: Agregar toggle con valor guardado en edit-certificate-type-form.tsx**

Reemplazar el contenido completo:

```tsx
'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { updateCertificateType } from '@/app/actions/certificate-types'
import { BadgeCheck, FileText, GraduationCap, Loader2, Save, CheckCircle2 } from 'lucide-react'

type Props = {
  id: string
  defaultName: string
  defaultDescription: string | null
  defaultRequiresCareer: boolean
}

export default function EditCertificateTypeForm({ id, defaultName, defaultDescription, defaultRequiresCareer }: Props) {
  const updateWithId = updateCertificateType.bind(null, id)
  const [state, action, pending] = useActionState(updateWithId, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre *</label>
          <div className="relative">
            <BadgeCheck size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input name="name" type="text" required defaultValue={defaultName}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Descripción</label>
          <div className="relative">
            <FileText size={16} strokeWidth={1.75} className="absolute left-4 top-3.5 text-secondary" />
            <textarea name="description" rows={3} defaultValue={defaultDescription ?? ''}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all resize-none" />
          </div>
        </div>

        <label className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg cursor-pointer group">
          <div className="flex items-center gap-3">
            <GraduationCap size={18} strokeWidth={1.75} className="text-secondary group-has-[:checked]:text-primary-container transition-colors" />
            <div>
              <p className="text-sm font-semibold text-on-surface">Requiere carrera específica</p>
              <p className="text-xs text-secondary mt-0.5">Los procesos de este tipo deben tener una carrera asignada.</p>
            </div>
          </div>
          <div className="relative">
            <input type="checkbox" name="requiresCareer" value="true" defaultChecked={defaultRequiresCareer} className="sr-only peer" />
            <div className="w-11 h-6 bg-outline/30 rounded-full peer peer-checked:bg-primary-container after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </div>
        </label>

        {state?.message && !state.success && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}
        {state?.success && <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg flex items-center gap-2"><CheckCircle2 size={16} strokeWidth={2} />Tipo actualizado correctamente.</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/certificate-types" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Guardar Cambios</>}
          </button>
        </div>
      </form>
    </div>
  )
}
```

---

## Task 4: UI — Tabla de tipos de certificado

**Files:**
- Modify: `app/(dashboard)/dashboard/certificate-types/certificate-type-table.tsx`

- [ ] **Paso 1: Agregar columna "Carrera req." y corregir `_count.events` → `_count.processes`**

El type `CertType` y las referencias a `events` son stale del schema anterior. Reemplazar el contenido completo:

```tsx
'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toggleCertificateTypeStatus, deleteCertificateType } from '@/app/actions/certificate-types'
import { GraduationCap, Pencil, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type CertType = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  requiresCareer: boolean
  createdAt: Date
  _count: { processes: number }
}

function RowActions({ type }: { type: CertType }) {
  const [pendingToggle, startToggle] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Link href={`/dashboard/certificate-types/${type.id}/edit`}
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all" title="Editar">
        <Pencil size={16} strokeWidth={1.75} />
      </Link>
      <button onClick={() => startToggle(() => toggleCertificateTypeStatus(type.id))} disabled={pendingToggle}
        title={type.isActive ? 'Desactivar' : 'Activar'}
        className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-all disabled:opacity-40">
        {pendingToggle ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> :
          type.isActive ? <XCircle size={16} strokeWidth={1.75} className="hover:text-amber-500" /> :
          <CheckCircle size={16} strokeWidth={1.75} className="hover:text-green-600" />}
      </button>
      <button
        onClick={() => {
          if (type._count.processes > 0) return
          if (confirm(`¿Eliminar "${type.name}"?`)) startDelete(() => deleteCertificateType(type.id))
        }}
        disabled={pendingDelete || type._count.processes > 0}
        title={type._count.processes > 0 ? 'Tiene procesos asociados' : 'Eliminar'}
        className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
        {pendingDelete ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
      </button>
    </div>
  )
}

export default function CertificateTypeTable({ types }: { types: CertType[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Tipo</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Procesos</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Carrera req.</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {types.map((t) => (
            <tr key={t.id} className="hover:bg-surface-container-lowest/50 transition-colors">
              <td className="px-6 py-4">
                <p className="font-semibold text-on-surface">{t.name}</p>
                {t.description && <p className="text-xs text-secondary mt-0.5">{t.description}</p>}
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="text-sm font-semibold text-on-surface">{t._count.processes}</span>
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                {t.requiresCareer
                  ? <GraduationCap size={16} strokeWidth={1.75} className="text-primary-container" title="Sí" />
                  : <span className="text-secondary">—</span>}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-secondary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                  {t.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4"><RowActions type={t} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Paso 2: Actualizar la query en `app/(dashboard)/dashboard/certificate-types/page.tsx`**

Reemplazar el bloque `prisma.certificateType.findMany`:
```ts
const types = await prisma.certificateType.findMany({
  select: {
    id: true,
    name: true,
    description: true,
    isActive: true,
    createdAt: true,
    _count: { select: { events: true } },
  },
  orderBy: { name: 'asc' },
})
```
por:
```ts
const types = await prisma.certificateType.findMany({
  select: {
    id: true,
    name: true,
    description: true,
    isActive: true,
    requiresCareer: true,
    createdAt: true,
    _count: { select: { processes: true } },
  },
  orderBy: { name: 'asc' },
})
```

---

## Task 5: UI — Formularios de proceso

**Files:**
- Modify: `app/(dashboard)/dashboard/processes/new/page.tsx`
- Modify: `app/(dashboard)/dashboard/processes/new/process-form.tsx`
- Modify: `app/(dashboard)/dashboard/processes/[id]/edit/page.tsx`
- Modify: `app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx`

- [ ] **Paso 1: Incluir `requiresCareer` en la query de `certTypes` en processes/new/page.tsx**

Reemplazar el bloque de query en `NewProcessPage`:
```ts
prisma.certificateType.findMany({
  where: { isActive: true },
  select: { id: true, name: true },
  orderBy: { name: 'asc' },
}),
```
por:
```ts
prisma.certificateType.findMany({
  where: { isActive: true },
  select: { id: true, name: true, requiresCareer: true },
  orderBy: { name: 'asc' },
}),
```

- [ ] **Paso 2: Actualizar processes/new/process-form.tsx con campo carrera condicional**

Reemplazar el contenido completo:

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useActionState } from 'react'
import { createProcess } from '@/app/actions/processes'
import { CalendarDays, BadgeCheck, BookOpen, FileText, Loader2, Save } from 'lucide-react'

type CertType = { id: string; name: string; requiresCareer: boolean }
type Career = { id: string; name: string }

export default function ProcessForm({ certTypes, careers }: { certTypes: CertType[]; careers: Career[] }) {
  const [state, action, pending] = useActionState(createProcess, undefined)
  const [selectedTypeId, setSelectedTypeId] = useState('')

  const requiresCareer = certTypes.find(c => c.id === selectedTypeId)?.requiresCareer ?? false

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre del Proceso *</label>
          <div className="relative">
            <FileText size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input name="name" type="text" required placeholder="Ej: Graduación 2026 — Ingeniería"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all" />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Tipo de Certificado *</label>
          <div className="relative">
            <BadgeCheck size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            {certTypes.length > 0 ? (
              <select
                name="certificateTypeId"
                required
                value={selectedTypeId}
                onChange={e => setSelectedTypeId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecciona un tipo...</option>
                {certTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-lg text-sm text-outline">
                No hay tipos activos — el administrador debe crear uno primero.
              </div>
            )}
          </div>
          {state?.errors?.certificateTypeId && <p className="text-xs text-error">{state.errors.certificateTypeId[0]}</p>}
        </div>

        {requiresCareer && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Carrera *</label>
            <div className="relative">
              <BookOpen size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              <select name="careerId" required
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer">
                <option value="">Selecciona una carrera...</option>
                {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Fecha *</label>
          <div className="relative">
            <CalendarDays size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input name="date" type="date" required
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.date && <p className="text-xs text-error">{state.errors.date[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Descripción</label>
          <textarea name="description" rows={3} placeholder="Descripción opcional"
            className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all resize-none" />
        </div>

        {state?.message && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/processes" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending || certTypes.length === 0}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Crear Proceso</>}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Paso 3: Incluir `requiresCareer` en la query de `certTypes` en processes/[id]/edit/page.tsx**

Reemplazar:
```ts
prisma.certificateType.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
```
por:
```ts
prisma.certificateType.findMany({ where: { isActive: true }, select: { id: true, name: true, requiresCareer: true }, orderBy: { name: 'asc' } }),
```

- [ ] **Paso 4: Actualizar edit-process-form.tsx con campo carrera condicional**

Reemplazar el contenido completo:

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useActionState } from 'react'
import { updateProcess } from '@/app/actions/processes'
import { CalendarDays, BadgeCheck, BookOpen, FileText, Loader2, Save, CheckCircle2 } from 'lucide-react'

type CertType = { id: string; name: string; requiresCareer: boolean }
type Career = { id: string; name: string }
type Props = {
  processId: string
  defaultName: string
  defaultDescription: string | null
  defaultDate: string
  defaultCertificateTypeId: string
  defaultCareerId: string | null
  certTypes: CertType[]
  careers: Career[]
}

export default function EditProcessForm({ processId, defaultName, defaultDescription, defaultDate, defaultCertificateTypeId, defaultCareerId, certTypes, careers }: Props) {
  const updateWithId = updateProcess.bind(null, processId)
  const [state, action, pending] = useActionState(updateWithId, undefined)
  const [selectedTypeId, setSelectedTypeId] = useState(defaultCertificateTypeId)

  const requiresCareer = certTypes.find(c => c.id === selectedTypeId)?.requiresCareer ?? false

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre del Proceso *</label>
          <div className="relative">
            <FileText size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input name="name" type="text" required defaultValue={defaultName}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Tipo de Certificado *</label>
          <div className="relative">
            <BadgeCheck size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <select
              name="certificateTypeId"
              required
              value={selectedTypeId}
              onChange={e => setSelectedTypeId(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer"
            >
              {certTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {state?.errors?.certificateTypeId && <p className="text-xs text-error">{state.errors.certificateTypeId[0]}</p>}
        </div>

        {requiresCareer && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Carrera *</label>
            <div className="relative">
              <BookOpen size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              <select name="careerId" defaultValue={defaultCareerId ?? ''}
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer">
                <option value="">Selecciona una carrera...</option>
                {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Fecha *</label>
          <div className="relative">
            <CalendarDays size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input name="date" type="date" required defaultValue={defaultDate}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.date && <p className="text-xs text-error">{state.errors.date[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Descripción</label>
          <textarea name="description" rows={3} defaultValue={defaultDescription ?? ''}
            className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all resize-none" />
        </div>

        {state?.message && !state.success && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}
        {state?.success && <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg flex items-center gap-2"><CheckCircle2 size={16} strokeWidth={2} />Proceso actualizado.</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href={`/dashboard/processes/${processId}`} className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Guardar Cambios</>}
          </button>
        </div>
      </form>
    </div>
  )
}
```

---

## Verificación final

- [ ] Abrir `/dashboard/certificate-types` como ADMIN → tabla muestra columna "Carrera req." con ícono en "Título de Grado"
- [ ] Abrir editar "Título de Grado" → toggle aparece activado
- [ ] Abrir editar "Congreso" → toggle aparece desactivado
- [ ] Abrir `/dashboard/processes/new` → seleccionar "Congreso" → campo carrera NO aparece
- [ ] En el mismo form → seleccionar "Título de Grado" → campo carrera aparece
- [ ] Crear proceso de tipo "Congreso" → se guarda sin carrera
- [ ] Crear proceso de tipo "Título de Grado" → campo carrera es obligatorio y se guarda
