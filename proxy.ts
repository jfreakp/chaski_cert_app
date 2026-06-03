import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/app/lib/session'

const publicRoutes = ['/login', '/forgot-password', '/reset-password']
const adminRoutes = ['/dashboard/users', '/dashboard/institutions', '/dashboard/settings', '/dashboard/certificate-types']
const universityRoutes = [
  '/dashboard/careers',
  '/dashboard/students/new',
  '/dashboard/processes/new',
]

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.some((r) => path.startsWith(r))
  const isDashboardRoute = path.startsWith('/dashboard')
  const isAdminRoute = adminRoutes.some((r) => path.startsWith(r))
  const isUniversityRoute = universityRoutes.some((r) => path.startsWith(r))

  const sessionCookie = req.cookies.get('session')?.value
  const session = await decrypt(sessionCookie)

  if (isDashboardRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  if (isAdminRoute && session?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  if (isUniversityRoute && session?.role !== 'UNIVERSITY') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|svg|ico)$).*)'],
}
