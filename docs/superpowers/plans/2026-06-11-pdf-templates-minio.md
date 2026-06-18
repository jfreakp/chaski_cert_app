# Plantillas PDF por Proceso + Almacenamiento MinIO — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada proceso de certificación tenga una plantilla PDF opcional; al descargar el certificado, si hay plantilla, se inserta el nombre del estudiante en coordenadas X/Y configurables.

**Architecture:** Se agrega MinIO como servicio Docker (compatible con S3). Un módulo `app/lib/storage.ts` encapsula toda la comunicación con MinIO usando `@aws-sdk/client-s3`. La lógica de PDF se mantiene en `pdf-lib` como hoy, pero en la ruta `/api/certificates/[id]/pdf` se elige entre generación programática (actual) o inserción sobre plantilla (nueva).

**Tech Stack:** `@aws-sdk/client-s3`, `pdf-lib` (ya instalada), Prisma (PostgreSQL), Next.js 16 Server Actions, React 19, MinIO Docker.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `app/lib/storage.ts` |
| Crear | `app/actions/templates.ts` |
| Crear | `app/(dashboard)/components/template-upload-section.tsx` |
| Modificar | `docker-compose.yml` |
| Modificar | `.env.example` |
| Modificar | `prisma/schema.prisma` |
| Modificar | `app/actions/processes.ts` |
| Modificar | `app/api/certificates/[id]/pdf/route.ts` |
| Modificar | `app/(dashboard)/dashboard/processes/new/process-form.tsx` |
| Modificar | `app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx` |
| Modificar | `app/(dashboard)/dashboard/processes/[id]/edit/page.tsx` |

---

## Task 1: Infraestructura — Docker MinIO + paquete SDK

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Agregar MinIO al docker-compose.yml**

Reemplazar el contenido completo de `docker-compose.yml` con:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: chaskicert_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: chaskicert
      POSTGRES_PASSWORD: chaskicert_pass
      POSTGRES_DB: chaskicert
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chaskicert -d chaskicert"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: chaskicert_minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: chaskicert
      MINIO_ROOT_PASSWORD: chaskicert_pass
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  minio_data:
```

- [ ] **Step 2: Agregar variables MinIO al .env.example**

Añadir al final de `.env.example`:

```bash
# MinIO (almacenamiento de plantillas PDF)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=chaskicert
MINIO_SECRET_KEY=chaskicert_pass
MINIO_BUCKET=chaski-templates
```

- [ ] **Step 3: Copiar las nuevas variables al .env local**

Abrir el archivo `.env.local` (o `.env`) del proyecto y agregar las 4 variables de MinIO con los mismos valores del step 2.

- [ ] **Step 4: Instalar el SDK de S3**

```bash
npm install @aws-sdk/client-s3
```

Verificar que aparece en `package.json` bajo `dependencies`.

- [ ] **Step 5: Levantar MinIO con Docker**

```bash
docker compose up minio -d
```

Abrir `http://localhost:9001` en el navegador. Iniciar sesión con usuario `chaskicert` y contraseña `chaskicert_pass`. Debe mostrar la consola de administración de MinIO.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example package.json package-lock.json
git commit -m "feat: add MinIO to docker-compose and install @aws-sdk/client-s3"
```

---

## Task 2: Módulo de almacenamiento `app/lib/storage.ts`

**Files:**
- Create: `app/lib/storage.ts`

- [ ] **Step 1: Crear el módulo**

Crear `app/lib/storage.ts` con el siguiente contenido:

```typescript
import 'server-only'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3'

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
})

const BUCKET = process.env.MINIO_BUCKET!

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
  }
}

export async function uploadTemplate(key: string, buffer: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  )
}

