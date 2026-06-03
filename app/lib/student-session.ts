import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type StudentSessionPayload = {
  studentId: string
  email: string
  name: string
  expiresAt: Date
}

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function createStudentSession(studentId: string, email: string, name: string) {
  const days = parseInt(process.env.STUDENT_SESSION_DAYS ?? '7', 10)
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const token = await new SignJWT({ studentId, email, name, expiresAt: expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(encodedKey)

  const cookieStore = await cookies()
  cookieStore.set('student-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('student-session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] })
    return payload as unknown as StudentSessionPayload
  } catch {
    return null
  }
}

export async function deleteStudentSession() {
  const cookieStore = await cookies()
  cookieStore.delete('student-session')
}

export async function requireStudentSession(): Promise<StudentSessionPayload> {
  const session = await getStudentSession()
  if (!session) redirect('/portal/login')
  return session
}
