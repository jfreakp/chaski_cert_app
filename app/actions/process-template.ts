'use server'

import { revalidatePath } from 'next/cache'
import { PDFDocument } from 'pdf-lib'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { uploadTemplate, deleteTemplate, ensureBucket } from '@/app/lib/storage'

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
  if (file.size > 10 * 1024 * 1024) return { message: 'El archivo no debe superar los 10 MB.' }

  const buffer = Buffer.from(await file.arrayBuffer())

  let pdfDoc: PDFDocument
  try {
    pdfDoc = await PDFDocument.load(buffer)
  } catch {
    return { message: 'El archivo PDF no es válido o está dañado.' }
  }

  const pages = pdfDoc.getPages()
  if (pages.length === 0) return { message: 'El PDF no contiene páginas.' }
  const page = pages[0]
  const { width: pdfWidth, height: pdfHeight } = page.getSize()

  if (proc.templateKey) {
    try { await deleteTemplate(proc.templateKey) } catch { /* ignorar */ }
  }

  await ensureBucket()
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

  const { nameX, nameY, nameFontSize, nameFontFamily, nameColor } = settings

  const ALLOWED_FONTS = ['Helvetica', 'Helvetica-Bold', 'Times-Roman', 'Times-Bold', 'Courier', 'Courier-Bold']
  if (!ALLOWED_FONTS.includes(nameFontFamily)) return { success: false }
  if (!/^#[0-9a-fA-F]{6}$/.test(nameColor)) return { success: false }
  if (nameFontSize < 1 || nameFontSize > 200) return { success: false }
  if (!isFinite(nameX) || !isFinite(nameY)) return { success: false }

  await prisma.certificateProcess.update({
    where: { id: processId },
    data:  { nameX, nameY, nameFontSize, nameFontFamily, nameColor },
  })

  revalidatePath(`/dashboard/processes/${processId}/edit`)
  return { success: true }
}
