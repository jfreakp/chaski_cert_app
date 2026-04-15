import { z } from 'zod'

export enum Role {
  ADMIN = 'ADMIN',
  ISSUER = 'ISSUER',
}

export const LoginSchema = z.object({
  email: z.email({ error: 'Correo electrónico inválido.' }).trim(),
  password: z.string().min(1, { error: 'La contraseña es requerida.' }),
})

export type LoginFormState =
  | {
      errors?: {
        email?: string[]
        password?: string[]
      }
      message?: string
    }
  | undefined

export type SessionPayload = {
  userId: string
  role: Role
  email: string
  name: string | null
  expiresAt: Date
}

export const ProfileSchema = z.object({
  name: z.string().min(2, { error: 'Mínimo 2 caracteres.' }).trim(),
  position: z.string().trim().optional(),
  institution: z.string().trim().optional(),
})

export type ProfileFormState =
  | {
      errors?: {
        name?: string[]
        position?: string[]
        institution?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined

// ── Usuarios ──────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.email({ error: 'Correo electrónico inválido.' }).trim(),
  name: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'ISSUER'], { error: 'Rol inválido.' }),
})

export const UpdateUserSchema = z.object({
  name: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'ISSUER'], { error: 'Rol inválido.' }),
})

export type UserFormState =
  | {
      errors?: {
        email?: string[]
        name?: string[]
        role?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined

export const ForgotPasswordSchema = z.object({
  email: z.email({ error: 'Correo electrónico inválido.' }).trim(),
})

export type ForgotPasswordFormState =
  | {
      errors?: { email?: string[] }
      message?: string
      success?: boolean
    }
  | undefined

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { error: 'Token requerido.' }),
  password: z.string().min(8, { error: 'La contraseña debe tener al menos 8 caracteres.' }),
  confirmPassword: z.string().min(1, { error: 'Confirma la contraseña.' }),
})

export type ResetPasswordFormState =
  | {
      errors?: {
        token?: string[]
        password?: string[]
        confirmPassword?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined
