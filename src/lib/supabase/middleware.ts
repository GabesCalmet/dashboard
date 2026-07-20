import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/callback"];
const IDLE_COOKIE = "upfront_last_active";
const idleMinutes = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? 30);

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && !isPublicPath(pathname)) {
    const lastActive = request.cookies.get(IDLE_COOKIE)?.value;
    const now = Date.now();
    if (lastActive && now - Number(lastActive) > idleMinutes * 60 * 1000) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("reason", "idle");
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.cookies.delete(IDLE_COOKIE);
      return redirectResponse;
    }
    supabaseResponse.cookies.set(IDLE_COOKIE, String(now), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
