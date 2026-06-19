import { z } from 'zod'

export enum Role {
  ADMIN = 'ADMIN',
  UNIVERSITY = 'UNIVERSITY',
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
})

export type ProfileFormState =
  | {
      errors?: {
        name?: string[]
        position?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined

// ── Usuarios ──────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.email({ error: 'Correo electrónico inválido.' }).trim(),
  name: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'UNIVERSITY'], { error: 'Rol inválido.' }),
  institutionId: z.string().optional(),
}).refine(
  (data) => data.role !== 'UNIVERSITY' || !!data.institutionId,
  { error: 'Debe seleccionar una institución.', path: ['institutionId'] }
)

export const UpdateUserSchema = z.object({
  name: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'UNIVERSITY'], { error: 'Rol inválido.' }),
  institutionId: z.string().optional(),
}).refine(
  (data) => data.role !== 'UNIVERSITY' || !!data.institutionId,
  { error: 'Debe seleccionar una institución.', path: ['institutionId'] }
)

export type UserFormState =
  | {
      errors?: {
        email?: string[]
        name?: string[]
        role?: string[]
        institutionId?: string[]
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

// ── Solicitud de cuenta ───────────────────────────────────────────────────────

export const AccountRequestSchema = z.object({
  name:        z.string().min(2, { error: 'Mínimo 2 caracteres.' }).max(100, { error: 'Máximo 100 caracteres.' }).trim(),
  email:       z.string().max(254, { error: 'Correo demasiado largo.' }).email({ error: 'Correo electrónico inválido.' }).trim(),
  phone:       z.string().min(7, { error: 'Teléfono inválido.' }).max(20, { error: 'Máximo 20 caracteres.' }).trim(),
  institution: z.string().min(2, { error: 'Mínimo 2 caracteres.' }).max(200, { error: 'Máximo 200 caracteres.' }).trim(),
  message:     z.string().min(10, { error: 'El mensaje debe tener al menos 10 caracteres.' }).max(1000, { error: 'Máximo 1000 caracteres.' }).trim(),
})

export type AccountRequestFormState =
  | {
      errors?: {
        name?:        string[]
        email?:       string[]
        phone?:       string[]
        institution?: string[]
        message?:     string[]
      }
      success?: boolean
    }
  | undefined
