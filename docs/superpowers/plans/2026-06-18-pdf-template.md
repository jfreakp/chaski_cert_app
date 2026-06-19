# PDF Template Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a usuarios UNIVERSITY subir una plantilla PDF por proceso, posicionar el nombre del estudiante con un click sobre la vista previa, configurar fuente/tamaño/color, y ofrecer ambos PDFs (sistema + plantilla) como opciones de descarga.

**Architecture:** Server actions en `process-template.ts` manejan upload/delete/settings via MinIO. El `TemplateEditor` es un Client Component con estado local que embebe el PDF en `<object>` con un overlay transparente para captura de clicks. El endpoint `/api/certificates/[id]/pdf?type=custom` genera el PDF custom usando `pdf-lib` sobre la plantilla almacenada.

**Tech Stack:** Next.js 16 App Router, Prisma 7, pdf-lib (ya instalado), @aws-sdk/client-s3 (MinIO, ya instalado), React 19, Tailwind CSS v4

## Global Constraints

- No hay framework de tests — verificar con `pnpm build`
- No hacer commits — el usuario los maneja
- `nameFontFamily` almacena el nombre PostScript de la fuente (ej. `"Helvetica-Bold"`, `"Times-Roman"`) — compatible directo con `doc.embedFont()` de pdf-lib casteado a `StandardFonts`
- `nameX` es el centro horizontal del texto (el render hace `x = nameX - textWidth/2`)
- `nameY` es el baseline del texto en coordenadas PDF (origen bottom-left)
- Coordenadas de click se convierten: `pdfX = clickX / displayScale`, `pdfY = pdfHeight - clickY / displayScale`
- `displayScale = min(800, pdfWidth) / pdfWidth`
- Estilos: `bg-white rounded-xl shadow-sm border border-surface-container`, labels `text-[10px] font-extrabold uppercase tracking-widest text-secondary`
- El QR en el PDF custom va en esquina inferior derecha: `x = pageWidth - 90, y = 20, width = 70, height = 70`

---

## Task 1: Schema migration — 5 campos nuevos en `CertificateProcess`

**Files:**
- Modify: `prisma/schema.prisma` (líneas 61-63, después de `nameY`)

**Interfaces:**
- Produces: campos `pdfWidth Float?`, `pdfHeight Float?`, `nameFontSize Float?`, `nameFontFamily String?`, `nameColor String?` disponibles en todos los queries de `certificateProcess`

- [ ] **Step 1: Agregar los 5 campos al modelo `CertificateProcess` en `schema.prisma`**

Reemplazar el bloque:
```prisma
  templateKey       String?
  nameX             Float?
  nameY             Float?
  createdAt         DateTime @default(now())
```

Con:
```prisma
  templateKey       String?
  nameX             Float?
  nameY             Float?
  pdfWidth          Float?
  pdfHeight         Float?
  nameFontSize      Float?
  nameFontFamily    String?
  nameColor         String?
  createdAt         DateTime @default(now())
```

- [ ] **Step 2: Ejecutar la migración**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm db:migrate
```

Cuando pida nombre: escribir `add_template_metadata`

Resultado esperado: `✓ Your database is now in sync with your schema.`

- [ ] **Step 3: Verificar build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | grep -E "✓|error" | head -10
```

Resultado esperado: `✓ Compiled successfully`

---

## Task 2: API route `GET /api/processes/[id]/template`

**Files:**
- Create: `app/api/processes/[id]/template/route.ts`

**Interfaces:**
- Consumes: `downloadTemplate(key)` de `@/app/lib/storage`
- Produces: endpoint `GET /api/processes/[id]/template` → `Content-Type: application/pdf`

- [ ] **Step 1: Crear `app/api/processes/[id]/template/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { downloadTemplate } from '@/app/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id } = await params

  const proc = await prisma.certificateProcess.findUnique({
    where: { id },
    select: { templateKey: true },
  })

  if (!proc?.templateKey) {
    return NextResponse.json({ error: 'Sin plantilla.' }, { status: 404 })
  }

  const buffer = await downloadTemplate(proc.templateKey)

  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'application/pdf' },
  })
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | grep -E "✓|error" | head -10
```

Resultado esperado: `✓ Compiled successfully`

---

## Task 3: Server actions `process-template.ts`

**Files:**
- Create: `app/actions/process-template.ts`

