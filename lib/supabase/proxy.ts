import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth token if expired
  const { data: { user } } = await supabase.auth.getUser();

  // Protect dashboard routes
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/overview') ||
                           request.nextUrl.pathname.startsWith('/content-studio') ||
                           request.nextUrl.pathname.startsWith('/calendar') ||
                           request.nextUrl.pathname.startsWith('/engagement') ||
                           request.nextUrl.pathname.startsWith('/networking') ||
                           request.nextUrl.pathname.startsWith('/lead-gen') ||
                           request.nextUrl.pathname.startsWith('/analytics') ||
                           request.nextUrl.pathname.startsWith('/settings');

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect from auth routes if already logged in
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/signup');

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/overview';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
