import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/app/lib/session'

const publicRoutes = ['/login', '/forgot-password', '/reset-password']
const adminRoutes = ['/dashboard/admin', '/dashboard/users']

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.some((r) => path.startsWith(r))
  const isDashboardRoute = path.startsWith('/dashboard')
  const isAdminRoute = adminRoutes.some((r) => path.startsWith(r))

  const sessionCookie = req.cookies.get('session')?.value
  const session = await decrypt(sessionCookie)

  // Redirigir a /login si no autenticado y ruta protegida
  if (isDashboardRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // Redirigir a /dashboard si ya autenticado y en ruta pública
  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  // Solo ADMIN puede acceder a rutas de administración
  if (isAdminRoute && session?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|svg|ico)$).*)'],
}