export async function downloadTemplate(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function deleteTemplate(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
npx tsc --noEmit
```

Esperado: sin errores relacionados con `storage.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/lib/storage.ts
git commit -m "feat: add MinIO storage module with upload/download/delete helpers"
```

---

## Task 3: Migración de base de datos — campos de plantilla

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar campos a CertificateProcess en el schema**

En `prisma/schema.prisma`, localizar el modelo `CertificateProcess` y agregar tres campos opcionales después de `isActive`:

```prisma
model CertificateProcess {
  id                String   @id @default(uuid())
  name              String
  description       String?
  date              DateTime
  isActive          Boolean  @default(true)
  templateKey       String?
  nameX             Float?
  nameY             Float?
  createdAt         DateTime @default(now())

  institutionId     String
  institution       Institution     @relation(fields: [institutionId], references: [id])

  certificateTypeId String
  certificateType   CertificateType @relation(fields: [certificateTypeId], references: [id])

  careerId          String?
  career            Career?         @relation(fields: [careerId], references: [id])

  participants  ProcessParticipant[]
  certificates  Certificate[]
}
```

- [ ] **Step 2: Crear y ejecutar la migración**

```bash
npm run db:migrate
```

Cuando pregunte el nombre de la migración, ingresar: `add_template_fields_to_certificate_process`

Esperado: migración ejecutada sin errores. Verificar en `prisma/migrations/` que existe la nueva carpeta.

- [ ] **Step 3: Verificar la migración en la DB**

```bash
npm run db:studio
```

Abrir `http://localhost:5555`, navegar a `CertificateProcess`. Verificar que existen las columnas `templateKey`, `nameX`, `nameY` (todas `null` en registros existentes).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add templateKey, nameX, nameY fields to CertificateProcess"
```

---

## Task 4: Server Action — previsualización y eliminación de plantilla

**Files:**
- Create: `app/actions/templates.ts`

- [ ] **Step 1: Crear el archivo de actions**

Crear `app/actions/templates.ts`:

```typescript
'use server'

import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { deleteTemplate } from '@/app/lib/storage'
import { revalidatePath } from 'next/cache'

export async function previewTemplate(
  formData: FormData
): Promise<{ pdfBase64?: string; error?: string }> {
  await requireInstitution()

  const file = formData.get('template') as File | null
  if (!file || file.size === 0) return { error: 'Selecciona un archivo PDF.' }
  if (file.type !== 'application/pdf') return { error: 'El archivo debe ser PDF.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'El archivo no puede superar 10 MB.' }

  const x = parseFloat(formData.get('nameX') as string)
  const y = parseFloat(formData.get('nameY') as string)
  if (isNaN(x) || isNaN(y) || x < 0 || y < 0) {
    return { error: 'Ingresá coordenadas X e Y válidas (números positivos).' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const pdfDoc = await PDFDocument.load(buffer)
  const page = pdfDoc.getPages()[0]
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  page.drawText('Juan Pérez (ejemplo)', {
    x,
    y,
    size: 28,
    font,
    color: rgb(0, 0, 0),
  })

  const pdfBytes = await pdfDoc.save()
  return { pdfBase64: Buffer.from(pdfBytes).toString('base64') }
}

export async function deleteProcessTemplate(
  processId: string
): Promise<{ error?: string }> {
  const { institutionId } = await requireInstitution()

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { institutionId: true, templateKey: true },
  })

  if (!proc || proc.institutionId !== institutionId) {
    return { error: 'Proceso no encontrado.' }
  }

  if (proc.templateKey) {
    await deleteTemplate(proc.templateKey)
  }

  await prisma.certificateProcess.update({
    where: { id: processId },
    data: { templateKey: null, nameX: null, nameY: null },
  })

  revalidatePath(`/dashboard/processes/${processId}/edit`)
  return {}
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/actions/templates.ts
git commit -m "feat: add previewTemplate and deleteProcessTemplate server actions"
```

---

## Task 5: Extender acciones de procesos para manejar plantillas

**Files:**
- Modify: `app/actions/processes.ts`

Este task modifica tres funciones existentes: `createProcess`, `updateProcess` y `deleteProcess`.

- [ ] **Step 1: Agregar imports de storage en processes.ts**

Al inicio de `app/actions/processes.ts`, agregar el import de storage junto a los existentes:

```typescript
import { ensureBucket, uploadTemplate, deleteTemplate } from '@/app/lib/storage'
```

- [ ] **Step 2: Reemplazar la función createProcess**

Reemplazar la función `createProcess` completa por:

```typescript
export async function createProcess(state: ProcessFormState, formData: FormData): Promise<ProcessFormState> {
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') return { message: 'Solo universidades pueden crear procesos.' }

  const validated = ProcessSchema.safeParse({
    name:              formData.get('name'),
    description:       formData.get('description'),
    date:              formData.get('date'),
    certificateTypeId: formData.get('certificateTypeId'),
    careerId:          formData.get('careerId') || undefined,
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as ProcessErrors }

  const id = crypto.randomUUID()

  let templateKey: string | null = null
  let nameX: number | null = null
  let nameY: number | null = null

  const templateFile = formData.get('template') as File | null
  if (templateFile && templateFile.size > 0) {
    if (templateFile.type !== 'application/pdf') return { message: 'La plantilla debe ser un archivo PDF.' }
    if (templateFile.size > 10 * 1024 * 1024) return { message: 'La plantilla no puede superar 10 MB.' }

    const x = parseFloat(formData.get('nameX') as string)
    const y = parseFloat(formData.get('nameY') as string)
    if (isNaN(x) || isNaN(y) || x < 0 || y < 0) {
      return { message: 'Ingresá coordenadas X e Y válidas para la plantilla.' }
    }

    await ensureBucket()
    const buffer = Buffer.from(await templateFile.arrayBuffer())
    await uploadTemplate(`templates/${id}.pdf`, buffer)
    templateKey = `templates/${id}.pdf`
    nameX = x
    nameY = y
  }

  await prisma.certificateProcess.create({
    data: {
      id,
      name:              validated.data.name,
      description:       validated.data.description || null,
      date:              new Date(validated.data.date),
      certificateTypeId: validated.data.certificateTypeId,
      careerId:          validated.data.careerId || null,
      institutionId:     institutionId!,
      templateKey,
      nameX,
      nameY,
    },
  })

  revalidatePath('/dashboard/processes')
  redirect('/dashboard/processes')
}
```

- [ ] **Step 3: Reemplazar la función updateProcess**

Reemplazar la función `updateProcess` completa por:

```typescript
export async function updateProcess(id: string, state: ProcessFormState, formData: FormData): Promise<ProcessFormState> {
  await requireInstitution()

  const validated = ProcessSchema.safeParse({
    name:              formData.get('name'),
    description:       formData.get('description'),
    date:              formData.get('date'),
    certificateTypeId: formData.get('certificateTypeId'),
    careerId:          formData.get('careerId') || undefined,
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as ProcessErrors }

  const existing = await prisma.certificateProcess.findUnique({
    where: { id },
    select: { templateKey: true },
  })

  let templateUpdate: { templateKey: string | null; nameX: number | null; nameY: number | null } | null = null

  const shouldDelete = formData.get('deleteTemplate') === 'true'
  const templateFile = formData.get('template') as File | null

  if (shouldDelete) {
    if (existing?.templateKey) await deleteTemplate(existing.templateKey)
    templateUpdate = { templateKey: null, nameX: null, nameY: null }
  } else if (templateFile && templateFile.size > 0) {
    if (templateFile.type !== 'application/pdf') return { message: 'La plantilla debe ser un archivo PDF.' }
    if (templateFile.size > 10 * 1024 * 1024) return { message: 'La plantilla no puede superar 10 MB.' }

    const x = parseFloat(formData.get('nameX') as string)
    const y = parseFloat(formData.get('nameY') as string)
    if (isNaN(x) || isNaN(y) || x < 0 || y < 0) {
      return { message: 'Ingresá coordenadas X e Y válidas para la plantilla.' }
    }

    await ensureBucket()
    const buffer = Buffer.from(await templateFile.arrayBuffer())
    await uploadTemplate(`templates/${id}.pdf`, buffer)
    templateUpdate = { templateKey: `templates/${id}.pdf`, nameX: x, nameY: y }
  }

  await prisma.certificateProcess.update({
    where: { id },
    data: {
      name:              validated.data.name,
      description:       validated.data.description || null,
      date:              new Date(validated.data.date),
      certificateTypeId: validated.data.certificateTypeId,
      careerId:          validated.data.careerId || null,
      ...(templateUpdate !== null ? templateUpdate : {}),
    },
  })

  revalidatePath('/dashboard/processes')
  return { success: true }
}
```

- [ ] **Step 4: Reemplazar la función deleteProcess**

Reemplazar la función `deleteProcess` completa por:

```typescript
export async function deleteProcess(id: string) {
  await requireInstitution()
  const certCount = await prisma.certificate.count({ where: { processId: id } })
  if (certCount > 0) return

  const proc = await prisma.certificateProcess.findUnique({
    where: { id },
    select: { templateKey: true },
  })
  if (proc?.templateKey) {
    await deleteTemplate(proc.templateKey)
  }

  await prisma.certificateProcess.delete({ where: { id } })
  revalidatePath('/dashboard/processes')
}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add app/actions/processes.ts
git commit -m "feat: extend createProcess/updateProcess/deleteProcess with template handling"
```

---

## Task 6: Actualizar ruta PDF del certificado para usar plantilla

**Files:**
- Modify: `app/api/certificates/[id]/pdf/route.ts`

- [ ] **Step 1: Agregar imports**

Al inicio de `app/api/certificates/[id]/pdf/route.ts`, agregar los imports necesarios:

```typescript
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { downloadTemplate } from '@/app/lib/storage'
```

- [ ] **Step 2: Ampliar la query Prisma para incluir campos de plantilla**

Reemplazar la query `prisma.certificate.findUnique` por:

```typescript
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
      // templateKey, nameX, nameY son seleccionados automáticamente por Prisma
    },
  },
})
```

- [ ] **Step 3: Reemplazar la lógica de generación del PDF**

Reemplazar el bloque que llama a `generateCertificatePdf` y construye la respuesta por:

```typescript
let pdfBytes: Uint8Array

if (cert.process.templateKey && cert.process.nameX !== null && cert.process.nameY !== null) {
  const templateBuffer = await downloadTemplate(cert.process.templateKey)
  const pdfDoc = await PDFDocument.load(templateBuffer)
  const page = pdfDoc.getPages()[0]
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  page.drawText(cert.student.name, {
    x: cert.process.nameX,
    y: cert.process.nameY,
    size: 28,
    font,
    color: rgb(0, 0, 0),
  })

  pdfBytes = await pdfDoc.save()
} else {
  pdfBytes = await generateCertificatePdf({
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
}

const safeName = cert.student.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
const filename = `certificado-${safeName}.pdf`

return new NextResponse(Buffer.from(pdfBytes), {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
  },
})
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/api/certificates/[id]/pdf/route.ts
git commit -m "feat: use PDF template when available in certificate download route"
```

---

## Task 7: Componente reutilizable de carga de plantilla

**Files:**
- Create: `app/(dashboard)/components/template-upload-section.tsx`

- [ ] **Step 1: Crear el directorio si no existe**

```bash
mkdir -p "app/(dashboard)/components"
```

- [ ] **Step 2: Crear el componente**

Crear `app/(dashboard)/components/template-upload-section.tsx`:

```tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { previewTemplate } from '@/app/actions/templates'
import { FileUp, Eye, Loader2, Trash2, X } from 'lucide-react'

type Props = {
  defaultHasTemplate?: boolean
  defaultNameX?: number | null
  defaultNameY?: number | null
}

export default function TemplateUploadSection({
  defaultHasTemplate = false,
  defaultNameX,
  defaultNameY,
}: Props) {
  const [hasTemplate, setHasTemplate] = useState(defaultHasTemplate)
  const [deleteFlag, setDeleteFlag] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [x, setX] = useState(defaultNameX?.toString() ?? '')
  const [y, setY] = useState(defaultNameY?.toString() ?? '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, startPreview] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
    setPreviewUrl(null)
    setPreviewError(null)
  }

  function handleRemoveTemplate() {
    setHasTemplate(false)
    setDeleteFlag(true)
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handlePreview() {
    if (!selectedFile) return
    setPreviewError(null)

    const fd = new FormData()
    fd.append('template', selectedFile)
    fd.append('nameX', x)
    fd.append('nameY', y)

    startPreview(async () => {
      const result = await previewTemplate(fd)
      if (result.error) {
        setPreviewError(result.error)
        return
      }
      if (result.pdfBase64) {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        const bytes = atob(result.pdfBase64)
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
        const blob = new Blob([arr], { type: 'application/pdf' })
        setPreviewUrl(URL.createObjectURL(blob))
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Plantilla PDF</span>
        <span className="text-xs text-outline">(opcional)</span>
      </div>

      <input type="hidden" name="deleteTemplate" value={deleteFlag ? 'true' : 'false'} />

      {hasTemplate && !deleteFlag ? (
        <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-surface-container">
          <FileUp size={16} className="text-primary-container shrink-0" />
          <span className="text-sm font-medium text-on-surface flex-1">Plantilla cargada</span>
          <button
            type="button"
            onClick={handleRemoveTemplate}
            className="flex items-center gap-1.5 text-xs text-error hover:text-error/80 transition-colors font-medium"
          >
            <Trash2 size={13} strokeWidth={2} />
            Eliminar
          </button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            name="template"
            accept="application/pdf"
            onChange={handleFileChange}
            className="w-full text-sm text-on-surface file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary-container file:text-white hover:file:bg-primary file:cursor-pointer"
          />

          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Posición X (pt)
              </label>
              <input
                type="number"
                name="nameX"
                value={x}
                onChange={e => setX(e.target.value)}
                placeholder="Ej: 220"
                min="0"
                className="w-full px-4 py-2.5 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Posición Y (pt)
              </label>
              <input
                type="number"
                name="nameY"
                value={y}
                onChange={e => setY(e.target.value)}
                placeholder="Ej: 330"
                min="0"
                className="w-full px-4 py-2.5 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface text-sm"
              />
            </div>
          </div>

          <p className="text-xs text-secondary">
            Coordenadas en puntos PDF (pt). El origen (0,0) es la esquina inferior izquierda. Ejemplo: A4 horizontal mide 841×595 pt; para texto centrado verticalmente empezá con Y≈280.
          </p>

          {selectedFile && (
            <button
              type="button"
              onClick={handlePreview}
              disabled={isPreviewing || !x || !y}
              className="self-start inline-flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold py-2 px-5 rounded-lg transition-all text-sm disabled:opacity-50"
            >
              {isPreviewing
                ? <><Loader2 size={14} strokeWidth={2} className="animate-spin" />Generando...</>
                : <><Eye size={14} strokeWidth={1.75} />Previsualizar</>}
            </button>
          )}
        </>
      )}

      {previewError && (
        <p className="text-xs text-error">{previewError}</p>
      )}

      {previewUrl && (
        <div className="mt-2 rounded-lg overflow-hidden border border-surface-container">
          <div className="flex items-center justify-between px-4 py-2 bg-surface-container-low border-b border-surface-container">
            <span className="text-xs font-bold text-secondary uppercase tracking-widest">Previsualización</span>
            <button
              type="button"
              onClick={() => { URL.revokeObjectURL(previewUrl!); setPreviewUrl(null) }}
              className="text-secondary hover:text-on-surface transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <iframe src={previewUrl} className="w-full" height="420" title="Previsualización de plantilla" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/components/template-upload-section.tsx"
git commit -m "feat: add TemplateUploadSection client component with preview support"
```

---

## Task 8: Integrar componente en formulario de nuevo proceso

**Files:**
- Modify: `app/(dashboard)/dashboard/processes/new/process-form.tsx`

- [ ] **Step 1: Agregar import del componente**

Al inicio de `app/(dashboard)/dashboard/processes/new/process-form.tsx`, agregar el import (junto a los existentes):

```tsx
import TemplateUploadSection from '@/app/(dashboard)/components/template-upload-section'
```

- [ ] **Step 2: Agregar la sección de plantilla en el formulario**

En el mismo archivo, agregar `<TemplateUploadSection />` justo antes del separador `{state?.message && ...}` y los botones, dentro del `<form>`. El bloque de botones al final quedará así:

```tsx
        {/* Sección de plantilla PDF */}
        <div className="border-t border-surface-container pt-6">
          <TemplateUploadSection />
        </div>

        {state?.message && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/processes" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending || certTypes.length === 0}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Crear Proceso</>}
          </button>
        </div>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Verificación manual**

Iniciar la app:

```bash
npm run dev
```

Navegar a `http://localhost:3000/dashboard/processes/new`. Verificar:
- Aparece la sección "Plantilla PDF (opcional)" al final del formulario
- Se puede seleccionar un PDF
- Aparecen los campos X e Y al seleccionar el PDF
- El botón "Previsualizar" funciona y muestra el iframe con el PDF y el nombre de ejemplo
- Al crear el proceso sin plantilla: funciona igual que antes
- Al crear el proceso con plantilla: el proceso se guarda y en MinIO (consola `http://localhost:9001`) aparece el archivo bajo `chaski-templates/templates/{processId}.pdf`

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/processes/new/process-form.tsx"
git commit -m "feat: integrate TemplateUploadSection in new process form"
```

---

## Task 9: Integrar componente en formulario de edición de proceso

**Files:**
- Modify: `app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx`
- Modify: `app/(dashboard)/dashboard/processes/[id]/edit/page.tsx`

- [ ] **Step 1: Actualizar la query en page.tsx para incluir campos de plantilla**

En `app/(dashboard)/dashboard/processes/[id]/edit/page.tsx`, reemplazar la query de `proc`:

```tsx
proc: prisma.certificateProcess.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    description: true,
    date: true,
    certificateTypeId: true,
    careerId: true,
    templateKey: true,
    nameX: true,
    nameY: true,
  },
}),
```

- [ ] **Step 2: Pasar los nuevos props al componente EditProcessForm en page.tsx**

Reemplazar la instancia de `<EditProcessForm ... />` por:

```tsx
      <EditProcessForm
        processId={proc.id}
        defaultName={proc.name}
        defaultDescription={proc.description}
        defaultDate={proc.date.toISOString().split('T')[0]}
        defaultCertificateTypeId={proc.certificateTypeId}
        defaultCareerId={proc.careerId}
        certTypes={certTypes}
        careers={careers}
        defaultHasTemplate={!!proc.templateKey}
        defaultNameX={proc.nameX}
        defaultNameY={proc.nameY}
      />
```

- [ ] **Step 3: Actualizar el tipo Props en edit-process-form.tsx**

En `app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx`, reemplazar el bloque de tipos `Props`:

```tsx
type Props = {
  processId: string
  defaultName: string
  defaultDescription: string | null
  defaultDate: string
  defaultCertificateTypeId: string
  defaultCareerId: string | null
  certTypes: CertType[]
  careers: Career[]
  defaultHasTemplate: boolean
  defaultNameX: number | null
  defaultNameY: number | null
}
```

- [ ] **Step 4: Agregar import y props en edit-process-form.tsx**

Agregar el import del componente al inicio del archivo:

```tsx
import TemplateUploadSection from '@/app/(dashboard)/components/template-upload-section'
```

Y actualizar la firma de la función para incluir los nuevos props:

```tsx
export default function EditProcessForm({
  processId,
  defaultName,
  defaultDescription,
  defaultDate,
  defaultCertificateTypeId,
  defaultCareerId,
  certTypes,
  careers,
  defaultHasTemplate,
  defaultNameX,
  defaultNameY,
}: Props) {
```

- [ ] **Step 5: Agregar TemplateUploadSection en el form de edición**

Agregar la sección justo antes del bloque de mensajes de estado y botones (el mismo lugar que en el formulario de creación):

```tsx
        {/* Sección de plantilla PDF */}
        <div className="border-t border-surface-container pt-6">
          <TemplateUploadSection
            defaultHasTemplate={defaultHasTemplate}
            defaultNameX={defaultNameX}
            defaultNameY={defaultNameY}
          />
        </div>

        {state?.message && !state.success && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}
        {state?.success && <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg flex items-center gap-2"><CheckCircle2 size={16} strokeWidth={2} />Proceso actualizado.</div>}
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 7: Verificación manual completa**

Con la app corriendo (`npm run dev`), probar el flujo completo:

1. **Crear proceso con plantilla:**
   - Ir a `/dashboard/processes/new`
   - Subir un PDF de plantilla, ingresar X e Y, previsualizar
   - Crear el proceso
   - Verificar en MinIO (`http://localhost:9001`) que existe `chaski-templates/templates/{id}.pdf`

2. **Editar proceso — reemplazar plantilla:**
   - Ir a `/dashboard/processes/{id}/edit`
   - Debe mostrar "Plantilla cargada" con botón "Eliminar"
   - Eliminar la plantilla existente y subir una nueva
   - Guardar — verificar en MinIO que el archivo se actualizó

3. **Editar proceso — eliminar plantilla:**
   - En la edición, hacer clic en "Eliminar" y guardar sin subir nueva
   - Verificar en MinIO que el archivo fue eliminado
   - Verificar en la DB que `templateKey`, `nameX`, `nameY` son null

4. **Descargar certificado con plantilla:**
   - Ir al portal del estudiante
   - Descargar el PDF del certificado de un proceso con plantilla
   - Verificar que el PDF muestra la plantilla con el nombre real del estudiante insertado en las coordenadas configuradas

5. **Descargar certificado sin plantilla:**
   - Descargar el PDF de un proceso sin plantilla
   - Verificar que sigue usando el generador programático (diseño con fondo azul, QR, etc.)

- [ ] **Step 8: Commit final**

```bash
git add "app/(dashboard)/dashboard/processes/[id]/edit/edit-process-form.tsx" "app/(dashboard)/dashboard/processes/[id]/edit/page.tsx"
git commit -m "feat: integrate TemplateUploadSection in edit process form"
```

---

## Checklist de verificación final

- [ ] MinIO accesible en `http://localhost:9001`
- [ ] Bucket `chaski-templates` creado automáticamente al subir la primera plantilla
- [ ] Proceso creado con plantilla: archivo visible en MinIO
- [ ] Proceso editado (nueva plantilla): archivo anterior eliminado, nuevo visible en MinIO
- [ ] Proceso editado (eliminar plantilla): archivo eliminado de MinIO, campos null en DB
- [ ] Proceso eliminado: archivo de plantilla eliminado de MinIO
- [ ] Descarga de certificado con plantilla: PDF muestra el nombre del estudiante en las coordenadas correctas
- [ ] Descarga de certificado sin plantilla: genera el PDF programático actual sin cambios
- [ ] `npx tsc --noEmit` sin errores
- [ ] `npm run build` sin errores
