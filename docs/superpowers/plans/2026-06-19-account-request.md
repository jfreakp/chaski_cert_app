# Account Request Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que usuarios externos soliciten acceso al sistema desde la página de login; el administrador recibe una notificación visual y puede ver todas las solicitudes.

**Architecture:** Formulario público → server action → tabla `AccountRequest` en BD. El dashboard layout consulta el conteo de solicitudes no leídas y muestra un badge en la campana solo para ADMIN. La página de admin marca como leídas al cargar y lista todas las solicitudes.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7, Zod 4, Tailwind CSS 4, Sonner (ya instalado), TypeScript.

## Global Constraints

- Zod v4 — sintaxis `z.string().min(n, { error: 'msg' })` y `z.email({ error: 'msg' })`, NO `z.string().min(n, 'msg')` (API v3).
- Server actions: siempre `'use server'` al tope. Retornan estado tipado (no lanzan excepciones al cliente).
- Client components: siempre `'use client'` al tope.
- `requireAdmin()` de `@/app/lib/dal` — usar en toda page/action que sea solo admin.
- `prisma` de `@/app/lib/prisma`.
- Rutas públicas NO usan `verifySession` ni `requireAdmin`.
- No hay framework de tests — verificar con `npx tsc --noEmit` tras cada tarea.
- `revalidatePath` tras mutaciones que afecten el layout del dashboard.

---

## File Map

| Acción | Archivo |
|--------|---------|
| Modificar | `prisma/schema.prisma` — nuevo model `AccountRequest` |
| Modificar | `app/lib/definitions.ts` — schema Zod + types |
| Crear | `app/actions/account-requests.ts` — server action |
| Crear | `app/(auth)/solicitar-cuenta/page.tsx` — página pública |
| Crear | `app/(auth)/solicitar-cuenta/request-form.tsx` — formulario cliente |
| Modificar | `app/(auth)/login/page.tsx` — cambiar `href="#"` → `href="/solicitar-cuenta"` |
| Modificar | `app/(dashboard)/layout.tsx` — Bell con badge + Link para admin |
| Crear | `app/(dashboard)/dashboard/account-requests/page.tsx` — vista admin |
| Crear | `app/(dashboard)/dashboard/account-requests/requests-table.tsx` — tabla cliente |
| Modificar | `app/(dashboard)/components/admin-menu.tsx` — nuevo ítem |

---

### Task 1: Prisma model AccountRequest

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: tipo `AccountRequest` con campos `{ id, name, email, phone, institution, message, isRead, createdAt }` disponible en `@/app/generated/prisma`

- [ ] **Step 1: Agregar el modelo al schema**

Abrir `prisma/schema.prisma` y añadir al final del archivo (después del último modelo existente):

```prisma
model AccountRequest {
  id          String   @id @default(uuid())
  name        String
  email       String
  phone       String
  institution String
  message     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: Ejecutar la migración**

```bash
pnpm db:migrate
```

Cuando pregunte el nombre de la migración, ingresar: `add_account_request`

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verificar types generados**

```bash
npx tsc --noEmit
```

Expected: sin errores relacionados con `AccountRequest`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add AccountRequest prisma model"
```

---

### Task 2: Zod schema + server action

**Files:**
- Modify: `app/lib/definitions.ts`
- Create: `app/actions/account-requests.ts`

**Interfaces:**
- Consumes: `prisma.accountRequest.create` (Task 1)
- Produces:
  - `AccountRequestSchema` — Zod schema exportado desde `definitions.ts`
  - `AccountRequestFormState` — tipo exportado desde `definitions.ts`
  - `createAccountRequest(state, formData): Promise<AccountRequestFormState>` — server action

- [ ] **Step 1: Añadir schema y tipo a definitions.ts**

Al final de `app/lib/definitions.ts`, agregar:

```ts
// ── Solicitud de cuenta ───────────────────────────────────────────────────────

export const AccountRequestSchema = z.object({
  name:        z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  email:       z.email({ error: 'Correo electrónico inválido.' }).trim(),
  phone:       z.string().min(7, { error: 'Teléfono inválido.' }).trim(),
  institution: z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  message:     z.string().min(10, { error: 'El mensaje debe tener al menos 10 caracteres.' }).trim(),
})

export type AccountRequestFormState =
  | {
      errors?: {
        name?:        string[]
        email?:       string[]
        phone?:       string[]
        institution?: string[]
        message?:     string[]
      }
      success?: boolean
    }
  | undefined
```

- [ ] **Step 2: Crear el server action**