**Interfaces:**
- Consumes: `uploadTemplate`, `deleteTemplate` de `@/app/lib/storage`; `requireInstitution` de `@/app/lib/dal`; `PDFDocument` de `pdf-lib`
- Produces:
  - `uploadProcessTemplate(processId, _, formData) → Promise<{ message?: string; pdfWidth?: number; pdfHeight?: number; nameX?: number; nameY?: number } | undefined>`
  - `removeProcessTemplate(processId) → Promise<void>`
  - `updateTemplateSettings(processId, { nameX, nameY, nameFontSize, nameFontFamily, nameColor }) → Promise<{ success: boolean }>`

- [ ] **Step 1: Crear `app/actions/process-template.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { PDFDocument } from 'pdf-lib'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { uploadTemplate, deleteTemplate } from '@/app/lib/storage'

type UploadState =
  | { message?: string; pdfWidth?: number; pdfHeight?: number; nameX?: number; nameY?: number }
  | undefined

export async function uploadProcessTemplate(
  processId: string,
  _: UploadState,
  formData: FormData
): Promise<UploadState> {
  const { institutionId } = await requireInstitution()

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { institutionId: true, templateKey: true },
  })
  if (!proc || proc.institutionId !== institutionId) return { message: 'Proceso no encontrado.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { message: 'Selecciona un archivo PDF.' }
  if (file.type !== 'application/pdf') return { message: 'El archivo debe ser un PDF.' }

  const buffer = Buffer.from(await file.arrayBuffer())

  let pdfDoc: PDFDocument
  try {
    pdfDoc = await PDFDocument.load(buffer)
  } catch {
    return { message: 'El archivo PDF no es válido o está dañado.' }
  }

  const page = pdfDoc.getPages()[0]
  const { width: pdfWidth, height: pdfHeight } = page.getSize()

  if (proc.templateKey) {
    try { await deleteTemplate(proc.templateKey) } catch { /* ignorar */ }
  }

  const key = `templates/${processId}.pdf`
  await uploadTemplate(key, buffer)

  const nameX = pdfWidth / 2
  const nameY = pdfHeight / 3

  await prisma.certificateProcess.update({
    where: { id: processId },
    data: {
      templateKey:    key,
      pdfWidth,
      pdfHeight,
      nameX,
      nameY,
      nameFontSize:   28,
      nameFontFamily: 'Helvetica-Bold',
      nameColor:      '#0d0d1e',
    },
  })

  revalidatePath(`/dashboard/processes/${processId}/edit`)
  return { pdfWidth, pdfHeight, nameX, nameY }
}

export async function removeProcessTemplate(processId: string): Promise<void> {
  const { institutionId } = await requireInstitution()

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { institutionId: true, templateKey: true },
  })
  if (!proc || proc.institutionId !== institutionId || !proc.templateKey) return

  try { await deleteTemplate(proc.templateKey) } catch { /* ignorar */ }

  await prisma.certificateProcess.update({
    where: { id: processId },
    data: {
      templateKey:    null,
      pdfWidth:       null,
      pdfHeight:      null,
      nameX:          null,
      nameY:          null,
      nameFontSize:   null,
      nameFontFamily: null,
      nameColor:      null,
    },
  })

  revalidatePath(`/dashboard/processes/${processId}/edit`)
}

export async function updateTemplateSettings(
  processId: string,
  settings: {
    nameX:          number
    nameY:          number
    nameFontSize:   number
    nameFontFamily: string
    nameColor:      string
  }
): Promise<{ success: boolean }> {
  const { institutionId } = await requireInstitution()

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { institutionId: true },
  })
  if (!proc || proc.institutionId !== institutionId) return { success: false }

  await prisma.certificateProcess.update({
    where: { id: processId },
    data:  settings,
  })

  revalidatePath(`/dashboard/processes/${processId}/edit`)
  return { success: true }
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | grep -E "✓|error" | head -10
```

Resultado esperado: `✓ Compiled successfully`

---

## Task 4: Componente `TemplateEditor`

**Files:**
- Create: `app/(dashboard)/dashboard/processes/[id]/edit/template-editor.tsx`

