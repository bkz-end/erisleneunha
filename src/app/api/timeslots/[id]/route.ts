/**
 * Individual Time Slot API Routes
 * 
 * Requirements:
 * - 4.5: Gestão de horários disponíveis para agendamento
 */

import { NextRequest, NextResponse } from "next/server";
import { getTimeSlotById, updateTimeSlot, deleteTimeSlot } from "@/services/timeslots";
import { requireAdmin } from "@/lib/admin-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/timeslots/[id]
 * Busca um horário específico por ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const { id } = await params;
    const timeSlot = await getTimeSlotById(id);

    if (!timeSlot) {
      return NextResponse.json(
        { error: "Horário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ timeSlot });
  } catch (error) {
    console.error("Error fetching time slot:", error);
    return NextResponse.json(
      { error: "Erro ao buscar horário" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/timeslots/[id]
 * Atualiza um horário existente (requer autenticação admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const { id } = await params;
    const body = await request.json();
    const { day_of_week, start_time, end_time, available } = body;

    // Check if time slot exists
    const existingTimeSlot = await getTimeSlotById(id);
    if (!existingTimeSlot) {
      return NextResponse.json(
        { error: "Horário não encontrado" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (day_of_week !== undefined) {
      if (typeof day_of_week !== "number" || day_of_week < 0 || day_of_week > 6) {
        return NextResponse.json(
          { error: "Dia da semana deve ser um número entre 0 (Domingo) e 6 (Sábado)" },
          { status: 400 }
        );
      }
      updates.day_of_week = day_of_week;
    }

    if (start_time !== undefined) {
      if (typeof start_time !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(start_time)) {
        return NextResponse.json(
          { error: "Horário de início deve estar no formato HH:mm ou HH:mm:ss" },
          { status: 400 }
        );
      }
      updates.start_time = start_time;
    }

    if (end_time !== undefined) {
      if (typeof end_time !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(end_time)) {
        return NextResponse.json(
          { error: "Horário de término deve estar no formato HH:mm ou HH:mm:ss" },
          { status: 400 }
        );
      }
      updates.end_time = end_time;
    }

    // Validate time order if both are being updated or one is updated
    const finalStartTime = (updates.start_time as string) || existingTimeSlot.start_time;
    const finalEndTime = (updates.end_time as string) || existingTimeSlot.end_time;
    
    if (finalStartTime >= finalEndTime) {
      return NextResponse.json(
        { error: "Horário de término deve ser após o horário de início" },
        { status: 400 }
      );
    }

    if (available !== undefined) {
      if (typeof available !== "boolean") {
        return NextResponse.json(
          { error: "Campo 'available' deve ser um booleano" },
          { status: 400 }
        );
      }
      updates.available = available;
    }

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const timeSlot = await updateTimeSlot(id, updates);

    if (!timeSlot) {
      return NextResponse.json(
        { error: "Erro ao atualizar horário" },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeSlot });
  } catch (error) {
    console.error("Error updating time slot:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/timeslots/[id]
 * Exclui um horário (requer autenticação admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const { id } = await params;

    // Check if time slot exists
    const existingTimeSlot = await getTimeSlotById(id);
    if (!existingTimeSlot) {
      return NextResponse.json(
        { error: "Horário não encontrado" },
        { status: 404 }
      );
    }

    const success = await deleteTimeSlot(id);

    if (!success) {
      return NextResponse.json(
        { error: "Erro ao excluir horário" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Horário excluído com sucesso" });
  } catch (error) {
    console.error("Error deleting time slot:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