Crear `app/actions/account-requests.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/app/lib/prisma'
import {
  AccountRequestSchema,
  type AccountRequestFormState,
} from '@/app/lib/definitions'

export async function createAccountRequest(
  state: AccountRequestFormState,
  formData: FormData,
): Promise<AccountRequestFormState> {
  const validatedFields = AccountRequestSchema.safeParse({
    name:        formData.get('name'),
    email:       formData.get('email'),
    phone:       formData.get('phone'),
    institution: formData.get('institution'),
    message:     formData.get('message'),
  })

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors }
  }

  await prisma.accountRequest.create({ data: validatedFields.data })
  revalidatePath('/dashboard/account-requests')

  return { success: true }
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/lib/definitions.ts app/actions/account-requests.ts
git commit -m "feat: add AccountRequest schema and server action"
```

---

### Task 3: Formulario público /solicitar-cuenta

**Files:**
- Create: `app/(auth)/solicitar-cuenta/page.tsx`
- Create: `app/(auth)/solicitar-cuenta/request-form.tsx`
- Modify: `app/(auth)/login/page.tsx` línea 106

**Interfaces:**
- Consumes: `createAccountRequest` (Task 2), `AccountRequestFormState` (Task 2)
- Produces: ruta pública `/solicitar-cuenta` accesible sin autenticación

- [ ] **Step 1: Crear el formulario cliente**

Crear `app/(auth)/solicitar-cuenta/request-form.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { ArrowRight, Loader2, User, AtSign, Phone, Building2, MessageSquare, CheckCircle2 } from 'lucide-react'
import { createAccountRequest } from '@/app/actions/account-requests'
import type { AccountRequestFormState } from '@/app/lib/definitions'

function Field({
  id, label, name, type = 'text', placeholder, error, icon: Icon,
}: {
  id: string; label: string; name: string; type?: string
  placeholder: string; error?: string[]; icon: React.ElementType
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-secondary px-1" htmlFor={id}>
        {label}
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon size={18} strokeWidth={1.75} className="text-outline group-focus-within:text-primary-container transition-colors" />
        </div>
        <input
          id={id} name={name} type={type} placeholder={placeholder} required
          className="block w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/20 rounded-lg text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary-container transition-all text-sm"
        />
      </div>
      {error && <p className="text-xs text-error px-1">{error[0]}</p>}
    </div>
  )
}

export default function RequestForm() {
  const [state, action, pending] = useActionState<AccountRequestFormState, FormData>(
    createAccountRequest,
    undefined,
  )

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="p-4 rounded-full bg-emerald-50">
          <CheckCircle2 size={40} strokeWidth={1.5} className="text-emerald-600" />
        </div>
        <h3 className="text-xl font-extrabold text-on-surface">¡Solicitud enviada!</h3>
        <p className="text-sm text-secondary max-w-xs">
          Hemos recibido su solicitud. El administrador la revisará y se pondrá en contacto con usted a la brevedad.
        </p>
        <a href="/login" className="mt-2 text-sm font-bold text-primary-container hover:underline">
          Volver al inicio de sesión
        </a>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-4">
        <Field id="name" label="Nombre completo" name="name" placeholder="Juan Pérez" error={state?.errors?.name} icon={User} />
        <Field id="email" label="Correo electrónico" name="email" type="email" placeholder="juan@institucion.edu" error={state?.errors?.email} icon={AtSign} />
        <Field id="phone" label="Celular" name="phone" type="tel" placeholder="+51 999 999 999" error={state?.errors?.phone} icon={Phone} />
        <Field id="institution" label="Institución" name="institution" placeholder="Universidad Nacional de ..." error={state?.errors?.institution} icon={Building2} />

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-secondary px-1" htmlFor="message">
            Mensaje / Justificación
          </label>
          <div className="relative group">
            <div className="absolute top-4 left-4 pointer-events-none">
              <MessageSquare size={18} strokeWidth={1.75} className="text-outline group-focus-within:text-primary-container transition-colors" />
            </div>
            <textarea
              id="message" name="message" required rows={4} placeholder="Describa brevemente por qué necesita acceso al sistema..."
              className="block w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/20 rounded-lg text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary-container transition-all text-sm resize-none"
            />
          </div>
          {state?.errors?.message && <p className="text-xs text-error px-1">{state.errors.message[0]}</p>}
        </div>
      </div>

      <button
        type="submit" disabled={pending}
        className="w-full bg-primary-container hover:bg-primary text-white font-bold py-4 px-6 rounded-lg shadow-xl shadow-primary-container/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? (
          <><Loader2 size={20} className="animate-spin" /><span>Enviando...</span></>
        ) : (
          <><span>Enviar solicitud</span><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
        )}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Crear la página**

Crear `app/(auth)/solicitar-cuenta/page.tsx`:

```tsx
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { PROJECT_NAME } from '@/app/lib/config'
import RequestForm from './request-form'

