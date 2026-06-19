# Student Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el formulario de un solo participante y la importación CSV por un picker de tabla con checkboxes, buscador y filtros que aparece tras crear o editar un proceso.

**Architecture:** El Server Component `participants/new/page.tsx` lee `searchParams` y consulta la DB ya filtrada, pasando los resultados a dos Client Components: `StudentPickerFilters` (actualiza URL con `useRouter`) y `StudentPickerTable` (checkboxes + form submit). El server action `addParticipants` inserta múltiples participantes con `createMany`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, React 19, Tailwind CSS v4, Zod v4, Lucide React

## Global Constraints

- No hay framework de tests — verificación mediante `pnpm build` (type-check) y prueba manual en el navegador
- Seguir patrones de estilos existentes: tablas con `bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container`, headers con `text-[10px] font-extrabold uppercase tracking-widest text-secondary`
- `searchParams` y `params` son Promises en Next.js 16 — siempre `await`
- Server actions usados con `useActionState` siguen la firma `(processId, state, formData)` — el `processId` se pasa con `.bind(null, processId)`
- No commits automáticos — el usuario hace los commits

---

## Task 1: Server actions — `addParticipants` + actualizar redirects

**Files:**
- Modify: `app/actions/processes.ts`

**Interfaces:**
- Produces: `addParticipants(processId: string, _: unknown, formData: FormData): Promise<{ message?: string } | undefined>` — exportada para uso en `StudentPickerTable`

- [ ] **Step 1: Agregar `addParticipants` al final de `app/actions/processes.ts`**

Agregar después de `removeParticipant` y antes de `// ── Import CSV`:

```ts
export async function addParticipants(
  processId: string,
  _: unknown,
  formData: FormData
): Promise<{ message?: string } | undefined> {
  const { institutionId } = await requireInstitution()

  const studentIds = formData.getAll('studentId') as string[]
  if (!studentIds.length) return { message: 'Selecciona al menos un estudiante.' }

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { institutionId: true },
  })
  if (!proc || proc.institutionId !== institutionId) return { message: 'Proceso no encontrado.' }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { institutionId: institutionId!, studentId: { in: studentIds } },
    select: { studentId: true },
  })
  const enrolledIds = new Set(enrollments.map(e => e.studentId))
  const validIds = studentIds.filter(id => enrolledIds.has(id))

  if (!validIds.length) return { message: 'Ningún estudiante válido seleccionado.' }

  await prisma.processParticipant.createMany({
    data: validIds.map(studentId => ({ processId, studentId })),
    skipDuplicates: true,
  })

  revalidatePath(`/dashboard/processes/${processId}`)
  redirect(`/dashboard/processes/${processId}`)
}
```

- [ ] **Step 2: Modificar `createProcess` para capturar el ID y redirigir al picker**

Reemplazar el bloque final de `createProcess`:

```ts
// Antes:
await prisma.certificateProcess.create({
  data: { ... },
})
revalidatePath('/dashboard/processes')
redirect('/dashboard/processes')

// Después:
const proc = await prisma.certificateProcess.create({
  data: {
    name:              validated.data.name,
    description:       validated.data.description || null,
    date:              new Date(validated.data.date),
    certificateTypeId: validated.data.certificateTypeId,
    careerId:          validated.data.careerId || null,
    institutionId:     institutionId!,
  },
})
revalidatePath('/dashboard/processes')
redirect(`/dashboard/processes/${proc.id}/participants/new`)
```

- [ ] **Step 3: Modificar `updateProcess` para redirigir al picker**

Reemplazar el bloque final de `updateProcess`:

```ts
// Antes:
await prisma.certificateProcess.update({ where: { id }, data: { ... } })
revalidatePath('/dashboard/processes')
return { success: true }

// Después:
await prisma.certificateProcess.update({
  where: { id },
  data: {
    name:              validated.data.name,
    description:       validated.data.description || null,
    date:              new Date(validated.data.date),
    certificateTypeId: validated.data.certificateTypeId,
    careerId:          validated.data.careerId || null,
  },
})
revalidatePath('/dashboard/processes')
redirect(`/dashboard/processes/${id}/participants/new`)
```

