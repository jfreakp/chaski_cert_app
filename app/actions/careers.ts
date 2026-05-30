'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'

const CareerSchema = z.object({
  name: z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
})

type CareerFormState =
  | { errors?: { name?: string[] }; message?: string; success?: boolean }
  | undefined

async function getInstitutionId() {
  const session = await verifySession()
  if (session.role !== 'UNIVERSITY') throw new Error('Solo universidades pueden gestionar carreras.')
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { institutionId: true },
  })
  if (!user?.institutionId) throw new Error('Usuario sin institución asignada.')
  return user.institutionId
}

export async function createCareer(
  state: CareerFormState,
  formData: FormData
): Promise<CareerFormState> {
  const institutionId = await getInstitutionId()

  const validated = CareerSchema.safeParse({ name: formData.get('name') })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[] } }
  }

  const { name } = validated.data

  const existing = await prisma.career.findUnique({ where: { name_institutionId: { name, institutionId } } })
  if (existing) return { errors: { name: ['Esta carrera ya existe en tu institución.'] } }

  await prisma.career.create({ data: { name, institutionId } })

  revalidatePath('/dashboard/careers')
  redirect('/dashboard/careers')
}

export async function updateCareer(
  careerId: string,
  state: CareerFormState,
  formData: FormData
): Promise<CareerFormState> {
  const institutionId = await getInstitutionId()

  const validated = CareerSchema.safeParse({ name: formData.get('name') })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[] } }
  }

  const { name } = validated.data

  const existing = await prisma.career.findUnique({ where: { name_institutionId: { name, institutionId } } })
  if (existing && existing.id !== careerId) {
    return { errors: { name: ['Esta carrera ya existe en tu institución.'] } }
  }

  await prisma.career.update({ where: { id: careerId }, data: { name } })

  revalidatePath('/dashboard/careers')
  return { success: true }
}

export async function toggleCareerStatus(careerId: string) {
  await getInstitutionId()
  const career = await prisma.career.findUnique({ where: { id: careerId }, select: { isActive: true } })
  if (!career) return
  await prisma.career.update({ where: { id: careerId }, data: { isActive: !career.isActive } })
  revalidatePath('/dashboard/careers')
}

export async function deleteCareer(careerId: string) {
  await getInstitutionId()
  const enrollments = await prisma.studentEnrollment.count({ where: { careerId } })
  if (enrollments > 0) return
  await prisma.career.delete({ where: { id: careerId } })
  revalidatePath('/dashboard/careers')
}
