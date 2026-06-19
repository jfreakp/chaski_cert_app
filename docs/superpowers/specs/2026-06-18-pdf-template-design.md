# PDF Template Editor — Diseño

**Fecha:** 2026-06-18
**Rama:** dev

## Resumen

Permitir que usuarios UNIVERSITY suban una plantilla PDF para cada proceso de certificación y configuren la posición, fuente, tamaño y color del nombre del estudiante que se imprimirá sobre ella. El certificado resultante queda disponible como segunda opción de descarga junto al PDF generado por el sistema.

---

## Schema — campos nuevos en `CertificateProcess`

```prisma
pdfWidth      Float?   // ancho de la plantilla en puntos PDF (leído con pdf-lib al subir)
pdfHeight     Float?   // alto de la plantilla en puntos PDF
nameFontSize  Float?   // tamaño de fuente del nombre (default 28)
nameFontFamily String? // fuente estándar PDF (default "Helvetica-Bold")
nameColor     String?  // color en hex (default "#0d0d1e")
```

Los campos `templateKey String?`, `nameX Float?`, `nameY Float?` ya existen.

Requiere migración Prisma: `prisma migrate dev --name add-template-metadata`

---

## Archivos

```
app/
  api/
    processes/[id]/template/
      route.ts                                        NEW — GET sirve PDF desde MinIO
  actions/
    process-template.ts                               NEW — uploadTemplate, removeTemplate, updateTemplateSettings
  (dashboard)/dashboard/processes/[id]/
    edit/
      edit-process-form.tsx                           MODIFY — incorporar TemplateEditor al final
      template-editor.tsx                             NEW — Client Component: upload + preview + posicionador
    certificate-table.tsx                             MODIFY — botón custom PDF, recibe hasTemplate prop
    page.tsx                                          MODIFY — pasar hasTemplate a CertificateTable
  (portal)/portal/
    page.tsx                                          MODIFY — botón custom PDF, incluir templateKey en query
  actions/
    student-portal.ts                                 MODIFY — getMyCertificates incluye templateKey del proceso
  lib/
    pdf.ts                                            MODIFY — nueva función generateCustomCertificatePdf()
  api/
    certificates/[id]/pdf/
      route.ts                                        MODIFY — soporte ?type=custom
prisma/
  schema.prisma                                       MODIFY — 5 campos nuevos
```

---

## API Route: `GET /api/processes/[id]/template`

- Verifica sesión (admin o university de la institución dueña del proceso)
- Descarga el PDF de MinIO usando `downloadTemplate(proc.templateKey)`
- Responde con `Content-Type: application/pdf`
- Si no hay `templateKey`: 404

```ts
export async function GET(_req, { params }) {
  const { id } = await params
  // auth check
  const proc = await prisma.certificateProcess.findUnique({ where: { id }, select: { templateKey: true, institutionId: true } })
  if (!proc?.templateKey) return NextResponse.json({ error: 'Sin plantilla.' }, { status: 404 })
  const buffer = await downloadTemplate(proc.templateKey)
  return new NextResponse(buffer, { headers: { 'Content-Type': 'application/pdf' } })
}
```

---

## Server Actions: `process-template.ts`

### `uploadProcessTemplate(processId, formData)`

```ts
// 1. Obtiene file de formData, valida type === 'application/pdf'
// 2. Descarga buffer, carga con PDFDocument.load(buffer) usando pdf-lib
// 3. Lee dimensiones: page = doc.getPages()[0]; { width: pdfWidth, height: pdfHeight } = page.getSize()
// 4. key = `templates/${processId}.pdf`
// 5. uploadTemplate(key, buffer) → MinIO
// 6. prisma.certificateProcess.update({
//      templateKey: key,
//      pdfWidth, pdfHeight,
//      nameX: pdfWidth / 2,        ← centrado horizontalmente
//      nameY: pdfHeight / 3,       ← 1/3 desde abajo
//      nameFontSize: 28,
//      nameFontFamily: 'Helvetica-Bold',
//      nameColor: '#0d0d1e',
//    })
// 7. revalidatePath(`/dashboard/processes/${processId}/edit`)
// 8. return { pdfWidth, pdfHeight, nameX, nameY }
```

### `removeProcessTemplate(processId)`

