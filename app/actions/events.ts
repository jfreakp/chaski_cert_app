'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'

const EventSchema = z.object({
  name:              z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  description:       z.string().trim().optional(),
  date:              z.string().min(1, { error: 'La fecha es requerida.' }),
  location:          z.string().trim().optional(),
  certificateTypeId: z.string().min(1, { error: 'Selecciona un tipo de certificado.' }),
})

type EventFormState =
  | { errors?: { name?: string[]; description?: string[]; date?: string[]; location?: string[]; certificateTypeId?: string[] }; message?: string; success?: boolean }
  | undefined

export async function createEvent(state: EventFormState, formData: FormData): Promise<EventFormState> {
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') return { message: 'Solo universidades pueden crear eventos.' }

  const validated = EventSchema.safeParse({
    name:              formData.get('name'),
    description:       formData.get('description'),
    date:              formData.get('date'),
    location:          formData.get('location'),
    certificateTypeId: formData.get('certificateTypeId'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[]; date?: string[]; certificateTypeId?: string[] } }
  }

  await prisma.event.create({
    data: {
      name:              validated.data.name,
      description:       validated.data.description || null,
      date:              new Date(validated.data.date),
      location:          validated.data.location || null,
      certificateTypeId: validated.data.certificateTypeId,
      institutionId:     institutionId!,
    },
  })

  revalidatePath('/dashboard/events')
  redirect('/dashboard/events')
}

export async function updateEvent(eventId: string, state: EventFormState, formData: FormData): Promise<EventFormState> {
  await requireInstitution()

  const validated = EventSchema.safeParse({
    name:              formData.get('name'),
    description:       formData.get('description'),
    date:              formData.get('date'),
    location:          formData.get('location'),
    certificateTypeId: formData.get('certificateTypeId'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[]; date?: string[]; certificateTypeId?: string[] } }
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      name:              validated.data.name,
      description:       validated.data.description || null,
      date:              new Date(validated.data.date),
      location:          validated.data.location || null,
      certificateTypeId: validated.data.certificateTypeId,
    },
  })

  revalidatePath('/dashboard/events')
  return { success: true }
}

export async function toggleEventStatus(eventId: string) {
  await requireInstitution()
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { isActive: true } })
  if (!event) return
  await prisma.event.update({ where: { id: eventId }, data: { isActive: !event.isActive } })
  revalidatePath('/dashboard/events')
}

export async function deleteEvent(eventId: string) {
  await requireInstitution()
  await prisma.event.delete({ where: { id: eventId } })
  revalidatePath('/dashboard/events')
}
