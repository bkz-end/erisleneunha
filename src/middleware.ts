/**
 * Next.js Middleware for Subscription Verification (Kill Switch) and Authentication
 * 
 * Requirements:
 * - 1.2: Bloquear carregamento quando status == 'inactive' OR 'expired'
 * - 1.3: Permitir acesso quando status == 'active' OR 'trial' válido
 * - 1.4: Redirecionar admin para tela de pagamento se inativo/expirado
 * - 1.5: Exibir mensagem de pagamento pendente
 * - 1.6: Exibir tela de manutenção para cliente se inativo/expirado
 * - 1.7: Impedir visualização da agenda quando bloqueado
 * - 4.1: Exigir autenticação segura para painel administrativo
 * - 5.1: Redirecionar para login se não autenticado
 * - 5.5: Redirecionar para login quando sessão expira
 * - 8.2: Permitir acesso durante trial válido (dias <= 7)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Session cookie name (must match auth service)
const SESSION_COOKIE_NAME = "admin_session";

// Routes that should be excluded from subscription check
const PUBLIC_ROUTES = [
  "/manutencao",
  "/admin/pagamento-pendente",
  "/admin/login",
  "/api/webhooks",
  "/api/auth",
  "/_next",
  "/favicon.ico",
];

// Admin routes that require both subscription check AND authentication
const ADMIN_ROUTES_REQUIRING_AUTH = [
  "/admin",
];

// Admin routes that are excluded from auth (login, payment pending)
const ADMIN_AUTH_EXCLUDED = [
  "/admin/login",
  "/admin/pagamento-pendente",
];

// Client routes that require subscription check only
const CLIENT_ROUTES = ["/agendar", "/"];

/**
 * Check if the path matches any of the given routes
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => path.startsWith(route));
}

/**
 * Check if the path is a public route (no subscription check needed)
 */
function isPublicRoute(path: string): boolean {
  return matchesRoute(path, PUBLIC_ROUTES);
}

/**
 * Check if the path is an admin route requiring authentication
 */
function isAdminRouteRequiringAuth(path: string): boolean {
  return matchesRoute(path, ADMIN_ROUTES_REQUIRING_AUTH) && 
         !matchesRoute(path, ADMIN_AUTH_EXCLUDED);
}

/**
 * Check if the path is an admin route (for subscription check)
 */
function isAdminRoute(path: string): boolean {
  return matchesRoute(path, ADMIN_ROUTES_REQUIRING_AUTH);
}

/**
 * Check if the path is a client route
 */
function isClientRoute(path: string): boolean {
  return matchesRoute(path, CLIENT_ROUTES);
}

interface SubscriptionData {
  status: "active" | "inactive" | "expired" | "trial";
  trial_started_at: string | null;
}

/**
 * Get subscription status directly from database
 * Note: We can't use the service here because middleware runs on Edge runtime
 */
async function getSubscriptionFromDB(): Promise<SubscriptionData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials not configured");
    return null;
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("subscription")
    .select("status, trial_started_at")
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Error fetching subscription in middleware:", error);
    return null;
  }

  return data as SubscriptionData;
}

/**
 * Calculate trial days remaining
 */
function calculateTrialDaysRemaining(trialStartedAt: string | null): number | null {
  if (!trialStartedAt) return null;

  const startDate = new Date(trialStartedAt);
  const now = new Date();
  const diffTime = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return 7 - diffDays;
}

/**
 * Check if access should be allowed based on subscription status
 */
function shouldAllowAccess(subscription: SubscriptionData): boolean {
  const { status, trial_started_at } = subscription;

  // Active subscription: always allow
  if (status === "active") {
    return true;
  }

  // Trial subscription: allow if within 7 days
  if (status === "trial") {
    const daysRemaining = calculateTrialDaysRemaining(trial_started_at);
    return daysRemaining !== null && daysRemaining >= 0;
  }

  // Inactive or expired: deny access
  return false;
}

/**
 * Session interface for parsing session token
 */
interface Session {
  userId: string;
  email: string;
  expiresAt: number;
}

/**
 * Parse and validate session token from cookie
 * Requirements:
 * - 5.1: Redirecionar para login se não autenticado
 * - 5.5: Redirecionar para login quando sessão expira
 */
function validateSessionToken(token: string | undefined): { valid: boolean; session?: Session } {
  if (!token) {
    return { valid: false };
  }

  try {
    const json = Buffer.from(token, "base64").toString("utf-8");
    const session = JSON.parse(json) as Session;

    // Validate session structure
    if (
      typeof session.userId !== "string" ||
      typeof session.email !== "string" ||
      typeof session.expiresAt !== "number"
    ) {
      return { valid: false };
    }

    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      return { valid: false, session };
    }

    return { valid: true, session };
  } catch {
    return { valid: false };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip subscription check for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Only check subscription for admin and client routes
  if (!isAdminRoute(pathname) && !isClientRoute(pathname)) {
    return NextResponse.next();
  }

  // Get subscription status
  const subscription = await getSubscriptionFromDB();

  // Fail-safe: if we can't get subscription status, block access
  if (!subscription) {
    // For admin routes, redirect to payment page
    if (isAdminRoute(pathname)) {
      return NextResponse.redirect(new URL("/admin/pagamento-pendente", request.url));
    }
    // For client routes, redirect to maintenance page
    return NextResponse.redirect(new URL("/manutencao", request.url));
  }

  // Check if access should be allowed based on subscription
  const subscriptionAllowed = shouldAllowAccess(subscription);

  if (!subscriptionAllowed) {
    // For admin routes, redirect to payment page
    if (isAdminRoute(pathname)) {
      return NextResponse.redirect(new URL("/admin/pagamento-pendente", request.url));
    }
    // For client routes, redirect to maintenance page
    return NextResponse.redirect(new URL("/manutencao", request.url));
  }

  // For admin routes requiring authentication, check session
  // Requirements 4.1, 5.1, 5.5
  if (isAdminRouteRequiringAuth(pathname)) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const { valid } = validateSessionToken(sessionToken);

    if (!valid) {
      // Redirect to login if not authenticated or session expired
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Access allowed, continue to the requested page
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