**Interfaces:**
- Consumes: `uploadProcessTemplate`, `removeProcessTemplate`, `updateTemplateSettings` (Task 3)
- Produces: `TemplateEditor({ processId: string, template: Template | null })` — exportado default
  - `Template = { pdfWidth, pdfHeight, nameX, nameY, nameFontSize, nameFontFamily, nameColor }`

- [ ] **Step 1: Crear `app/(dashboard)/dashboard/processes/[id]/edit/template-editor.tsx`**

```tsx
'use client'

import { useState, useEffect, useTransition, useActionState } from 'react'
import { uploadProcessTemplate, removeProcessTemplate, updateTemplateSettings } from '@/app/actions/process-template'
import { Upload, Trash2, Save, Loader2 } from 'lucide-react'

type Template = {
  pdfWidth:       number
  pdfHeight:      number
  nameX:          number
  nameY:          number
  nameFontSize:   number
  nameFontFamily: string
  nameColor:      string
}

const FONT_OPTIONS = [
  { value: 'Helvetica',      label: 'Helvetica' },
  { value: 'Helvetica-Bold', label: 'Helvetica Negrita' },
  { value: 'Times-Roman',    label: 'Times Roman' },
  { value: 'Times-Bold',     label: 'Times Negrita' },
  { value: 'Courier',        label: 'Courier' },
  { value: 'Courier-Bold',   label: 'Courier Negrita' },
]

const MAX_DISPLAY_WIDTH = 800

export default function TemplateEditor({
  processId,
  template: initialTemplate,
}: {
  processId:       string
  template: Template | null
}) {
  const [template,    setTemplate]    = useState<Template | null>(initialTemplate)
  const [nameX,       setNameX]       = useState(initialTemplate?.nameX       ?? 0)
  const [nameY,       setNameY]       = useState(initialTemplate?.nameY       ?? 0)
  const [fontSize,    setFontSize]    = useState(initialTemplate?.nameFontSize   ?? 28)
  const [fontFamily,  setFontFamily]  = useState(initialTemplate?.nameFontFamily ?? 'Helvetica-Bold')
  const [color,       setColor]       = useState(initialTemplate?.nameColor      ?? '#0d0d1e')
  const [saveMsg,     setSaveMsg]     = useState<string | null>(null)
  const [saving,      startSave]      = useTransition()
  const [removing,    startRemove]    = useTransition()

  const boundUpload = uploadProcessTemplate.bind(null, processId)
  const [uploadState, uploadAction, uploading] = useActionState(boundUpload, undefined)

  // Sincronizar estado local tras upload exitoso
  useEffect(() => {
    if (uploadState?.pdfWidth && uploadState?.pdfHeight) {
      const t: Template = {
        pdfWidth:       uploadState.pdfWidth,
        pdfHeight:      uploadState.pdfHeight,
        nameX:          uploadState.nameX ?? uploadState.pdfWidth / 2,
        nameY:          uploadState.nameY ?? uploadState.pdfHeight / 3,
        nameFontSize:   28,
        nameFontFamily: 'Helvetica-Bold',
        nameColor:      '#0d0d1e',
      }
      setTemplate(t)
      setNameX(t.nameX)
      setNameY(t.nameY)
      setFontSize(28)
      setFontFamily('Helvetica-Bold')
      setColor('#0d0d1e')
    }
  }, [uploadState])

  const pdfWidth     = template?.pdfWidth  ?? 595
  const pdfHeight    = template?.pdfHeight ?? 842
  const displayWidth = Math.min(MAX_DISPLAY_WIDTH, pdfWidth)
  const displayScale = displayWidth / pdfWidth
  const displayHeight = pdfHeight * displayScale

  function handlePickerClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pdfX = (e.clientX - rect.left)  / displayScale
    const pdfY = pdfHeight - (e.clientY - rect.top) / displayScale
    setNameX(Math.round(pdfX * 10) / 10)
    setNameY(Math.round(pdfY * 10) / 10)
  }

  function handleSave() {
    startSave(async () => {
      const result = await updateTemplateSettings(processId, {
        nameX, nameY, nameFontSize: fontSize, nameFontFamily: fontFamily, nameColor: color,
      })
      setSaveMsg(result.success ? '¡Configuración guardada!' : 'Error al guardar.')
      setTimeout(() => setSaveMsg(null), 3000)
    })
  }

  function handleRemove() {
    if (!confirm('¿Eliminar la plantilla PDF de este proceso?')) return
    startRemove(async () => {
      await removeProcessTemplate(processId)
      setTemplate(null)
    })
  }

  // ── Sin plantilla ─────────────────────────────────────────────────────────
  if (!template) {
    return (
      <form action={uploadAction} className="space-y-4">
        <div className="border-2 border-dashed border-surface-container rounded-xl p-8 text-center">
          <Upload size={32} strokeWidth={1} className="mx-auto text-outline/40 mb-3" />
          <p className="text-sm font-medium text-secondary mb-4">
            Sube un PDF como plantilla del certificado
          </p>
          <input
            type="file"
            name="file"
            accept=".pdf,application/pdf"
            required
            className="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary-container file:text-white hover:file:bg-primary cursor-pointer"
          />
        </div>
        {uploadState?.message && (
          <p className="text-xs text-error">{uploadState.message}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all disabled:opacity-60"
          >
            {uploading
              ? <><Loader2 size={14} strokeWidth={2} className="animate-spin" />Subiendo...</>
              : <><Upload size={14} strokeWidth={1.75} />Subir plantilla</>}
          </button>
        </div>
      </form>
    )
  }

  // ── Con plantilla: preview + controles ────────────────────────────────────
  const previewLeft   = (nameX / pdfWidth)  * displayWidth   // px desde izquierda del overlay
  const previewBottom = (nameY / pdfHeight) * displayHeight   // px desde abajo del overlay
  const previewFontSize = fontSize * displayScale

  return (
    <div className="space-y-4">
      {/* Zona de preview */}
      <div
        className="rounded-lg overflow-hidden border border-surface-container mx-auto"
        style={{ width: displayWidth, height: displayHeight, position: 'relative' }}
      >
        <object
          data={`/api/processes/${processId}/template#toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        >
          <p className="text-xs text-secondary p-4">
            Tu navegador no soporta la vista previa del PDF.
          </p>
        </object>

        {/* Overlay de captura de clicks */}
        <div
          style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 10 }}
          onClick={handlePickerClick}
          title="Clic para posicionar el nombre del estudiante"
        />

        {/* Preview del nombre */}
        <div
          style={{
            position:    'absolute',
            left:        previewLeft,
            bottom:      previewBottom,
            transform:   'translateX(-50%)',
            fontSize:    previewFontSize,
            color,
            fontWeight:  fontFamily.includes('Bold') ? 'bold' : 'normal',
            fontFamily:  fontFamily.includes('Times')
              ? 'serif'
              : fontFamily.includes('Courier')
              ? 'monospace'
              : 'sans-serif',
            pointerEvents: 'none',
            zIndex:        20,
            whiteSpace:    'nowrap',
            userSelect:    'none',
            lineHeight:    1,
          }}
        >
          Nombre del Estudiante
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Tipo de letra
          </label>
          <select
            value={fontFamily}
            onChange={e => setFontFamily(e.target.value)}
            className="py-2 px-3 bg-surface-container-low border border-transparent rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none appearance-none"
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Tamaño (pt)
          </label>
          <input
            type="number"
            value={Math.round(fontSize)}
            onChange={e => setFontSize(Number(e.target.value))}
            min={8}
            max={120}
            className="w-24 py-2 px-3 bg-surface-container-low border border-transparent rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Color
          </label>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-[38px] w-16 rounded-lg border border-surface-container cursor-pointer bg-surface-container-low p-0.5"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">X (pt)</label>
          <input
            type="number"
            value={Math.round(nameX)}
            onChange={e => setNameX(Number(e.target.value))}
            className="w-24 py-2 px-3 bg-surface-container-low border border-transparent rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Y (pt)</label>
          <input
            type="number"
            value={Math.round(nameY)}
            onChange={e => setNameY(Number(e.target.value))}
            className="w-24 py-2 px-3 bg-surface-container-low border border-transparent rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none"
          />
        </div>

        <div className="flex items-end gap-3 ml-auto">
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg text-sm font-bold text-error hover:bg-error-container/10 transition-all disabled:opacity-60"
          >
            {removing
              ? <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              : <Trash2 size={14} strokeWidth={1.75} />}
            Eliminar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all disabled:opacity-60"
          >
            {saving
              ? <><Loader2 size={14} strokeWidth={2} className="animate-spin" />Guardando...</>
              : <><Save size={14} strokeWidth={1.75} />Guardar</>}
          </button>
        </div>
      </div>

      {saveMsg && (
        <p className={`text-xs font-medium ${saveMsg.startsWith('¡') ? 'text-emerald-600' : 'text-error'}`}>
          {saveMsg}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | grep -E "✓|error" | head -10
```

Resultado esperado: `✓ Compiled successfully`

---

## Task 5: Integrar `TemplateEditor` en `edit/page.tsx`

**Files:**
- Modify: `app/(dashboard)/dashboard/processes/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `TemplateEditor` (Task 4)
- Produces: página de edición que muestra form + sección de plantilla PDF debajo

- [ ] **Step 1: Reemplazar `edit/page.tsx` completo**

```tsx
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditProcessForm from './edit-process-form'
import TemplateEditor from './template-editor'

export const metadata = { title: `${PROJECT_NAME} — Editar Proceso` }

export default async function EditProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard/processes')

  const { id } = await params

  const [proc, certTypes, careers] = await Promise.all([
    prisma.certificateProcess.findUnique({
      where: { id },
      select: {
        id:                true,
        name:              true,
        description:       true,
        date:              true,
        certificateTypeId: true,
        careerId:          true,
        institutionId:     true,
        templateKey:       true,
        pdfWidth:          true,
        pdfHeight:         true,
        nameX:             true,
        nameY:             true,
        nameFontSize:      true,
        nameFontFamily:    true,
        nameColor:         true,
      },
    }),
    prisma.certificateType.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, requiresCareer: true },
      orderBy: { name: 'asc' },
    }),
    prisma.career.findMany({
      where:   { institutionId: institutionId!, isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!proc) notFound()

  const template =
    proc.templateKey && proc.pdfWidth && proc.pdfHeight
      ? {
          pdfWidth:       proc.pdfWidth,
          pdfHeight:      proc.pdfHeight,
          nameX:          proc.nameX          ?? proc.pdfWidth / 2,
          nameY:          proc.nameY          ?? proc.pdfHeight / 3,
          nameFontSize:   proc.nameFontSize   ?? 28,
          nameFontFamily: proc.nameFontFamily ?? 'Helvetica-Bold',
          nameColor:      proc.nameColor      ?? '#0d0d1e',
        }
      : null

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Procesos</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Editar Proceso</h1>
        <p className="text-secondary mt-2 text-sm">{proc.name}</p>
      </div>

      <div className="max-w-2xl">
        <EditProcessForm
          processId={proc.id}
          defaultName={proc.name}
          defaultDescription={proc.description}
          defaultDate={proc.date.toISOString().split('T')[0]}
          defaultCertificateTypeId={proc.certificateTypeId}
          defaultCareerId={proc.careerId}
          certTypes={certTypes}
          careers={careers}
        />
      </div>

      <div className="mt-10 pt-8 border-t border-surface-container">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary block mb-6">
          Plantilla PDF del Certificado
        </span>
        <TemplateEditor processId={proc.id} template={template} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | grep -E "✓|error" | head -10
```

Resultado esperado: `✓ Compiled successfully`

---

## Task 6: `generateCustomCertificatePdf` + ruta `?type=custom`

**Files:**
- Modify: `app/lib/pdf.ts`
- Modify: `app/api/certificates/[id]/pdf/route.ts`

**Interfaces:**
- Consumes: `downloadTemplate` de `@/app/lib/storage`; `PDFDocument`, `StandardFonts`, `rgb` de `pdf-lib`; `QRCode` de `qrcode` (ya importado en pdf.ts)
- Produces: `generateCustomCertificatePdf(data: CustomCertificatePdfData): Promise<Uint8Array>`; endpoint `GET /api/certificates/[id]/pdf?type=custom`

- [ ] **Step 1: Agregar `generateCustomCertificatePdf` al final de `app/lib/pdf.ts`**

Primero agregar el import de `downloadTemplate` al inicio del archivo (después de `import 'server-only'`):

```ts
import { downloadTemplate } from './storage'
```

Luego agregar al final del archivo:

```ts
export interface CustomCertificatePdfData {
  studentName:    string
  verifyUrl:      string
  templateKey:    string
  nameX:          number
  nameY:          number
  nameFontSize:   number
  nameFontFamily: string  // nombre PostScript, ej. "Helvetica-Bold"
  nameColor:      string  // hex, ej. "#0d0d1e"
}

export async function generateCustomCertificatePdf(data: CustomCertificatePdfData): Promise<Uint8Array> {
  const buffer = await downloadTemplate(data.templateKey)
  const doc    = await PDFDocument.load(buffer)
  const page   = doc.getPages()[0]
  const font   = await doc.embedFont(data.nameFontFamily as StandardFonts)

  const hex = data.nameColor.replace('#', '')
  const r   = parseInt(hex.slice(0, 2), 16) / 255
  const g   = parseInt(hex.slice(2, 4), 16) / 255
  const b   = parseInt(hex.slice(4, 6), 16) / 255

  const textWidth = font.widthOfTextAtSize(data.studentName, data.nameFontSize)

  page.drawText(data.studentName, {
    x:     data.nameX - textWidth / 2,
    y:     data.nameY,
    size:  data.nameFontSize,
    font,
    color: rgb(r, g, b),
  })

  const { width, height } = page.getSize()
  const qrPngBuffer = await QRCode.toBuffer(data.verifyUrl, { width: 80, margin: 1 })
  const qrImage     = await doc.embedPng(qrPngBuffer)
  page.drawImage(qrImage, { x: width - 90, y: 20, width: 70, height: 70 })

  return doc.save()
}
```

- [ ] **Step 2: Agregar soporte `?type=custom` en `app/api/certificates/[id]/pdf/route.ts`**

Agregar el import al inicio del archivo:
```ts
import { generateCertificatePdf, generateCustomCertificatePdf } from '@/app/lib/pdf'
```

(Reemplaza el import existente de `generateCertificatePdf` para incluir también `generateCustomCertificatePdf`.)

Luego, en la función `GET`, insertar el bloque custom ANTES de la construcción de `pdfBytes` existente (es decir, después de la validación del certificado y antes del `generateCertificatePdf`):

```ts
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const safeName = cert.student.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

  // ── PDF con plantilla custom ──────────────────────────────────────────────
  const type = _req.nextUrl.searchParams.get('type')

  if (type === 'custom') {
    const proc = await prisma.certificateProcess.findUnique({
      where: { id: cert.processId },
      select: {
        templateKey:    true,
        nameX:          true,
        nameY:          true,
        nameFontSize:   true,
        nameFontFamily: true,
        nameColor:      true,
      },
    })

    if (!proc?.templateKey || proc.nameX == null || proc.nameY == null) {
      return NextResponse.json({ error: 'Sin plantilla configurada.' }, { status: 404 })
    }

    const pdfBytes = await generateCustomCertificatePdf({
      studentName:    cert.student.name,
      verifyUrl:      `${appUrl}/verify/${cert.id}`,
      templateKey:    proc.templateKey,
      nameX:          proc.nameX,
      nameY:          proc.nameY,
      nameFontSize:   proc.nameFontSize   ?? 28,
      nameFontFamily: proc.nameFontFamily ?? 'Helvetica-Bold',
      nameColor:      proc.nameColor      ?? '#0d0d1e',
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-plantilla-${safeName}.pdf"`,
      },
    })
  }
  // ── PDF del sistema (flujo existente) ─────────────────────────────────────
