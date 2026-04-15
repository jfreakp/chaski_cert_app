import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from './session'
import { prisma } from './prisma'
import { Role } from './definitions'

export const verifySession = cache(async () => {
  const session = await getSession()
  if (!session?.userId) redirect('/login')
  return session
})

export const getCurrentUser = cache(async () => {
  const session = await getSession()
  if (!session?.userId) return null

  // Si el token es antiguo y no trae email, lo buscamos en la DB
  if (!session.email) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, name: true },
    })
    if (!user) return null
    return {
      id: user.id,
      role: user.role as Role,
      email: user.email,
      name: user.name ?? null,
    }
  }

  return {
    id: session.userId,
    role: session.role as Role,
    email: session.email,
    name: session.name ?? null,
  }
})

export async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== Role.ADMIN) redirect('/dashboard')
  return session
}