export const metadata = { title: `${PROJECT_NAME} — Solicitar Cuenta` }

export default function RequestAccountPage() {
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary-container p-2.5 rounded-xl">
            <ShieldCheck size={24} strokeWidth={1.75} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-on-surface">{PROJECT_NAME}</h1>
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Solicitar acceso</h2>
          <p className="text-secondary font-medium">
            Complete el formulario y el administrador revisará su solicitud.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-surface-container p-8 shadow-sm">
          <RequestForm />
        </div>

        <p className="text-center text-sm text-secondary">
          ¿Ya tiene una cuenta?{' '}
          <Link href="/login" className="text-primary-container font-bold hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Actualizar el link en login/page.tsx**

En `app/(auth)/login/page.tsx` línea 106, cambiar:

```tsx
// Antes:
<a className="text-primary-container font-bold hover:underline" href="#">
  Solicite una cuenta
</a>

// Después:
<a className="text-primary-container font-bold hover:underline" href="/solicitar-cuenta">
  Solicite una cuenta
</a>
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Verificar en browser**

```bash
pnpm dev
```

Navegar a `http://localhost:3000/solicitar-cuenta`. Verificar:
- El formulario carga correctamente.
- Enviar con campos vacíos muestra errores de validación.
- Enviar con datos válidos muestra el mensaje de confirmación.
- El link "Volver al inicio de sesión" navega a `/login`.
- El link "Solicite una cuenta" en `/login` ahora navega a `/solicitar-cuenta`.

- [ ] **Step 6: Commit**

```bash
git add app/(auth)/solicitar-cuenta/ app/(auth)/login/page.tsx
git commit -m "feat: add public account request form at /solicitar-cuenta"
```

---

### Task 4: Bell badge en el dashboard layout

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `prisma.accountRequest.count` (Task 1), `isAdmin` (ya existe en el layout)
- Produces: campana con badge numérico rojo cuando `isAdmin && unreadCount > 0`; link a `/dashboard/account-requests` solo para admin

- [ ] **Step 1: Modificar el layout**

En `app/(dashboard)/layout.tsx`, reemplazar el bloque del botón Bell (actualmente `<button className="p-2 text-secondary ...">`) con la lógica condicional.

Primero, agregar la importación de `prisma` al inicio del archivo. `Link` ya está importado en el layout — no duplicar:

```tsx
// Agregar solo esta línea a los imports existentes (Link ya existe):
import { prisma } from '@/app/lib/prisma'
```

Luego, después de `const isAdmin = user?.role === 'ADMIN'` (línea ~27), agregar la consulta:

```tsx
const unreadCount = isAdmin
  ? await prisma.accountRequest.count({ where: { isRead: false } })
  : 0
```

Finalmente, reemplazar el botón Bell estático:

```tsx
{/* Antes — borrar esto: */}
<button className="p-2 text-secondary hover:bg-surface-container rounded-full transition-colors">
  <Bell size={20} strokeWidth={1.75} />
</button>

{/* Después — reemplazar con esto: */}
{isAdmin ? (
  <Link
    href="/dashboard/account-requests"
    className="relative p-2 text-secondary hover:bg-surface-container rounded-full transition-colors"
    title="Solicitudes de cuenta"
  >
    <Bell size={20} strokeWidth={1.75} />
    {unreadCount > 0 && (
      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white leading-none">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </Link>
) : (
  <button className="p-2 text-secondary hover:bg-surface-container rounded-full transition-colors">
    <Bell size={20} strokeWidth={1.75} />
  </button>
)}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Verificar en browser**

Con `pnpm dev` corriendo, iniciar sesión como ADMIN. Verificar:
- Si hay solicitudes no leídas en BD: badge rojo con número aparece sobre la campana.
- La campana es clickeable y navega a `/dashboard/account-requests`.
- Iniciar sesión como usuario UNIVERSITY: la campana es un botón sin badge, sin link.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/layout.tsx
git commit -m "feat: add unread badge to Bell icon for admin notifications"
```

---

### Task 5: Vista admin de solicitudes + menú

**Files:**
- Create: `app/(dashboard)/dashboard/account-requests/page.tsx`
- Create: `app/(dashboard)/dashboard/account-requests/requests-table.tsx`
- Modify: `app/(dashboard)/components/admin-menu.tsx`

**Interfaces:**
- Consumes: `requireAdmin` de `@/app/lib/dal`, `prisma.accountRequest` (Task 1)
- Produces: ruta `/dashboard/account-requests` con tabla de solicitudes; al cargar, marca todas como leídas (lo que resetea el badge de Task 4)

- [ ] **Step 1: Crear la tabla cliente**

Crear `app/(dashboard)/dashboard/account-requests/requests-table.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Building2, Phone, AtSign, Calendar, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

type AccountRequest = {
  id: string
  name: string
  email: string
  phone: string
  institution: string
  message: string
  createdAt: Date
}

function MessageCell({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = message.length > 80

  return (
    <div>
      <p className="text-sm text-on-surface">
        {isLong && !expanded ? `${message.slice(0, 80)}…` : message}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-primary-container hover:underline uppercase tracking-wider"
        >
          {expanded ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver más</>}
        </button>
      )}
    </div>
  )
}

export default function RequestsTable({ requests }: { requests: AccountRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary border border-surface-container">
        <MessageSquare size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
        <p className="text-sm font-medium">Sin solicitudes aún.</p>
        <p className="text-xs mt-1">Cuando alguien solicite acceso aparecerá aquí.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Solicitante</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Contacto</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Institución</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Mensaje</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {requests.map((r) => {
            const initials = r.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
            return (
              <tr key={r.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-container text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface truncate">{r.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-secondary">
                      <AtSign size={12} strokeWidth={1.75} />
                      <span className="truncate max-w-[180px]">{r.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-secondary">
                      <Phone size={12} strokeWidth={1.75} />
                      <span>{r.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 text-sm text-on-surface">
                    <Building2 size={14} strokeWidth={1.75} className="text-secondary shrink-0" />
                    <span className="truncate max-w-[180px]">{r.institution}</span>
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <MessageCell message={r.message} />
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 text-xs text-secondary whitespace-nowrap">
                    <Calendar size={12} strokeWidth={1.75} />
                    {new Date(r.createdAt).toLocaleDateString('es-PE', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Crear la página server component**

Crear `app/(dashboard)/dashboard/account-requests/page.tsx`:

```tsx
import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { Inbox } from 'lucide-react'
import RequestsTable from './requests-table'

export const metadata = { title: 'Solicitudes de Cuenta' }

export default async function AccountRequestsPage() {
  await requireAdmin()

  await prisma.accountRequest.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  })

  const requests = await prisma.accountRequest.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-center gap-3">
        <Inbox size={28} strokeWidth={1.5} className="text-primary-container" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Solicitudes de Cuenta</h1>
          <p className="text-sm text-secondary">{requests.length} solicitud{requests.length !== 1 ? 'es' : ''} en total</p>
        </div>
      </div>

      <RequestsTable requests={requests} />
    </div>
  )
}
```

- [ ] **Step 3: Agregar ítem al menú admin**

En `app/(dashboard)/components/admin-menu.tsx`, modificar el array `adminLinks` para agregar el ítem de solicitudes. Importar el ícono `Inbox`:

```tsx
// Cambiar la línea de imports de lucide:
import { ShieldCheck, Users, Building2, BadgeCheck, ChevronDown, ScrollText, Inbox } from 'lucide-react'

// Cambiar el array adminLinks:
const adminLinks = [
  { href: '/dashboard/institutions',      icon: Building2,   label: 'Instituciones' },
  { href: '/dashboard/users',             icon: Users,       label: 'Usuarios' },
  { href: '/dashboard/certificate-types', icon: BadgeCheck,  label: 'Tipos de Certificado' },
  { href: '/dashboard/account-requests',  icon: Inbox,       label: 'Solicitudes de Cuenta' },
  { href: '/dashboard/audit',             icon: ScrollText,  label: 'Auditoría' },
]
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Verificar flujo completo en browser**

Con `pnpm dev`:

1. Ir a `/solicitar-cuenta`, enviar una solicitud de prueba.
2. Iniciar sesión como ADMIN.
3. Verificar que la campana muestra badge con `1`.
4. Hacer clic en la campana → navega a `/dashboard/account-requests`.
5. Verificar que la solicitud aparece en la tabla.
6. Volver al dashboard → el badge de la campana ya no aparece (isRead = true).
7. Verificar que el ítem "Solicitudes de Cuenta" aparece en el menú lateral de Administración.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/dashboard/account-requests/ app/(dashboard)/components/admin-menu.tsx
git commit -m "feat: add admin account requests view with read tracking"
```