```

Nota: mover la declaración `const appUrl` y `const safeName` antes del nuevo bloque (si ya estaban declaradas después, reorganizar para que estén disponibles en ambos bloques).

- [ ] **Step 3: Verificar build**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | grep -E "✓|error" | head -10
```

Resultado esperado: `✓ Compiled successfully`

---

## Task 7: Botones de descarga — dashboard y portal

**Files:**
- Modify: `app/(dashboard)/dashboard/processes/[id]/certificate-table.tsx`
- Modify: `app/(dashboard)/dashboard/processes/[id]/page.tsx`
- Modify: `app/(portal)/portal/page.tsx`

**Interfaces:**
- Consumes: endpoint `/api/certificates/[id]/pdf?type=custom` (Task 6)
- Produces: botón "Descargar con plantilla" visible cuando el proceso tiene `templateKey`

- [ ] **Step 1: Modificar `certificate-table.tsx` para aceptar y usar `hasTemplate`**

Agregar `hasTemplate: boolean` al tipo de props y mostrarlo como segundo botón de descarga:

```tsx
// Tipo de props — agregar hasTemplate:
export default function CertificateTable({
  certificates,
  isAdmin,
  polygonscanBaseUrl,
  hasTemplate,
}: {
  certificates: Certificate[]
  isAdmin: boolean
  polygonscanBaseUrl: string
  hasTemplate: boolean
}) {
```

