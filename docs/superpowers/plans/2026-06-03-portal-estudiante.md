# Portal del Estudiante — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear un portal en `/portal` donde los estudiantes acceden a sus certificados mediante un magic link enviado a su email, sin contraseña.

**Architecture:** JWT stateless firmado con `SESSION_SECRET` para el magic link (15 min). Cookie separada `student-session` (7 días) para no interferir con sesiones ADMIN/UNIVERSITY. Rutas bajo `app/(portal)/` con layout propio sin sidebar. Server actions en `app/actions/student-portal.ts`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, `jose` (JWT — ya instalado), `nodemailer` (ya instalado), Tailwind CSS 4.

> **Nota:** El usuario gestiona los commits. No ejecutar `git add` ni `git commit`.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `prisma/schema.prisma` |
| Crear | `prisma/migrations/20260603000000_student_email_required/migration.sql` |
| Modificar | `app/actions/students.ts` |
| Modificar | `app/(dashboard)/dashboard/students/new/student-form.tsx` |
| Modificar | `app/(dashboard)/dashboard/students/[id]/edit/edit-student-form.tsx` |
| Crear | `app/lib/student-session.ts` |
| Modificar | `app/lib/email.ts` |
| Crear | `app/actions/student-portal.ts` |
| Crear | `app/(portal)/layout.tsx` |
| Crear | `app/(portal)/portal/login/page.tsx` |
| Crear | `app/(portal)/portal/login/login-form.tsx` |
| Crear | `app/(portal)/portal/login/verify/page.tsx` |
| Crear | `app/(portal)/portal/page.tsx` |
| Crear | `app/(portal)/portal/copy-link-button.tsx` |
| Crear | `app/(portal)/portal/profile/page.tsx` |
| Modificar | `app/api/certificates/[id]/pdf/route.ts` |
| Modificar | `README.md` |

---

## Task 1: Student.email requerido — Schema + Migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260603000000_student_email_required/migration.sql`

- [ ] **Paso 1: Actualizar schema.prisma**

En el modelo `Student`, cambiar `email String?` por `email String`:

```prisma
model Student {
  id          String   @id @default(uuid())
  name        String
  dni         String   @unique
  email       String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  enrollments    StudentEnrollment[]
  certificates   Certificate[]
  participations ProcessParticipant[]
}
```

- [ ] **Paso 2: Crear directorio y migración**

```bash
mkdir -p prisma/migrations/20260603000000_student_email_required
```

Crear `prisma/migrations/20260603000000_student_email_required/migration.sql`:

```sql
-- Asignar placeholder a estudiantes sin email antes de aplicar NOT NULL
UPDATE "Student" SET "email" = 'sin-email@pendiente.com' WHERE "email" IS NULL;

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "email" SET NOT NULL;
```

- [ ] **Paso 3: Aplicar migración y regenerar cliente**

```bash
pnpm db:migrate && pnpm prisma generate
```

Salida esperada: `Your database is now in sync with your schema.`

---

## Task 2: Actualizar acciones y formularios de estudiante

**Files:**
- Modify: `app/actions/students.ts`
- Modify: `app/(dashboard)/dashboard/students/new/student-form.tsx`
- Modify: `app/(dashboard)/dashboard/students/[id]/edit/edit-student-form.tsx`

- [ ] **Paso 1: Hacer email requerido en StudentSchema (`app/actions/students.ts`)**

Reemplazar el schema y los upserts/creates/updates para que email sea obligatorio:

```ts
const StudentSchema = z.object({
  name:  z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  dni:   z.string().min(5, { error: 'Cédula inválida.' }).trim(),
  email: z.email({ error: 'Correo inválido.' }).trim(),
})
```

En `createStudent`, reemplazar el upsert:

```ts
const student = await prisma.student.upsert({
  where: { dni },
  update: { name, email },
  create: { name, dni, email },
})
```

En `updateStudent`, reemplazar el update del student:

