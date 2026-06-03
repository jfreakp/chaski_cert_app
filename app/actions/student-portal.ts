'use server'

import { SignJWT } from 'jose'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { sendMagicLinkEmail } from '@/app/lib/email'
import { requireStudentSession, deleteStudentSession } from '@/app/lib/student-session'

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function sendMagicLink(
  _prevState: unknown,
  formData: FormData
): Promise<{ message: string; success?: boolean }> {
  const genericOk = {
    message: 'Si tu email está registrado, recibirás un link en los próximos minutos.',
    success: true,
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return genericOk

  const student = await prisma.student.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
  })
  if (!student) return genericOk

  const minutes = parseInt(process.env.MAGIC_LINK_MINUTES ?? '15', 10)

  const token = await new SignJWT({
    studentId: student.id,
    email: student.email,
    name: student.name,
    type: 'magic-link',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(encodedKey)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const magicUrl = `${appUrl}/portal/login/verify?token=${token}`

  try {
    await sendMagicLinkEmail(student.email, student.name, magicUrl)
  } catch {
    // no revelar si el envío falló
  }

  return genericOk
}

export async function getMyCertificates() {
  const session = await requireStudentSession()

  return prisma.certificate.findMany({
    where: {
      studentId: session.studentId,
      status: { in: ['ISSUED', 'REGISTERED'] },
    },
    include: {
      process: {
        include: {
          institution: { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
      career: { select: { name: true } },
    },
    orderBy: { issuedAt: 'desc' },
  })
}

export async function getMyProfile() {
  const session = await requireStudentSession()

  return prisma.student.findUnique({
    where: { id: session.studentId },
    select: { name: true, dni: true, email: true },
  })
}

export async function logoutStudent() {
  await deleteStudentSession()
  redirect('/portal/login')
}
