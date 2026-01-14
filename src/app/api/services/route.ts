/**
 * Services API Routes
 * 
 * Requirements:
 * - 4.4: Gestão de serviços (criar, editar, excluir) com campos: nome, preço, duração
 */

import { NextRequest, NextResponse } from "next/server";
import { getServices, createService } from "@/services/services";
import { validateSession, SESSION_COOKIE_NAME } from "@/services/auth";

/**
 * GET /api/services
 * Lista todos os serviços
 */
export async function GET(request: NextRequest) {
  try {
    // Check for admin session to determine if we show all or only active
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionValidation = validateSession(sessionToken);
    
    // If admin is authenticated, show all services; otherwise only active
    const activeOnly = !sessionValidation.valid;
    const services = await getServices(activeOnly);

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Erro ao buscar serviços" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services
 * Cria um novo serviço (requer autenticação admin)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionValidation = validateSession(sessionToken);

    if (!sessionValidation.valid) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, price, duration } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nome do serviço é obrigatório" },
        { status: 400 }
      );
    }

    if (price === undefined || typeof price !== "number" || price < 0) {
      return NextResponse.json(
        { error: "Preço deve ser um número válido" },
        { status: 400 }
      );
    }

    if (!duration || typeof duration !== "number" || duration <= 0) {
      return NextResponse.json(
        { error: "Duração deve ser um número positivo (em minutos)" },
        { status: 400 }
      );
    }

    const service = await createService({
      name: name.trim(),
      price,
      duration,
      active: true,
    });

    if (!service) {
      return NextResponse.json(
        { error: "Erro ao criar serviço" },
        { status: 500 }
      );
    }

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