```ts
await Promise.all([
  prisma.student.update({
    where: { id: enrollment.studentId },
    data: { name, dni, email },
  }),
  prisma.studentEnrollment.update({
    where: { id: enrollmentId },
    data: { careerId: careerId || null },
  }),
])
```

En `importStudentsFromCSV`, reemplazar el upsert:

```ts
const student = await prisma.student.upsert({
  where: { dni: validated.data.dni },
  update: { name: validated.data.name, email: validated.data.email },
  create: { name: validated.data.name, dni: validated.data.dni, email: validated.data.email },
})
```

Y agregar validación de email requerido en la fila CSV:

```ts
if (!name || !dni || !email) { errs.push(`Fila ${i + 2}: nombre, cédula y email son obligatorios.`); continue }
```

- [ ] **Paso 2: Email requerido en formulario de creación (`student-form.tsx`)**

Cambiar el bloque del campo email. Reemplazar:

```tsx
{/* Email */}
<div className="flex flex-col gap-2">
  <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Correo</label>
  <div className="relative">
    <AtSign size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
    <input name="email" type="email" placeholder="Ej: juan@universidad.edu.ec"
      className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all" />
  </div>
  {state?.errors?.email && <p className="text-xs text-error">{state.errors.email[0]}</p>}
</div>
```

Por:

```tsx
{/* Email */}
<div className="flex flex-col gap-2">
  <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Correo *</label>
  <div className="relative">
    <AtSign size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
    <input name="email" type="email" required placeholder="Ej: juan@universidad.edu.ec"
      className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all" />
  </div>
  {state?.errors?.email && <p className="text-xs text-error">{state.errors.email[0]}</p>}
</div>
```

- [ ] **Paso 3: Email requerido en formulario de edición (`edit-student-form.tsx`)**

Cambiar la prop `defaultEmail: string | null` a `defaultEmail: string`:

```tsx
type Props = {
  enrollmentId: string
  defaultName: string
  defaultDni: string
  defaultEmail: string
  defaultCareerId: string | null
  careers: Career[]
}
```

Cambiar el input de email:

```tsx
<div className="flex flex-col gap-2">
  <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Correo *</label>
  <div className="relative">
    <AtSign size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
    <input name="email" type="email" required defaultValue={defaultEmail}
      className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
  </div>
  {state?.errors?.email && <p className="text-xs text-error">{state.errors.email[0]}</p>}
</div>
```

- [ ] **Paso 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "students\.ts|student-form|edit-student" | head -10
```

Salida esperada: sin errores en esos archivos.

---

## Task 3: app/lib/student-session.ts

**Files:**
- Create: `app/lib/student-session.ts`

- [ ] **Paso 1: Crear el archivo**

```ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type StudentSessionPayload = {
  studentId: string
  email: string
  name: string
  expiresAt: Date
}

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function createStudentSession(studentId: string, email: string, name: string) {
  const days = parseInt(process.env.STUDENT_SESSION_DAYS ?? '7', 10)
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const token = await new SignJWT({ studentId, email, name, expiresAt: expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(encodedKey)

  const cookieStore = await cookies()
  cookieStore.set('student-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('student-session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] })
    return payload as unknown as StudentSessionPayload
  } catch {
    return null
  }
}

export async function deleteStudentSession() {
  const cookieStore = await cookies()
  cookieStore.delete('student-session')
}

export async function requireStudentSession(): Promise<StudentSessionPayload> {
  const session = await getStudentSession()
  if (!session) redirect('/portal/login')
  return session
}
```

- [ ] **Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "student-session" | head -5
```

Salida esperada: sin errores.

---

## Task 4: sendMagicLinkEmail en email.ts

**Files:**
- Modify: `app/lib/email.ts`

- [ ] **Paso 1: Agregar `sendMagicLinkEmail` al final del archivo**

