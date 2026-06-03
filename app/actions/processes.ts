'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { computeDataHash } from '@/app/lib/certificate-hash'
import { sendCertificateRegisteredEmail } from '@/app/lib/email'
import { createAuditLog } from '@/app/lib/audit'

// ── CRUD ─────────────────────────────────────────────────────────────────────

const ProcessSchema = z.object({
  name:              z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  description:       z.string().trim().optional(),
  date:              z.string().min(1, { error: 'La fecha es requerida.' }),
  certificateTypeId: z.string().min(1, { error: 'Selecciona un tipo de certificado.' }),
  careerId:          z.string().optional(),
})

type ProcessErrors = { name?: string[]; description?: string[]; date?: string[]; certificateTypeId?: string[]; careerId?: string[] }

type ProcessFormState =
  | { errors?: ProcessErrors; message?: string; success?: boolean }
  | undefined

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

  await prisma.certificateProcess.create({
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
  redirect('/dashboard/processes')
}

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
  return { success: true }
}

export async function toggleProcessStatus(id: string) {
  await requireInstitution()
  const proc = await prisma.certificateProcess.findUnique({ where: { id }, select: { isActive: true } })
  if (!proc) return
  await prisma.certificateProcess.update({ where: { id }, data: { isActive: !proc.isActive } })
  revalidatePath('/dashboard/processes')
}

export async function deleteProcess(id: string) {
  await requireInstitution()
  const certCount = await prisma.certificate.count({ where: { processId: id } })
  if (certCount > 0) return
  await prisma.certificateProcess.delete({ where: { id } })
  revalidatePath('/dashboard/processes')
}

// ── Participantes ─────────────────────────────────────────────────────────────

const ParticipantSchema = z.object({
  studentId: z.string().min(1, { error: 'Selecciona un estudiante.' }),
})

type ParticipantFormState =
  | { errors?: { studentId?: string[] }; message?: string; success?: boolean }
  | undefined

export async function addParticipant(processId: string, state: ParticipantFormState, formData: FormData): Promise<ParticipantFormState> {
  const { institutionId } = await requireInstitution()

  const validated = ParticipantSchema.safeParse({ studentId: formData.get('studentId') })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as { studentId?: string[] } }

  const proc = await prisma.certificateProcess.findUnique({ where: { id: processId }, select: { institutionId: true } })
  if (!proc || proc.institutionId !== institutionId) return { message: 'Proceso no encontrado.' }

  const existing = await prisma.processParticipant.findUnique({
    where: { processId_studentId: { processId, studentId: validated.data.studentId } },
  })
  if (existing) return { message: 'El estudiante ya está en este proceso.' }

  await prisma.processParticipant.create({
    data: { processId, studentId: validated.data.studentId },
  })

  revalidatePath(`/dashboard/processes/${processId}`)
  redirect(`/dashboard/processes/${processId}`)
}

export async function removeParticipant(id: string) {
  await requireInstitution()
  const participant = await prisma.processParticipant.findUnique({
    where: { id },
    select: { processId: true, studentId: true },
  })
  if (!participant) return

  const hasCert = await prisma.certificate.findUnique({
    where: { processId_studentId: { processId: participant.processId, studentId: participant.studentId } },
  })
  if (hasCert) return

  await prisma.processParticipant.delete({ where: { id } })
  revalidatePath(`/dashboard/processes/${participant.processId}`)
}

// ── Import CSV ────────────────────────────────────────────────────────────────

export type ImportError = {
  fila: number
  dni: string
  nombre: string
  motivo: string
}

export type ImportResult = {
  agregados: number
  duplicados: number
  errores: ImportError[]
}

export async function importParticipants(
  processId: string,
  _: unknown,
  formData: FormData
): Promise<{ result?: ImportResult; message?: string }> {
  const { institutionId } = await requireInstitution()

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    select: { institutionId: true, careerId: true },
  })
  if (!proc || proc.institutionId !== institutionId) return { message: 'Proceso no encontrado.' }

  const file = formData.get('file') as File | null
  if (!file) return { message: 'Selecciona un archivo.' }

  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { message: 'El archivo está vacío o no tiene datos.' }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const dniIdx    = header.findIndex(h => h === 'dni' || h === 'cedula' || h === 'cédula')
  const nombreIdx = header.findIndex(h => h.includes('nombre') || h.includes('name'))

  if (dniIdx === -1) return { message: 'El archivo debe tener una columna "DNI".' }

  const result: ImportResult = { agregados: 0, duplicados: 0, errores: [] }

  for (let i = 1; i < lines.length; i++) {
    const cols   = lines[i].split(',').map(c => c.trim().replace(/['"]/g, ''))
    const dni    = cols[dniIdx]?.trim()
    const nombre = nombreIdx !== -1 ? (cols[nombreIdx]?.trim() || '') : ''

    if (!dni) {
      result.errores.push({ fila: i + 1, dni: '', nombre, motivo: 'DNI vacío.' })
      continue
    }

    // 1. Verificar que el estudiante existe en la DB
    const student = await prisma.student.findUnique({ where: { dni } })
    if (!student) {
      result.errores.push({ fila: i + 1, dni, nombre, motivo: 'Estudiante no encontrado en el sistema.' })
      continue
    }

    // 2. Verificar matrícula en la institución
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { studentId_institutionId: { studentId: student.id, institutionId: institutionId! } },
      select: { careerId: true },
    })
    if (!enrollment) {
      result.errores.push({ fila: i + 1, dni, nombre: student.name, motivo: 'No matriculado en esta institución.' })
      continue
    }

    // 3. Si el proceso tiene carrera, verificar que el estudiante esté en esa carrera
    if (proc.careerId && enrollment.careerId !== proc.careerId) {
      result.errores.push({ fila: i + 1, dni, nombre: student.name, motivo: 'No matriculado en la carrera del proceso.' })
      continue
    }

    // 4. Verificar duplicado en el proceso
    const existingP = await prisma.processParticipant.findUnique({
      where: { processId_studentId: { processId, studentId: student.id } },
    })
    if (existingP) {
      result.duplicados++
      continue
    }

    await prisma.processParticipant.create({ data: { processId, studentId: student.id } })
    result.agregados++
  }

  revalidatePath(`/dashboard/processes/${processId}`)
  return { result }
}

