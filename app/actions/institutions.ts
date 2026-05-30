'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const InstitutionSchema = z.object({
  name: z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  code: z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim().toUpperCase(),
  country: z.string().trim().optional(),
})

type InstitutionFormState =
  | {
      errors?: { name?: string[]; code?: string[]; country?: string[] }
      message?: string
      success?: boolean
    }
  | undefined

export async function createInstitution(
  state: InstitutionFormState,
  formData: FormData
): Promise<InstitutionFormState> {
  await requireAdmin()

  const validated = InstitutionSchema.safeParse({
    name: formData.get('name'),
    code: formData.get('code'),
    country: formData.get('country'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[]; code?: string[]; country?: string[] } }
  }

  const { name, code, country } = validated.data

  const existing = await prisma.institution.findUnique({ where: { code } })
  if (existing) {
    return { errors: { code: ['Este código ya está en uso.'] } }
  }

  await prisma.institution.create({
    data: { name, code, country: country || null },
  })

  revalidatePath('/dashboard/institutions')
  redirect('/dashboard/institutions')
}

export async function updateInstitution(
  institutionId: string,
  state: InstitutionFormState,
  formData: FormData
): Promise<InstitutionFormState> {
  await requireAdmin()

  const validated = InstitutionSchema.safeParse({
    name: formData.get('name'),
    code: formData.get('code'),
    country: formData.get('country'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[]; code?: string[]; country?: string[] } }
  }

  const { name, code, country } = validated.data

  const existing = await prisma.institution.findUnique({ where: { code } })
  if (existing && existing.id !== institutionId) {
    return { errors: { code: ['Este código ya está en uso.'] } }
  }

  await prisma.institution.update({
    where: { id: institutionId },
    data: { name, code, country: country || null },
  })

  revalidatePath('/dashboard/institutions')
  return { success: true }
}

export async function toggleInstitutionStatus(institutionId: string) {
  await requireAdmin()

  const inst = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { isActive: true },
  })
  if (!inst) return

  await prisma.institution.update({
    where: { id: institutionId },
    data: { isActive: !inst.isActive },
  })

  revalidatePath('/dashboard/institutions')
}

export async function deleteInstitution(institutionId: string) {
  await requireAdmin()

  await prisma.institution.delete({ where: { id: institutionId } })
  revalidatePath('/dashboard/institutions')
}
