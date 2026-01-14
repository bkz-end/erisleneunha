/**
 * Time Slots API Routes
 * 
 * Requirements:
 * - 4.5: Gestão de horários disponíveis para agendamento
 */

import { NextRequest, NextResponse } from "next/server";
import { getTimeSlots, createTimeSlot } from "@/services/timeslots";
import { validateSession, SESSION_COOKIE_NAME } from "@/services/auth";

/**
 * GET /api/timeslots
 * Lista todos os horários
 */
export async function GET(request: NextRequest) {
  try {
    // Check for admin session to determine if we show all or only available
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionValidation = validateSession(sessionToken);
    
    // If admin is authenticated, show all time slots; otherwise only available
    const availableOnly = !sessionValidation.valid;
    const timeSlots = await getTimeSlots(availableOnly);

    return NextResponse.json({ timeSlots });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json(
      { error: "Erro ao buscar horários" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timeslots
 * Cria um novo horário (requer autenticação admin)
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
    const { day_of_week, start_time, end_time, available } = body;

    // Validate required fields
    if (day_of_week === undefined || typeof day_of_week !== "number" || day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json(
        { error: "Dia da semana deve ser um número entre 0 (Domingo) e 6 (Sábado)" },
        { status: 400 }
      );
    }

    if (!start_time || typeof start_time !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(start_time)) {
      return NextResponse.json(
        { error: "Horário de início deve estar no formato HH:mm ou HH:mm:ss" },
        { status: 400 }
      );
    }

    if (!end_time || typeof end_time !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(end_time)) {
      return NextResponse.json(
        { error: "Horário de término deve estar no formato HH:mm ou HH:mm:ss" },
        { status: 400 }
      );
    }

    // Validate that end_time is after start_time
    if (start_time >= end_time) {
      return NextResponse.json(
        { error: "Horário de término deve ser após o horário de início" },
        { status: 400 }
      );
    }

    const timeSlot = await createTimeSlot({
      day_of_week,
      start_time,
      end_time,
      available: available !== undefined ? available : true,
    });

    if (!timeSlot) {
      return NextResponse.json(
        { error: "Erro ao criar horário" },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeSlot }, { status: 201 });
  } catch (error) {
    console.error("Error creating time slot:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
