'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { computeDataHash } from '@/app/lib/certificate-hash'

const Schema = z.object({
  studentId: z.string().min(1, { error: 'Selecciona un estudiante.' }),
})

type FormState =
  | { errors?: { studentId?: string[] }; message?: string; success?: boolean }
  | undefined

export async function createCertificate(
  eventId: string,
  state: FormState,
  formData: FormData
): Promise<FormState> {
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') return { message: 'Solo universidades pueden emitir certificados.' }

  const validated = Schema.safeParse({ studentId: formData.get('studentId') })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as { studentId?: string[] } }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      institution: { select: { name: true } },
      certificateType: { select: { name: true } },
    },
  })
  if (!event || event.institutionId !== institutionId) return { message: 'Evento no encontrado.' }

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: {
      studentId_institutionId: {
        studentId: validated.data.studentId,
        institutionId: institutionId!,
      },
    },
    include: {
      student: { select: { name: true, dni: true } },
      career: { select: { name: true } },
    },
  })
  if (!enrollment) return { message: 'Estudiante no matriculado en esta institución.' }

  const existing = await prisma.certificate.findUnique({
    where: { eventId_studentId: { eventId, studentId: validated.data.studentId } },
  })
  if (existing) return { message: 'El estudiante ya tiene un certificado en este evento.' }

  const issuedAt = new Date()
  const id = crypto.randomUUID()

  const dataHash = computeDataHash({
    id,
    studentName: enrollment.student.name,
    studentDni: enrollment.student.dni,
    careerName: enrollment.career?.name ?? null,
    eventName: event.name,
    eventDate: event.date,
    issuedAt,
    institutionName: event.institution.name,
    certificateTypeName: event.certificateType.name,
  })

  await prisma.certificate.create({
    data: {
      id,
      status: 'ISSUED',
      dataHash,
      issuedAt,
      eventId,
      studentId: validated.data.studentId,
      careerId: enrollment.careerId ?? null,
      issuedById: session.userId,
    },
  })

  revalidatePath(`/dashboard/events/${eventId}`)
  redirect(`/dashboard/events/${eventId}`)
}

export async function deleteCertificate(id: string) {
  await requireInstitution()
  const cert = await prisma.certificate.findUnique({
    where: { id },
    select: { status: true, eventId: true },
  })
  if (!cert || cert.status === 'REGISTERED') return
  await prisma.certificate.delete({ where: { id } })
  revalidatePath(`/dashboard/events/${cert.eventId}`)
}
