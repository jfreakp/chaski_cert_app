'use server'

import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import {
  LoginSchema,
  ProfileSchema,
  ForgotPasswordSchema,
  type LoginFormState,
  type ProfileFormState,
  type ForgotPasswordFormState,
} from '@/app/lib/definitions'
import { createSession, deleteSession, refreshSession } from '@/app/lib/session'
import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { sendPasswordResetEmail } from '@/app/lib/email'

export async function login(
  state: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as {
        email?: string[]
        password?: string[]
      },
    }
  }

  const { email, password } = validatedFields.data
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.isActive) {
    return { message: 'Credenciales inválidas.' }
  }

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    return { message: 'Credenciales inválidas.' }
  }

  await createSession(user.id, user.role, user.email, user.name)
  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}

export async function requestPasswordReset(
  state: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const validatedFields = ForgotPasswordSchema.safeParse({
    email: formData.get('email'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as { email?: string[] },
    }
  }

  const { email } = validatedFields.data

  // Respuesta genérica para no revelar si el correo existe
  const genericSuccess: ForgotPasswordFormState = {
    success: true,
    message: 'Si el correo está registrado, recibirás un enlace en breve.',
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, isActive: true },
  })

  if (!user || !user.isActive) return genericSuccess

  const resetToken = randomBytes(32).toString('hex')
  const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry },
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

  try {
    await sendPasswordResetEmail(email, user.name, resetUrl)
  } catch {
    // No bloqueamos aunque el correo falle — evitamos revelar estado interno
  }

  return genericSuccess
}

export async function updateProfile(
  state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await verifySession()

  const validatedFields = ProfileSchema.safeParse({
    name: formData.get('name'),
    position: formData.get('position'),
    institution: formData.get('institution'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as {
        name?: string[]
        position?: string[]
        institution?: string[]
      },
    }
  }

  const { name, position, institution } = validatedFields.data

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: name || null,
      position: position || null,
      institution: institution || null,
    },
  })

  await refreshSession(name ?? null)
  revalidatePath('/dashboard/profile')

  return { success: true }
}
