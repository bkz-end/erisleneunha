/**
 * Individual Service API Routes
 * 
 * Requirements:
 * - 4.4: Gestão de serviços (criar, editar, excluir) com campos: nome, preço, duração
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceById, updateService, deleteService } from "@/services/services";
import { validateSession, SESSION_COOKIE_NAME } from "@/services/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/services/[id]
 * Busca um serviço específico por ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const service = await getServiceById(id);

    if (!service) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Erro ao buscar serviço" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/services/[id]
 * Atualiza um serviço existente (requer autenticação admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params;
    const body = await request.json();
    const { name, price, duration, active } = body;

    // Check if service exists
    const existingService = await getServiceById(id);
    if (!existingService) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Nome do serviço deve ser uma string não vazia" },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (price !== undefined) {
      if (typeof price !== "number" || price < 0) {
        return NextResponse.json(
          { error: "Preço deve ser um número válido" },
          { status: 400 }
        );
      }
      updates.price = price;
    }

    if (duration !== undefined) {
      if (typeof duration !== "number" || duration <= 0) {
        return NextResponse.json(
          { error: "Duração deve ser um número positivo (em minutos)" },
          { status: 400 }
        );
      }
      updates.duration = duration;
    }

    if (active !== undefined) {
      if (typeof active !== "boolean") {
        return NextResponse.json(
          { error: "Campo 'active' deve ser um booleano" },
          { status: 400 }
        );
      }
      updates.active = active;
    }

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const service = await updateService(id, updates);

    if (!service) {
      return NextResponse.json(
        { error: "Erro ao atualizar serviço" },
        { status: 500 }
      );
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/[id]
 * Exclui um serviço (soft delete - requer autenticação admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params;

    // Check if service exists
    const existingService = await getServiceById(id);
    if (!existingService) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    const success = await deleteService(id);

    if (!success) {
      return NextResponse.json(
        { error: "Erro ao excluir serviço" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Serviço excluído com sucesso" });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