```ts
// 1. Busca templateKey del proceso
// 2. deleteTemplate(key) → MinIO
// 3. prisma.update: templateKey=null, pdfWidth=null, pdfHeight=null, nameX=null, nameY=null, nameFontSize=null, nameFontFamily=null, nameColor=null
// 4. revalidatePath
```

### `updateTemplateSettings(processId, { nameX, nameY, nameFontSize, nameFontFamily, nameColor })`

```ts
// prisma.update los 5 campos
// revalidatePath
// return { success: true }
```

---

## Componente `TemplateEditor` (Client Component)

### Props

```ts
{
  processId: string
  template: {
    pdfWidth: number; pdfHeight: number
    nameX: number; nameY: number
    nameFontSize: number; nameFontFamily: string; nameColor: string
  } | null
}
```

### Estado sin plantilla

- `<input type="file" accept=".pdf">` + botón "Subir plantilla"
- Al subir: llama `uploadProcessTemplate` via `useActionState`, actualiza state local con las dimensiones devueltas

### Estado con plantilla

**Zona de preview + posicionador:**

```
┌──────────────────────────────────────────────────────────┐
│  <object data="/api/processes/[id]/template#toolbar=0"   │
│          style="width:100%; height:[calculado]px">       │
│                                                          │
│  <div overlay transparente, mismo tamaño, z-index:10,   │
│       cursor: crosshair, onClick={handlePickerClick}>    │
│                                                          │
│    <div preview-text style={{                            │
│      position: absolute,                                 │
│      left: (nameX/pdfWidth)*100%,                        │
│      bottom: (nameY/pdfHeight)*100%,                     │
│      transform: translateX(-50%),                        │
│      fontSize: nameFontSize * displayScale,              │
│      color: nameColor,                                   │
│      pointerEvents: none,                                │
│    }}>Nombre del Estudiante</div>                        │
│  </div>                                                  │
└──────────────────────────────────────────────────────────┘
```

**Cálculo de coordenadas al hacer clic:**

```ts
function handlePickerClick(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect()
  const displayScale = rect.width / pdfWidth
  const pdfX = (e.clientX - rect.left) / displayScale
  const pdfY = pdfHeight - (e.clientY - rect.top) / displayScale  // flip Y: PDF origin = bottom-left
  setNameX(pdfX)
  setNameY(pdfY)
}
```

**Display scale:**

```ts
const containerWidth = Math.min(pdfWidth, 800)  // máximo 800px de ancho
const displayScale   = containerWidth / pdfWidth
const containerHeight = pdfHeight * displayScale
```

**Controles debajo del preview:**

```
[Tipo de letra ▾]   [Tamaño: 28 pt]   [Color: ■]
[X: 420.5]  [Y: 198.2]           [Eliminar plantilla]  [Guardar]
```

Fuentes disponibles en el select (los valores son nombres PostScript, compatibles directamente con `embedFont()` de pdf-lib):

| `value` del `<option>` | Label visible |
|---|---|
| `Helvetica` | Helvetica |
| `Helvetica-Bold` | Helvetica Negrita |
| `Times-Roman` | Times Roman |
| `Times-Bold` | Times Negrita |
| `Courier` | Courier |
| `Courier-Bold` | Courier Negrita |

Color: `<input type="color">` nativo — guarda como hex string.

Al hacer clic en "Guardar": llama `updateTemplateSettings(processId, { nameX, nameY, nameFontSize, nameFontFamily, nameColor })`.

Al hacer clic en "Eliminar plantilla": llama `removeProcessTemplate(processId)` → vuelve al estado sin plantilla.

### Integración en `edit-process-form.tsx`

```tsx
// Debajo del form existente, separado por <hr>
<div className="mt-8 pt-8 border-t border-surface-container">
  <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary block mb-4">
    Plantilla PDF
  </span>
  <TemplateEditor processId={processId} template={template} />
</div>
```

El Server Component `edit/page.tsx` lee los campos `templateKey, pdfWidth, pdfHeight, nameX, nameY, nameFontSize, nameFontFamily, nameColor` del proceso y los pasa como prop `template` (null si no hay `templateKey`).

---

## Función `generateCustomCertificatePdf()` — `app/lib/pdf.ts`

