/**
 * Login API Route
 * 
 * Requirements:
 * - 5.2: Criar sessão autenticada com credenciais válidas
 * - 5.3: Exibir mensagem de erro com credenciais inválidas
 */

import { NextRequest, NextResponse } from "next/server";
import { login, createSessionToken, SESSION_COOKIE_NAME } from "@/services/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const result = await login(email, password);

    if (!result.success || !result.session) {
      return NextResponse.json(
        { error: result.error || "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // Create session token
    const token = createSessionToken(result.session);

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: result.session.userId,
        email: result.session.email,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