En la columna de acciones (actualmente solo tiene un `<a>` con `<Download>`), reemplazar con:

```tsx
<td className="px-6 py-4">
  <div className="flex items-center gap-1">
    <a
      href={`/api/certificates/${c.id}/pdf`}
      target="_blank"
      rel="noreferrer"
      className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all inline-flex"
      title="Descargar PDF del sistema"
    >
      <Download size={16} strokeWidth={1.75} />
    </a>
    {hasTemplate && (
      <a
        href={`/api/certificates/${c.id}/pdf?type=custom`}
        target="_blank"
        rel="noreferrer"
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all inline-flex"
        title="Descargar PDF con plantilla"
      >
        <FileText size={16} strokeWidth={1.75} />
      </a>
    )}
  </div>
</td>
```

Agregar `FileText` al import de lucide-react (ya está importado en la línea 3, agregarlo ahí).

- [ ] **Step 2: Modificar `processes/[id]/page.tsx` para pasar `hasTemplate` a `CertificateTable`**

En el query de `proc`, agregar `templateKey: true` al select de `CertificateProcess`. Actualmente el page hace `include` completo — buscar la sección donde se pasan props a `CertificateTable` y agregar:

```tsx
// Agregar después de computar certifiedStudentIds, pendingCount, etc.:
const hasTemplate = !!proc.templateKey

// En el render:
<CertificateTable
  certificates={proc.certificates}
  isAdmin={isAdmin}
  polygonscanBaseUrl={polygonscanBaseUrl}
  hasTemplate={hasTemplate}
/>
```