```ts
export interface CustomCertificatePdfData {
  studentName: string
  verifyUrl:   string
  templateKey: string
  nameX:       number
  nameY:       number
  nameFontSize:   number
  nameFontFamily: string  // clave de StandardFonts, ej. "Helvetica-Bold"
  nameColor:      string  // hex, ej. "#0d0d1e"
}

export async function generateCustomCertificatePdf(data: CustomCertificatePdfData): Promise<Uint8Array> {
  const buffer = await downloadTemplate(data.templateKey)
  const doc    = await PDFDocument.load(buffer)
  const page   = doc.getPages()[0]
  // nameFontFamily es el nombre PostScript (ej. "Helvetica-Bold") — compatible directo con embedFont
  const font   = await doc.embedFont(data.nameFontFamily as StandardFonts)

  // Parsear hex → rgb
  const hex = data.nameColor.replace('#', '')
  const r   = parseInt(hex.slice(0, 2), 16) / 255
  const g   = parseInt(hex.slice(2, 4), 16) / 255
  const b   = parseInt(hex.slice(4, 6), 16) / 255

  // Centrar el nombre en nameX
  const textWidth = font.widthOfTextAtSize(data.studentName, data.nameFontSize)

  page.drawText(data.studentName, {
    x:     data.nameX - textWidth / 2,
    y:     data.nameY,
    size:  data.nameFontSize,
    font,
    color: rgb(r, g, b),
  })

  // QR de verificación (igual que PDF del sistema)
  const qrPngBuffer = await QRCode.toBuffer(data.verifyUrl, { width: 80, margin: 1 })
  const qrImage     = await doc.embedPng(qrPngBuffer)
  const { width, height } = page.getSize()
  page.drawImage(qrImage, { x: width - 90, y: 20, width: 70, height: 70 })

  return doc.save()
}
```

---

## API Route: `GET /api/certificates/[id]/pdf?type=custom`

```ts
// Nuevo bloque antes del return existente:
const type = _req.nextUrl.searchParams.get('type')

if (type === 'custom') {
  const proc = await prisma.certificateProcess.findUnique({
    where: { id: cert.processId },
    select: { templateKey: true, nameX: true, nameY: true, nameFontSize: true, nameFontFamily: true, nameColor: true },
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
    nameFontSize:   proc.nameFontSize ?? 28,
    nameFontFamily: proc.nameFontFamily ?? 'Helvetica-Bold',
    nameColor:      proc.nameColor ?? '#0d0d1e',
  })
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificado-plantilla-${safeName}.pdf"`,
    },
  })
}
// ... código existente para type !== 'custom'
```

---

## Botones de descarga

### `certificate-table.tsx` (dashboard)

- Recibe nueva prop `hasTemplate: boolean`
- Cuando `hasTemplate`: la columna de descarga muestra dos iconos:
  - `<Download>` — PDF del sistema (existente)
  - `<FileText>` — PDF con plantilla → `href="/api/certificates/${c.id}/pdf?type=custom"`

### `processes/[id]/page.tsx` (server component)

```ts
// Leer templateKey del proceso para pasar hasTemplate a CertificateTable
const hasTemplate = !!proc.templateKey  // (proc ya se incluye en el query existente, solo agregar templateKey al select)
```

```tsx
<CertificateTable certificates={...} isAdmin={isAdmin} polygonscanBaseUrl={...} hasTemplate={hasTemplate} />
```

### Portal del estudiante `portal/page.tsx`

- `getMyCertificates()` debe incluir `process: { select: { templateKey: true, ... } }`
- Si `cert.process.templateKey`: mostrar segundo botón "Descargar con plantilla" junto al botón existente

---

## Reglas de negocio

- Solo roles UNIVERSITY pueden subir/eliminar/configurar plantillas (verificado en los server actions via `requireInstitution`)
- Si `nameX` o `nameY` son null pero `templateKey` existe, el endpoint `/pdf?type=custom` responde 404
- Al eliminar la plantilla: se elimina el archivo de MinIO y se limpian todos los campos (`templateKey`, `pdfWidth`, `pdfHeight`, `nameX`, `nameY`, `nameFontSize`, `nameFontFamily`, `nameColor`)
- Los valores de `nameFontFamily` son nombres PostScript (ej. `"Helvetica-Bold"`, `"Times-Roman"`) — se pasan directamente a `doc.embedFont()` casteados a `StandardFonts`; no usar las claves del enum (HelveticaBold, TimesRoman) sino los valores
- El QR se coloca siempre en la esquina inferior derecha de la plantilla (20px de margen, 70x70px)
