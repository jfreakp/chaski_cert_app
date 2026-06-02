'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'

const Schema = z.object({
  name:           z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  description:    z.string().trim().optional(),
  requiresCareer: z.preprocess(v => v === 'true' || v === true, z.boolean()),
})

type FormState =
  | { errors?: { name?: string[]; description?: string[] }; message?: string; success?: boolean }
  | undefined

export async function createCertificateType(state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()

  const validated = Schema.safeParse({
    name:           formData.get('name'),
    description:    formData.get('description'),
    requiresCareer: formData.get('requiresCareer'),
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as { name?: string[]; description?: string[] } }

  const existing = await prisma.certificateType.findUnique({ where: { name: validated.data.name } })
  if (existing) return { errors: { name: ['Este tipo ya existe.'] } }

  await prisma.certificateType.create({
    data: {
      name:           validated.data.name,
      description:    validated.data.description || null,
      requiresCareer: validated.data.requiresCareer,
    },
  })
  revalidatePath('/dashboard/certificate-types')
  redirect('/dashboard/certificate-types')
}

export async function updateCertificateType(id: string, state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()

  const validated = Schema.safeParse({
    name:           formData.get('name'),
    description:    formData.get('description'),
    requiresCareer: formData.get('requiresCareer'),
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors as { name?: string[]; description?: string[] } }

  const existing = await prisma.certificateType.findUnique({ where: { name: validated.data.name } })
  if (existing && existing.id !== id) return { errors: { name: ['Este tipo ya existe.'] } }

  await prisma.certificateType.update({
    where: { id },
    data: {
      name:           validated.data.name,
      description:    validated.data.description || null,
      requiresCareer: validated.data.requiresCareer,
    },
  })
  revalidatePath('/dashboard/certificate-types')
  return { success: true }
}

export async function toggleCertificateTypeStatus(id: string) {
  await requireAdmin()
  const ct = await prisma.certificateType.findUnique({ where: { id }, select: { isActive: true } })
  if (!ct) return
  await prisma.certificateType.update({ where: { id }, data: { isActive: !ct.isActive } })
  revalidatePath('/dashboard/certificate-types')
}

export async function deleteCertificateType(id: string) {
  await requireAdmin()
  const processes = await prisma.certificateProcess.count({ where: { certificateTypeId: id } })
  if (processes > 0) return
  await prisma.certificateType.delete({ where: { id } })
  revalidatePath('/dashboard/certificate-types')
}