// ── Generar Certificados ──────────────────────────────────────────────────────

export async function generateCertificates(processId: string) {
  const { session, institutionId } = await requireInstitution()

  const proc = await prisma.certificateProcess.findUnique({
    where: { id: processId },
    include: {
      institution:     { select: { name: true } },
      certificateType: { select: { name: true } },
    },
  })
  if (!proc || proc.institutionId !== institutionId) return

  const participants = await prisma.processParticipant.findMany({
    where: { processId },
    include: { student: { select: { name: true, dni: true } } },
  })

  let newCount = 0

  for (const p of participants) {
    const existing = await prisma.certificate.findUnique({
      where: { processId_studentId: { processId, studentId: p.studentId } },
    })
    if (existing) continue

    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { studentId_institutionId: { studentId: p.studentId, institutionId: institutionId! } },
      include: { career: { select: { name: true } } },
    })

    const issuedAt = new Date()
    const id       = crypto.randomUUID()
    const dataHash = computeDataHash({
      id,
      studentName:         p.student.name,
      studentDni:          p.student.dni,
      careerName:          enrollment?.career?.name ?? null,
      processName:         proc.name,
      processDate:         proc.date,
      issuedAt,
      institutionName:     proc.institution.name,
      certificateTypeName: proc.certificateType.name,
    })

    await prisma.certificate.create({
      data: {
        id,
        status: 'ISSUED',
        dataHash,
        issuedAt,
        processId,
        studentId:  p.studentId,
        careerId:   enrollment?.careerId ?? null,
        issuedById: session.userId,
      },
    })

    newCount++
  }

  createAuditLog({
    action: 'CERTIFICATES_ISSUED',
    entityType: 'CertificateProcess',
    entityId: processId,
    metadata: { processId, processName: proc.name, count: newCount },
    userId: session.userId,
  })

  revalidatePath(`/dashboard/processes/${processId}`)
}

// ── Registro en Blockchain ────────────────────────────────────────────────────────────

export async function getIssuedHashes(processId: string): Promise<{ hashes: string[] }> {
  const { session } = await requireInstitution()
  if (session.role !== 'ADMIN') return { hashes: [] }

  const certs = await prisma.certificate.findMany({
    where: { processId, status: 'ISSUED' },
    select: { dataHash: true },
  })

  return { hashes: certs.map(c => c.dataHash) }
}

export async function markCertificatesRegistered(processId: string, txHash: string): Promise<{ message?: string }> {
  const { session } = await requireInstitution()
  if (session.role !== 'ADMIN') return { message: 'Solo administradores.' }

  try {
    await prisma.certificate.updateMany({
      where: { processId, status: 'ISSUED' },
      data: { status: 'REGISTERED', txHash, registeredAt: new Date() },
    })
  } catch {
    return { message: `Transacción confirmada (${txHash}) pero falló la actualización en DB. Guardá este txHash.` }
  }

  const registered = await prisma.certificate.findMany({
    where: { processId, txHash },
    include: {
      student: { select: { name: true, email: true } },
      process: {
        include: {
          institution:     { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
    },
  })

  const appUrl         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const isAmoy         = process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK !== 'polygon'
  const polygonscanUrl = isAmoy
    ? `https://amoy.polygonscan.com/tx/${txHash}`
    : `https://polygonscan.com/tx/${txHash}`

  createAuditLog({
    action: 'BLOCKCHAIN_REGISTERED',
    entityType: 'CertificateProcess',
    entityId: processId,
    metadata: { processId, txHash, count: registered.length },
    userId: session.userId,
  })

  await Promise.allSettled(
    registered.map(cert =>
      sendCertificateRegisteredEmail(cert.student.email, cert.student.name, {
        certificateTypeName: cert.process.certificateType.name,
        processName:         cert.process.name,
        institutionName:     cert.process.institution.name,
        portalUrl:           `${appUrl}/portal`,
        polygonscanUrl,
      })
    )
  )

  revalidatePath(`/dashboard/processes/${processId}`)
  return {}
}
