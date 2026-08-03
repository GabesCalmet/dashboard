import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/callback"];
const IDLE_COOKIE = "upfront_last_active";
const USER_ID_HEADER = "x-user-id";
const idleMinutes = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? 30);

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

export async function updateSession(request: NextRequest) {
  // Never trust a client-supplied value here — it's only ever set below,
  // after auth.getUser() has verified the session with Supabase.
  request.headers.delete(USER_ID_HEADER);

  const cookiesToForward: { name: string; value: string; options?: Record<string, unknown> }[] = [];

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
          cookiesToForward.push(...cookiesToSet);
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

  let touchIdleCookie = false;
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
    touchIdleCookie = true;
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Pass the already-verified user id downstream via a request header so
  // page renders and Server Actions can read it directly (see
  // lib/auth.ts#getCurrentUser) instead of calling auth.getUser() a second
  // time — that call is a real network round-trip to Supabase, and doing it
  // twice per request roughly doubles auth latency on every navigation.
  if (user) {
    request.headers.set(USER_ID_HEADER, user.id);
  }

  const response = NextResponse.next({ request });
  cookiesToForward.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
  if (touchIdleCookie) {
    response.cookies.set(IDLE_COOKIE, String(Date.now()), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
