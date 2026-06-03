'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { createAuditLog } from '@/app/lib/audit'

const StudentSchema = z.object({
  name:  z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  dni:   z.string().min(5, { error: 'Cédula inválida.' }).trim(),
  email: z.email({ error: 'Correo inválido.' }).trim(),
})

type StudentFormState =
  | { errors?: { name?: string[]; dni?: string[]; email?: string[] }; message?: string; success?: boolean }
  | undefined

async function getInstitutionId() {
  const session = await verifySession()
  if (session.role !== 'UNIVERSITY') throw new Error('Solo universidades pueden gestionar estudiantes.')
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { institutionId: true },
  })
  if (!user?.institutionId) throw new Error('Usuario sin institución asignada.')
  return user.institutionId
}

export async function createStudent(
  state: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const session       = await verifySession()
  const institutionId = await getInstitutionId()
  const careerId = (formData.get('careerId') as string) || null

  const validated = StudentSchema.safeParse({
    name:  formData.get('name'),
    dni:   formData.get('dni'),
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[]; dni?: string[]; email?: string[] } }
  }

  const { name, dni, email } = validated.data

  const student = await prisma.student.upsert({
    where: { dni },
    update: { name, email },
    create: { name, dni, email },
  })

  const existing = await prisma.studentEnrollment.findUnique({
    where: { studentId_institutionId: { studentId: student.id, institutionId } },
  })

  if (existing) {
    return { errors: { dni: ['Este estudiante ya está matriculado en tu institución.'] } }
  }

  await prisma.studentEnrollment.create({
    data: { studentId: student.id, institutionId, careerId: careerId || null },
  })

  createAuditLog({
    action: 'STUDENT_CREATED',
    entityType: 'Student',
    entityId: student.id,
    metadata: { studentName: name, studentDni: dni },
    userId: session.userId,
  })

  revalidatePath('/dashboard/students')
  redirect('/dashboard/students')
}

export async function updateStudent(
  enrollmentId: string,
  state: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const session = await verifySession()
  const careerId = (formData.get('careerId') as string) || null

  const validated = StudentSchema.safeParse({
    name:  formData.get('name'),
    dni:   formData.get('dni'),
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as { name?: string[]; dni?: string[]; email?: string[] } }
  }

  const { name, dni, email } = validated.data

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { studentId: true },
  })
  if (!enrollment) return { message: 'Matrícula no encontrada.' }

  const existing = await prisma.student.findUnique({ where: { dni } })
  if (existing && existing.id !== enrollment.studentId) {
    return { errors: { dni: ['Esta cédula ya pertenece a otro estudiante.'] } }
  }

  await Promise.all([
    prisma.student.update({
      where: { id: enrollment.studentId },
      data: { name, dni, email },
    }),
    prisma.studentEnrollment.update({
      where: { id: enrollmentId },
      data: { careerId: careerId || null },
    }),
  ])

  createAuditLog({
    action: 'STUDENT_UPDATED',
    entityType: 'Student',
    entityId: enrollment.studentId,
    metadata: { studentName: name, studentDni: dni },
    userId: session.userId,
  })

  revalidatePath('/dashboard/students')
  return { success: true }
}

export async function toggleStudentStatus(studentId: string) {
  await verifySession()
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { isActive: true } })
  if (!student) return
  await prisma.student.update({ where: { id: studentId }, data: { isActive: !student.isActive } })
  revalidatePath('/dashboard/students')
}

export async function removeEnrollment(enrollmentId: string) {
  await verifySession()
  await prisma.studentEnrollment.delete({ where: { id: enrollmentId } })
  revalidatePath('/dashboard/students')
}

export async function importStudentsFromCSV(
  _: unknown,
  formData: FormData
): Promise<{ success?: boolean; message?: string; imported?: number; errors?: string[] }> {
  const institutionId = await getInstitutionId()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { message: 'Selecciona un archivo CSV.' }

  const careerId = (formData.get('careerId') as string)?.trim() || null
  if (!careerId) return { message: 'Selecciona una carrera antes de importar.' }

  const text = await file.text()
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const rows = lines[0]?.toLowerCase().includes('nombre') ? lines.slice(1) : lines

  const errs: string[] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const [name, dni, email] = cols

    if (!name || !dni || !email) { errs.push(`Fila ${i + 2}: nombre, cédula y email son obligatorios.`); continue }

    const validated = StudentSchema.safeParse({ name, dni, email })
    if (!validated.success) { errs.push(`Fila ${i + 2}: datos inválidos.`); continue }

    const student = await prisma.student.upsert({
      where: { dni: validated.data.dni },
      update: { name: validated.data.name, email: validated.data.email },
      create: { name: validated.data.name, dni: validated.data.dni, email: validated.data.email },
    })

    await prisma.studentEnrollment.upsert({
      where: { studentId_institutionId: { studentId: student.id, institutionId } },
      update: { careerId },
      create: { studentId: student.id, institutionId, careerId },
    })

    imported++
  }

  revalidatePath('/dashboard/students')
  return {
    success: imported > 0,
    message: `${imported} estudiante(s) importados${errs.length ? ` con ${errs.length} error(es).` : '.'}`,
    imported,
    errors: errs,
  }
}