El query actual usa `include` completo en `certificateProcess`, por lo que `templateKey` ya viene incluido — solo hay que usar la prop.

- [ ] **Step 3: Modificar `portal/page.tsx` para mostrar botón de plantilla**

En el bloque de botones de cada certificado (actualmente: `CopyLinkButton` + `<a>Descargar PDF</a>`), agregar el segundo botón condicionado:

```tsx
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
  {cert.process.templateKey && (
    <a
      href={`/api/certificates/${cert.id}/pdf?type=custom`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 border border-primary-container text-primary-container hover:bg-primary-container/5 font-bold py-2 px-4 rounded-lg transition-colors text-xs"
    >
      <FileText size={12} strokeWidth={2} />
      Con plantilla
    </a>
  )}
</div>
```

Agregar `FileText` al import de lucide-react en `portal/page.tsx` (línea 5).

El campo `cert.process.templateKey` ya está disponible porque `getMyCertificates` usa `include: { process: { include: {...} } }`, que devuelve todos los campos escalares del proceso incluyendo `templateKey`.

- [ ] **Step 4: Verificar build final**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm build 2>&1 | tail -10
```

Resultado esperado: `✓ Compiled successfully in X.Xs` sin errores de TypeScript.

- [ ] **Step 5: Prueba manual en el navegador**

```bash
cd /Users/juanpablotorres/Documents/myworks/chaski_cert_app && pnpm dev
```

Verificar estos flujos:

1. **Editar proceso** → aparece sección "Plantilla PDF del Certificado" debajo del form
2. **Sin plantilla**: mostrar zona de drag-and-drop con input de archivo
3. **Subir PDF**: file input → botón "Subir plantilla" → preview del PDF aparece en el `<object>`
4. **Click en preview**: texto "Nombre del Estudiante" se mueve al punto clicado (centrado en X)
5. **Controles**: cambiar fuente/tamaño/color actualiza el preview inmediatamente
6. **Guardar**: botón "Guardar" llama `updateTemplateSettings` y muestra "¡Configuración guardada!"
7. **Eliminar**: confirmar dialog → plantilla se borra, vuelve al estado de upload
8. **Descarga sistema**: `/api/certificates/[id]/pdf` → PDF del sistema (sin cambios)
9. **Descarga plantilla**: `/api/certificates/[id]/pdf?type=custom` → PDF con nombre sobre plantilla
10. **Portal**: certificados con plantilla muestran botón "Con plantilla"
11. **Sin plantilla**: botón "Con plantilla" no aparece
