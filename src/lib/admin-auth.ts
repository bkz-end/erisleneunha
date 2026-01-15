import { NextRequest, NextResponse } from "next/server";
import { validateSession, SESSION_COOKIE_NAME } from "@/services/auth";

export function requireAdmin(request: NextRequest): NextResponse | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionValidation = validateSession(token);

  if (!sessionValidation.valid) {
    return NextResponse.json(
      { error: "N\u00e3o autorizado" },
      { status: 401 }
    );
  }

  return null;
}