```ts
export async function sendMagicLinkEmail(to: string, name: string, magicUrl: string) {
  const minutes = process.env.MAGIC_LINK_MINUTES ?? '15'

  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#1a1a2e;letter-spacing:-1px;">
      Tu link de acceso
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
      Hola <strong>${name}</strong>, solicitaste acceso a tu portal de certificados.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#444;line-height:1.7;">
      Hacé clic en el botón para ingresar. Este enlace expirará en <strong>${minutes} minutos</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="background:#1a1a2e;border-radius:8px;padding:16px 32px;">
          <a href="${magicUrl}" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
            Ingresar a mis certificados →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:12px;color:#999;">
      Si no solicitaste este acceso, podés ignorar este correo.
    </p>
    <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
      Si no podés hacer clic en el botón, copiá y pegá esta URL:<br/>
      <span style="color:#1a1a2e;word-break:break-all;">${magicUrl}</span>
    </p>
  `

  await transporter.sendMail({
    from: `"${PROJECT_NAME}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Tu link de acceso — ${PROJECT_NAME}`,
    html: baseTemplate(content),
  })
}
```

---

## Task 5: app/actions/student-portal.ts

**Files:**
- Create: `app/actions/student-portal.ts`

- [ ] **Paso 1: Crear el archivo**

```ts
'use server'

