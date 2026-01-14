/**
 * Logout API Route
 * 
 * Requirements:
 * - 5.5: Redirecionar para login quando sessão expira
 */

import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/services/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear session cookie
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expire immediately
  });

  return response;
}
