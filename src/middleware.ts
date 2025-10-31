import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  // Public paths that don't require authentication
  const publicPaths = ['/auth/login', '/auth/signup', '/auth/callback', '/auth/error']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Onboarding paths
  const isOnboardingPath = request.nextUrl.pathname.startsWith('/onboarding')

  // Skip auth checks for API routes - they handle their own auth
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicPath && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in
  if (user && !isApiRoute) {
    const onboardingCompleted = user.user_metadata?.onboarding_completed

    // If onboarding is not complete and not already on onboarding path
    if (onboardingCompleted === false && !isOnboardingPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/organization'
      return NextResponse.redirect(url)
    }

    // If onboarding is complete and trying to access onboarding pages
    if (onboardingCompleted === true && isOnboardingPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/search'
      return NextResponse.redirect(url)
    }

    // If user is trying to access auth pages (except callback)
    if (isPublicPath && request.nextUrl.pathname !== '/auth/callback') {
      const url = request.nextUrl.clone()
      // Redirect based on onboarding status
      url.pathname = onboardingCompleted === false ? '/onboarding/organization' : '/search'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