import { SignJWT } from 'jose'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { sendMagicLinkEmail } from '@/app/lib/email'
import { requireStudentSession, deleteStudentSession } from '@/app/lib/student-session'

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function sendMagicLink(
  _prevState: unknown,
  formData: FormData
): Promise<{ message: string; success?: boolean }> {
  const genericOk = {
    message: 'Si tu email está registrado, recibirás un link en los próximos minutos.',
    success: true,
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return genericOk

  const student = await prisma.student.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })
  if (!student) return genericOk

  const minutes = parseInt(process.env.MAGIC_LINK_MINUTES ?? '15', 10)

  const token = await new SignJWT({
    studentId: student.id,
    email: student.email,
    name: student.name,
    type: 'magic-link',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(encodedKey)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const magicUrl = `${appUrl}/portal/login/verify?token=${token}`

  try {
    await sendMagicLinkEmail(student.email, student.name, magicUrl)
  } catch {
    // no revelar si el envío falló (misma respuesta genérica)
  }

  return genericOk
}

export async function getMyCertificates() {
  const session = await requireStudentSession()

  return prisma.certificate.findMany({
    where: {
      studentId: session.studentId,
      status: { in: ['ISSUED', 'REGISTERED'] },
    },
    include: {
      process: {
        include: {
          institution: { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
      career: { select: { name: true } },
    },
    orderBy: { issuedAt: 'desc' },
  })
}

export async function getMyProfile() {
  const session = await requireStudentSession()

  return prisma.student.findUnique({
    where: { id: session.studentId },
    select: { name: true, dni: true, email: true },
  })
}

export async function logoutStudent() {
  await deleteStudentSession()
  redirect('/portal/login')
}
```

- [ ] **Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "student-portal" | head -5
```

Salida esperada: sin errores.

---

## Task 6: Portal layout

**Files:**
- Create: `app/(portal)/layout.tsx`

- [ ] **Paso 1: Crear el layout**

```tsx
import Link from 'next/link'
import { getStudentSession } from '@/app/lib/student-session'
import { logoutStudent } from '@/app/actions/student-portal'
import { PROJECT_NAME } from '@/app/lib/config'
import { GraduationCap, User, LogOut } from 'lucide-react'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getStudentSession()

  return (
    <div className="min-h-screen bg-surface-container-low">
      <header className="bg-white border-b border-surface-container sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap size={20} strokeWidth={1.75} className="text-primary-container" />
            <span className="font-extrabold text-on-surface tracking-tight">{PROJECT_NAME}</span>
            <span className="hidden sm:inline text-xs text-secondary font-medium">· Portal Estudiante</span>
          </div>
          {session && (
            <div className="flex items-center gap-4">
              <Link
                href="/portal/profile"
                className="hidden sm:flex items-center gap-1.5 text-sm text-secondary hover:text-on-surface transition-colors"
              >
                <User size={14} strokeWidth={1.75} />
                {session.name}
              </Link>
              <form action={logoutStudent}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-sm text-secondary hover:text-error transition-colors"
                >
                  <LogOut size={14} strokeWidth={1.75} />
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
```

---

## Task 7: Página de login + LoginForm

**Files:**
- Create: `app/(portal)/portal/login/page.tsx`
- Create: `app/(portal)/portal/login/login-form.tsx`

- [ ] **Paso 1: Crear `login-form.tsx` (client component)**

```tsx
'use client'

import { useActionState } from 'react'
import { sendMagicLink } from '@/app/actions/student-portal'
import { AtSign, Send, Loader2, CheckCircle2 } from 'lucide-react'

export default function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, null)

  if (state?.success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 size={40} strokeWidth={1.5} className="text-emerald-500 mx-auto mb-4" />
        <p className="font-semibold text-on-surface">{state.message}</p>
        <p className="text-sm text-secondary mt-2">Revisá tu bandeja de entrada y spam.</p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
          Correo electrónico
        </label>
        <div className="relative">
          <AtSign size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            name="email"
            type="email"
            required
            placeholder="tu@email.com"
            className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all"
          />
        </div>
      </div>

      {state?.message && !state.success && (
        <p className="text-sm text-error">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm"
      >
        {pending
          ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Enviando...</>
          : <><Send size={16} strokeWidth={1.75} />Enviar link de acceso</>}
      </button>
    </form>
  )
}
```

- [ ] **Paso 2: Crear `login/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getStudentSession } from '@/app/lib/student-session'
import { PROJECT_NAME } from '@/app/lib/config'
import LoginForm from './login-form'

export const metadata = { title: `${PROJECT_NAME} — Portal Estudiante` }

export default async function PortalLoginPage() {
  const session = await getStudentSession()
  if (session) redirect('/portal')

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-surface-container p-10 w-full max-w-md">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
            Portal Estudiante
          </p>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
            Acceder a mis certificados
          </h1>
          <p className="text-sm text-secondary mt-2">
            Ingresá tu email y te enviaremos un link de acceso instantáneo.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
```

---

## Task 8: Página verify (valida token → crea sesión)

**Files:**
- Create: `app/(portal)/portal/login/verify/page.tsx`

- [ ] **Paso 1: Crear la página**

```tsx
import { jwtVerify } from 'jose'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createStudentSession } from '@/app/lib/student-session'
import { PROJECT_NAME } from '@/app/lib/config'
import { AlertTriangle } from 'lucide-react'

export const metadata = { title: `${PROJECT_NAME} — Verificando acceso...` }

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) redirect('/portal/login')

  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] })

    if (payload.type !== 'magic-link') throw new Error('Invalid token type')

    await createStudentSession(
      payload.studentId as string,
      payload.email as string,
      payload.name as string,
    )
  } catch {
    return (
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-surface-container p-10 max-w-md w-full text-center">
          <AlertTriangle size={40} strokeWidth={1} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-on-surface">Link expirado o inválido</h1>
          <p className="text-sm text-secondary mt-2 mb-6">
            El link de acceso expiró o ya fue utilizado. Solicitá uno nuevo.
          </p>
          <Link
            href="/portal/login"
            className="inline-flex items-center gap-2 bg-primary-container text-white font-bold py-3 px-6 rounded-lg text-sm hover:bg-primary transition-colors"
          >
            Solicitar nuevo link
          </Link>
        </div>
      </div>
    )
  }

  redirect('/portal')
}
```

---

## Task 9: Portal home — lista de certificados

**Files:**
- Create: `app/(portal)/portal/page.tsx`
- Create: `app/(portal)/portal/copy-link-button.tsx`

- [ ] **Paso 1: Crear `copy-link-button.tsx` (client component)**

```tsx
'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary-container transition-colors"
      title="Copiar link de verificación"
    >
      {copied
        ? <><Check size={12} strokeWidth={2.5} className="text-emerald-500" />Copiado</>
        : <><Link2 size={12} strokeWidth={2} />Copiar link</>}
    </button>
  )
}
```

- [ ] **Paso 2: Crear `portal/page.tsx`**

```tsx
import Link from 'next/link'
import { requireStudentSession } from '@/app/lib/student-session'
import { getMyCertificates } from '@/app/actions/student-portal'
import { PROJECT_NAME } from '@/app/lib/config'
import { FileText, Download, ShieldCheck, BadgeCheck, GraduationCap } from 'lucide-react'
import CopyLinkButton from './copy-link-button'

export const metadata = { title: `${PROJECT_NAME} — Mis Certificados` }

const statusStyles = {
  ISSUED:     'bg-emerald-50 text-emerald-700',
  REGISTERED: 'bg-blue-50 text-blue-700',
}
const statusLabels = {
  ISSUED:     'Emitido',
  REGISTERED: 'En Blockchain',
}

export default async function PortalPage() {
  const session = await requireStudentSession()
  const certificates = await getMyCertificates()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">
          Portal Estudiante
        </p>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
          Mis Certificados
        </h1>
        <p className="text-sm text-secondary mt-1">
          Bienvenido, <span className="font-semibold text-on-surface">{session.name}</span>
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-container p-12 text-center">
          <GraduationCap size={40} strokeWidth={1} className="text-outline/40 mx-auto mb-4" />
          <p className="font-semibold text-on-surface">Aún no tenés certificados emitidos</p>
          <p className="text-sm text-secondary mt-1">Cuando tu institución emita un certificado, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => {
            const status = cert.status as 'ISSUED' | 'REGISTERED'
            const verifyUrl = `${appUrl}/verify/${cert.id}`
            return (
              <div
                key={cert.id}
                className="bg-white rounded-xl border border-surface-container p-6 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusStyles[status]}`}>
                      {status === 'REGISTERED'
                        ? <ShieldCheck size={10} strokeWidth={2.5} />
                        : <BadgeCheck size={10} strokeWidth={2.5} />}
                      {statusLabels[status]}
                    </span>
                  </div>
                  <p className="font-extrabold text-on-surface tracking-tight">
                    {cert.process.certificateType.name}
                  </p>
                  <p className="text-sm text-secondary mt-0.5">
                    {cert.process.name} · {cert.process.institution.name}
                  </p>
                  {cert.career && (
                    <p className="text-xs text-secondary mt-0.5">{cert.career.name}</p>
                  )}
                  {cert.issuedAt && (
                    <p className="text-xs text-outline mt-1">
                      Emitido el {new Date(cert.issuedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <CopyLinkButton url={verifyUrl} />
                  <a
                    href={`/api/certificates/${cert.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-primary-container hover:bg-primary text-white font-bold py-2 px-4 rounded-lg transition-colors text-xs"
                  >
                    <Download size={12} strokeWidth={2} />
                    Descargar PDF
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/portal/profile" className="text-xs text-secondary hover:text-on-surface transition-colors">
          <FileText size={12} strokeWidth={1.75} className="inline mr-1" />
          Ver mis datos personales
        </Link>
      </div>
    </div>
  )
}
```

---

## Task 10: Página de perfil

**Files:**
- Create: `app/(portal)/portal/profile/page.tsx`

- [ ] **Paso 1: Crear la página**

```tsx
import Link from 'next/link'
import { requireStudentSession } from '@/app/lib/student-session'
import { getMyProfile } from '@/app/actions/student-portal'
import { PROJECT_NAME } from '@/app/lib/config'
import { User, Hash, AtSign, ArrowLeft } from 'lucide-react'

export const metadata = { title: `${PROJECT_NAME} — Mi Perfil` }

export default async function ProfilePage() {
  await requireStudentSession()
  const student = await getMyProfile()

  if (!student) return null

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-on-surface transition-colors mb-4"
        >
          <ArrowLeft size={12} strokeWidth={2} />
          Mis certificados
        </Link>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-secondary mt-1">
          Tus datos están gestionados por tu institución.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-surface-container p-8 space-y-6">
        <Row icon={<User size={16} strokeWidth={1.75} className="text-secondary" />} label="Nombre" value={student.name} />
        <Row icon={<Hash size={16} strokeWidth={1.75} className="text-secondary" />} label="Cédula / DNI" value={student.dni} />
        <Row icon={<AtSign size={16} strokeWidth={1.75} className="text-secondary" />} label="Correo" value={student.email} />
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{label}</p>
        <p className="font-semibold text-on-surface mt-0.5">{value}</p>
      </div>
    </div>
  )
}
```

---

## Task 11: PDF route — aceptar student-session + corregir verifyUrl

**Files:**
- Modify: `app/api/certificates/[id]/pdf/route.ts`

- [ ] **Paso 1: Reemplazar el contenido completo**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'
import { getStudentSession } from '@/app/lib/student-session'
import { prisma } from '@/app/lib/prisma'
import { generateCertificatePdf } from '@/app/lib/pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  const studentSession = await getStudentSession()

  if (!session?.userId && !studentSession?.studentId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id } = await params

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, dni: true } },
      career: { select: { name: true } },
      process: {
        include: {
          institution: { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
    },
  })

  if (!cert) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })

  // Un estudiante solo puede descargar sus propios certificados
  if (studentSession?.studentId && !session?.userId) {
    if (cert.studentId !== studentSession.studentId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const pdfBytes = await generateCertificatePdf({
    id: cert.id,
    studentName: cert.student.name,
    studentDni: cert.student.dni,
    careerName: cert.career?.name ?? null,
    eventName: cert.process.name,
    eventDate: cert.process.date,
    institutionName: cert.process.institution.name,
    certificateTypeName: cert.process.certificateType.name,
    issuedAt: cert.issuedAt ?? cert.createdAt,
    verifyUrl: `${appUrl}/verify/${cert.id}`,
  })

  const safeName = cert.student.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const filename = `certificado-${safeName}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "pdf/route|student-session" | head -5
```

Salida esperada: sin errores.

---

## Task 12: Variables de entorno + README

**Files:**
- Modify: `README.md`

- [ ] **Paso 1: Agregar las nuevas variables a la sección "Variables de entorno" del README**

En el bloque `env` de la sección "Variables de entorno", agregar al final:

```env
# Portal Estudiante
STUDENT_SESSION_DAYS=7       # duración de la cookie de sesión del estudiante (default: 7)
MAGIC_LINK_MINUTES=15        # tiempo de vida del magic link enviado al email (default: 15)
```

- [ ] **Paso 2: Agregar la ruta del portal a la sección "Estructura" del README**

En el árbol de directorios, bajo `verify/[id]/`, agregar:

```
├── portal/                        # Portal del estudiante (magic link)
│   ├── login/                     # Formulario de email + verify token
│   └── profile/                   # Datos personales (solo lectura)
```

- [ ] **Paso 3: Agregar el rol estudiante a la sección de acceso**

En la sección "Roles" del README, agregar:

```markdown
| Estudiante | Accede vía magic link a `/portal` — ve sus certificados, descarga PDFs, comparte links de verificación |
```

---

## Verificación final

- [ ] Ejecutar `pnpm dev`
- [ ] Ir a `/portal/login` sin sesión → debe mostrar el formulario
- [ ] Antes de testear el magic link, confirmar que el seed tiene emails en los estudiantes o actualizar uno manualmente en Prisma Studio (`pnpm db:studio`)
- [ ] Ingresar el email de un estudiante del seed → debe llegar email con link
- [ ] Hacer click en el link → debe redirigir a `/portal` con los certificados del estudiante
- [ ] Verificar que `/portal/profile` muestra nombre, DNI y email
- [ ] Descargar un PDF desde el portal → debe funcionar
- [ ] Copiar link → debe copiar `APP_URL/verify/[id]` al clipboard
- [ ] Cerrar sesión → debe redirigir a `/portal/login`
- [ ] Abrir `/portal` sin sesión → debe redirigir a `/portal/login`
- [ ] Usar un token vencido en `/portal/login/verify?token=xxx` → debe mostrar "Link expirado"
- [ ] Ingresar email inexistente → debe mostrar el mensaje genérico (no revelar si existe)
- [ ] Como ADMIN en el dashboard, abrir el PDF de un certificado → debe seguir funcionando
