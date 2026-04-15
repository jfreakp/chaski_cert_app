'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { sendWelcomeEmail, sendPasswordResetEmail } from '@/app/lib/email'
import {
  CreateUserSchema,
  UpdateUserSchema,
  ResetPasswordSchema,
  type UserFormState,
  type ResetPasswordFormState,
} from '@/app/lib/definitions'

// ── Crear usuario ─────────────────────────────────────────────────────────────

export async function createUser(
  state: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin()

  const validatedFields = CreateUserSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
    role: formData.get('role'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as {
        email?: string[]
        name?: string[]
        role?: string[]
      },
    }
  }

  const { email, name, role } = validatedFields.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { errors: { email: ['Este correo ya está registrado.'] } }
  }

  // Generar contraseña aleatoria (el usuario la establecerá vía reset link)
  const randomPassword = randomBytes(32).toString('hex')
  const hashedPassword = await bcrypt.hash(randomPassword, 12)

  // Generar token de activación
  const resetToken = randomBytes(32).toString('hex')
  const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.user.create({
    data: {
      email,
      name: name || null,
      role: role as 'ADMIN' | 'ISSUER',
      password: hashedPassword,
      resetToken,
      resetTokenExpiry,
    },
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

  try {
    await sendWelcomeEmail(email, name || null, resetUrl)
  } catch {
    // El usuario fue creado; el correo falló pero no bloqueamos la creación
    revalidatePath('/dashboard/users')
    return {
      success: true,
      message: 'Usuario creado. No se pudo enviar el correo de activación.',
    }
  }

  revalidatePath('/dashboard/users')
  redirect('/dashboard/users')
}

// ── Actualizar usuario ────────────────────────────────────────────────────────

export async function updateUser(
  userId: string,
  state: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin()

  const validatedFields = UpdateUserSchema.safeParse({
    name: formData.get('name'),
    role: formData.get('role'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as {
        name?: string[]
        role?: string[]
      },
    }
  }

  const { name, role } = validatedFields.data

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || null,
      role: role as 'ADMIN' | 'ISSUER',
    },
  })

  revalidatePath('/dashboard/users')
  return { success: true }
}

// ── Toggle estado activo ──────────────────────────────────────────────────────

export async function toggleUserStatus(userId: string) {
  const session = await requireAdmin()

  if (session.userId === userId) {
    return // No puede desactivarse a sí mismo
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } })
  if (!user) return

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  })

  revalidatePath('/dashboard/users')
}

// ── Eliminar usuario ──────────────────────────────────────────────────────────

export async function deleteUser(userId: string) {
  const session = await requireAdmin()

  if (session.userId === userId) {
    return // No puede eliminarse a sí mismo
  }

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/dashboard/users')
}

// ── Enviar reset de contraseña (acción del admin) ─────────────────────────────

export async function sendPasswordReset(userId: string) {
  await requireAdmin()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })

  if (!user) return

  const resetToken = randomBytes(32).toString('hex')
  const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: userId },
    data: { resetToken, resetTokenExpiry },
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
  await sendPasswordResetEmail(user.email, user.name, resetUrl)

  revalidatePath('/dashboard/users')
}

// ── Confirmar reset de contraseña (acción del usuario) ───────────────────────

export async function confirmPasswordReset(
  state: ResetPasswordFormState,
  formData: FormData
): Promise<ResetPasswordFormState> {
  const validatedFields = ResetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as {
        token?: string[]
        password?: string[]
        confirmPassword?: string[]
      },
    }
  }

  const { token, password, confirmPassword } = validatedFields.data

  if (password !== confirmPassword) {
    return { errors: { confirmPassword: ['Las contraseñas no coinciden.'] } }
  }

  const user = await prisma.user.findUnique({
    where: { resetToken: token },
    select: { id: true, resetTokenExpiry: true },
  })

  if (!user || !user.resetTokenExpiry) {
    return { message: 'El enlace es inválido o ya fue utilizado.' }
  }

  if (user.resetTokenExpiry < new Date()) {
    return { message: 'El enlace ha expirado. Solicita un nuevo restablecimiento.' }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  redirect('/login?reset=success')
}
