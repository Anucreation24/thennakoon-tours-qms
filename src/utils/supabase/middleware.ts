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

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, fetch their role from profiles table
  let role = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = profile?.role || null;
  }

  const url = request.nextUrl.clone();

  // Protect routes:
  // If not logged in and trying to access dashboard/admin routes, redirect to login
  if (!user && !url.pathname.startsWith('/login') && url.pathname !== '/favicon.ico') {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If logged in and trying to go to login, redirect to dashboard
  if (user && url.pathname.startsWith('/login')) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Role permissions checking:
  // Staff cannot access settings, user management (e.g. /dashboard/users, /dashboard/settings)
  if (user && role === 'staff') {
    if (
      url.pathname.startsWith('/dashboard/users') ||
      url.pathname.startsWith('/dashboard/settings')
    ) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Redirect root '/' to '/dashboard' if logged in, or '/login' if not logged in
  if (url.pathname === '/') {
    url.pathname = user ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