Nota: al usar `redirect()` el `return { success: true }` anterior nunca se ejecutaba desde la perspectiva del navegador, pero ahora hay que eliminar esa línea y el tipo de retorno de `updateProcess` puede quitarle `success?: boolean`.

- [ ] **Step 4: Eliminar `importParticipants` de `processes.ts`**

Eliminar el bloque completo `// ── Import CSV ──` (líneas ~148–238 en el archivo actual), incluyendo los tipos `ImportError` y `ImportResult` y la función `importParticipants`.

- [ ] **Step 5: Verificar tipos con build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | head -50
```

Resultado esperado: sin errores de TypeScript. Si hay errores, corregirlos antes de continuar.

---

## Task 2: Componente `StudentPickerFilters`

**Files:**
- Create: `app/(dashboard)/dashboard/processes/[id]/participants/new/student-picker-filters.tsx`

**Interfaces:**
- Consumes: nada de tareas anteriores (standalone)
- Produces: `StudentPickerFilters({ processId, initialQ, initialCareer, careers, fixedCareerName })` — exportado default

- [ ] **Step 1: Crear `student-picker-filters.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, BookOpen } from 'lucide-react'

type Career = { id: string; name: string }

export default function StudentPickerFilters({
  processId,
  initialQ,
  initialCareer,
  careers,
  fixedCareerName,
}: {
  processId: string
  initialQ: string
  initialCareer: string
  careers: Career[]
  fixedCareerName: string | null
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialQ)
  const [careerId, setCareerId] = useState(initialCareer)

  function pushURL(newQ: string, newCareer: string) {
    const params = new URLSearchParams()
    if (newQ.trim()) params.set('q', newQ.trim())
    if (newCareer) params.set('career', newCareer)
    const qs = params.toString()
    router.push(`/dashboard/processes/${processId}/participants/new${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); pushURL(e.target.value, careerId) }}
          placeholder="Buscar por nombre o cédula..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-container rounded-lg text-sm font-medium text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary-container outline-none transition-all"
        />
      </div>

      {fixedCareerName ? (
        <div className="sm:w-64 flex items-center gap-2 px-4 py-2.5 bg-surface-container-low rounded-lg border border-transparent">
          <BookOpen size={15} strokeWidth={1.75} className="text-secondary shrink-0" />
          <span className="text-sm font-medium text-on-surface truncate">{fixedCareerName}</span>
        </div>
      ) : (
        <div className="relative sm:w-64">
          <Filter size={15} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          <select
            value={careerId}
            onChange={(e) => { setCareerId(e.target.value); pushURL(q, e.target.value) }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-container rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="">Todas las carreras</option>
            {careers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Resultado esperado: sin errores de TypeScript en este archivo.

---

## Task 3: Componente `StudentPickerTable`

**Files:**
- Create: `app/(dashboard)/dashboard/processes/[id]/participants/new/student-picker-table.tsx`

**Interfaces:**
- Consumes: `addParticipants` de `@/app/actions/processes` (Task 1)
- Produces: `StudentPickerTable({ students, processId })` — exportado default
  - `students: { id: string; name: string; dni: string; career: string | null }[]`
  - `processId: string`

- [ ] **Step 1: Crear `student-picker-table.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { addParticipants } from '@/app/actions/processes'
import Link from 'next/link'
import { GraduationCap, Loader2, UserPlus } from 'lucide-react'

type Student = { id: string; name: string; dni: string; career: string | null }

export default function StudentPickerTable({
  students,
  processId,
}: {
  students: Student[]
  processId: string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const boundAction = addParticipants.bind(null, processId)
  const [state, action, pending] = useActionState(boundAction, undefined)

  const allSelected = students.length > 0 && students.every(s => selected.has(s.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(students.map(s => s.id)))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary border border-surface-container">
        <GraduationCap size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
        <p className="text-sm font-medium">No hay estudiantes disponibles para agregar.</p>
        <Link
          href={`/dashboard/processes/${processId}`}
          className="mt-2 text-xs text-primary-container font-bold hover:underline block"
        >
          Volver al proceso
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      {Array.from(selected).map(id => (
        <input key={id} type="hidden" name="studentId" value={id} />
      ))}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-container bg-surface-container-lowest">
              <th className="px-6 py-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-surface-container accent-primary-container cursor-pointer"
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Cédula</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Carrera</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {students.map(s => (
              <tr
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`cursor-pointer transition-colors ${
                  selected.has(s.id)
                    ? 'bg-primary-container/5'
                    : 'hover:bg-surface-container-lowest/50'
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    onClick={e => e.stopPropagation()}
                    className="rounded border-surface-container accent-primary-container cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4 font-semibold text-on-surface">{s.name}</td>
                <td className="px-6 py-4 text-secondary hidden md:table-cell">{s.dni}</td>
                <td className="px-6 py-4 text-secondary hidden md:table-cell">{s.career ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state?.message && (
        <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
          {state.message}
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <p className="text-sm text-secondary font-medium">
          {selected.size > 0
            ? `${selected.size} seleccionado${selected.size !== 1 ? 's' : ''}`
            : 'Ninguno seleccionado'}
        </p>
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/processes/${processId}`}
            className="text-sm font-bold text-secondary hover:text-on-surface transition-colors"
          >
            Omitir por ahora
          </Link>
          <button
            type="submit"
            disabled={pending || selected.size === 0}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm"
          >
            {pending ? (
              <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Agregando...</>
            ) : (
              <><UserPlus size={16} strokeWidth={1.75} />Agregar {selected.size > 0 ? `${selected.size} ` : ''}seleccionado{selected.size !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Resultado esperado: sin errores de TypeScript.

---

## Task 4: Reescribir `participants/new/page.tsx`

**Files:**
- Modify: `app/(dashboard)/dashboard/processes/[id]/participants/new/page.tsx`
- Delete: `app/(dashboard)/dashboard/processes/[id]/participants/new/participant-form.tsx`

**Interfaces:**
- Consumes: `StudentPickerFilters` (Task 2), `StudentPickerTable` (Task 3)

- [ ] **Step 1: Reemplazar completamente `participants/new/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import StudentPickerFilters from './student-picker-filters'
import StudentPickerTable from './student-picker-table'

export const metadata = { title: `${PROJECT_NAME} — Agregar Participantes` }

export default async function NewParticipantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; career?: string }>
}) {
  const { id: processId } = await params
  const { q = '', career = '' } = await searchParams
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect(`/dashboard/processes/${processId}`)

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: {
      id: true,
      name: true,
      institutionId: true,
      careerId: true,
      certificateType: { select: { requiresCareer: true } },
      career: { select: { name: true } },
    },
  })
  if (!proc) notFound()
  if (institutionId && proc.institutionId !== institutionId) notFound()

  const requiresCareer = proc.certificateType.requiresCareer

  const existingIds = new Set(
    (
      await prisma.processParticipant.findMany({
        where: { processId },
        select: { studentId: true },
      })
    ).map(p => p.studentId)
  )

  const careerWhere = requiresCareer
    ? { careerId: proc.careerId ?? undefined }
    : career
    ? { careerId: career }
    : {}

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      institutionId: proc.institutionId,
      ...careerWhere,
      student: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { dni: { contains: q } },
              ],
            }
          : {}),
      },
    },
    include: {
      student: { select: { id: true, name: true, dni: true } },
      career: { select: { name: true } },
    },
    orderBy: { student: { name: 'asc' } },
  })

  const students = enrollments
    .filter(e => !existingIds.has(e.student.id))
    .map(e => ({
      id: e.student.id,
      name: e.student.name,
      dni: e.student.dni,
      career: e.career?.name ?? null,
    }))

  const careers = requiresCareer
    ? []
    : await prisma.career.findMany({
        where: { institutionId: proc.institutionId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/dashboard/processes/${processId}`}
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-on-surface transition-colors mb-6"
        >
          ← Volver al proceso
        </Link>
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Agregar Participantes
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">{proc.name}</h1>
      </div>

      <StudentPickerFilters
        processId={processId}
        initialQ={q}
        initialCareer={career}
        careers={careers}
        fixedCareerName={requiresCareer ? (proc.career?.name ?? null) : null}
      />

      <StudentPickerTable students={students} processId={processId} />
    </div>
  )
}
```

- [ ] **Step 2: Eliminar `participant-form.tsx`**

```bash
rm /Users/juanpablotorres/Documents/myworks/chaski_cert_app/app/\(dashboard\)/dashboard/processes/\[id\]/participants/new/participant-form.tsx
```

- [ ] **Step 3: Verificar build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Resultado esperado: sin errores de TypeScript.

---

## Task 5: Limpieza — eliminar flujo de importación CSV

**Files:**
- Delete: `app/(dashboard)/dashboard/processes/[id]/participants/import/page.tsx`
- Delete: `app/(dashboard)/dashboard/processes/[id]/participants/import/import-form.tsx`
- Modify: `app/(dashboard)/dashboard/processes/[id]/page.tsx` — quitar botón "Importar CSV"
- Modify: `app/(dashboard)/dashboard/processes/[id]/participant-table.tsx` — actualizar texto vacío

- [ ] **Step 1: Eliminar los archivos de importación**

```bash
rm /Users/juanpablotorres/Documents/myworks/chaski_cert_app/app/\(dashboard\)/dashboard/processes/\[id\]/participants/import/import-form.tsx
rm /Users/juanpablotorres/Documents/myworks/chaski_cert_app/app/\(dashboard\)/dashboard/processes/\[id\]/participants/import/page.tsx
```

- [ ] **Step 2: Quitar el botón "Importar CSV" de `processes/[id]/page.tsx`**

Eliminar el bloque del botón Importar CSV. Localizar y borrar en el JSX:

```tsx
// Eliminar estas líneas (~87-92):
<Link href={`/dashboard/processes/${id}/participants/import`}
  className="inline-flex items-center gap-2 border border-primary-container text-primary-container hover:bg-primary-container/5 font-bold py-3 px-5 rounded-lg transition-all text-sm">
  <Upload size={16} strokeWidth={1.75} />
  Importar CSV
</Link>
```

También quitar el import de `Upload` de la línea de imports de lucide-react si ya no se usa en otro lugar del archivo.

- [ ] **Step 3: Actualizar texto vacío en `participant-table.tsx`**

En el estado vacío de la tabla, reemplazar el texto que menciona CSV:

```tsx
// Antes:
{!isAdmin && <p className="text-xs mt-1">Agrega estudiantes con el botón "Agregar Estudiante" o importa un CSV.</p>}

// Después:
{!isAdmin && <p className="text-xs mt-1">Usa el botón "Agregar Estudiante" para añadir participantes.</p>}
```

- [ ] **Step 4: Verificar build limpio**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | tail -20
```

Resultado esperado: `✓ Compiled successfully` sin errores de TypeScript.

- [ ] **Step 5: Prueba manual en el navegador**

Iniciar servidor:
```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm dev
```

Verificar estos flujos:

1. **Crear proceso** → el form guarda y redirige a `/processes/[id]/participants/new` con la tabla de estudiantes
2. **Editar proceso** → el form guarda y redirige a `/processes/[id]/participants/new`
3. **Botón "Agregar Estudiante"** desde el detalle → abre la misma tabla
4. **Tipo con `requiresCareer=true`**: aparece etiqueta fija de carrera (no dropdown), lista filtrada por esa carrera
5. **Tipo con `requiresCareer=false`**: aparece dropdown de carreras, muestra todos los estudiantes activos
6. **Buscador**: escribir nombre o cédula actualiza la URL y filtra la lista
7. **Checkboxes**: seleccionar varios + "Agregar seleccionados" → redirige al detalle del proceso con los participantes añadidos
8. **"Omitir por ahora"**: vuelve al proceso sin añadir participantes
9. **Lista vacía**: aparece mensaje "No hay estudiantes disponibles" con link de vuelta
10. **Botón "Importar CSV" ya no aparece** en el detalle del proceso
