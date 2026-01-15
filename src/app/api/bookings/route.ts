/**
 * Bookings API Route
 * 
 * Requirements:
 * - 3.5: Criar agendamento e disparar mensagem para WhatsApp
 * - 6.2: Armazenar dados do agendamento
 * - 6.3: Impedir agendamentos em horários já ocupados
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServiceById } from "@/services/services";
import { requireAdmin } from "@/lib/admin-auth";

interface CreateBookingRequest {
  serviceId: string;
  dateTime: string;
  clientName: string;
  clientWhatsApp: string;
}

/**
 * POST /api/bookings
 * Cria um novo agendamento
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateBookingRequest = await request.json();
    const { serviceId, dateTime, clientName, clientWhatsApp } = body;

    // Validações
    if (!serviceId || !dateTime || !clientName || !clientWhatsApp) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar nome
    if (clientName.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome deve ter pelo menos 2 caracteres" },
        { status: 400 }
      );
    }

    // Validar WhatsApp (10 ou 11 dígitos)
    const whatsappNumbers = clientWhatsApp.replace(/\D/g, "");
    if (whatsappNumbers.length < 10 || whatsappNumbers.length > 11) {
      return NextResponse.json(
        { error: "WhatsApp inválido" },
        { status: 400 }
      );
    }

    // Verificar se serviço existe
    const service = await getServiceById(serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    // Verificar conflito de horário
    const bookingStart = new Date(dateTime);
    const bookingEnd = new Date(bookingStart.getTime() + service.duration * 60 * 1000);

    // Buscar agendamentos existentes que possam conflitar
    const startOfDay = new Date(bookingStart);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingStart);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existingBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("date_time, service_id")
      .gte("date_time", startOfDay.toISOString())
      .lte("date_time", endOfDay.toISOString())
      .neq("status", "cancelled") as { data: { date_time: string; service_id: string }[] | null; error: unknown };

    if (bookingsError) {
      console.error("Error checking existing bookings:", bookingsError);
      return NextResponse.json(
        { error: "Erro ao verificar disponibilidade" },
        { status: 500 }
      );
    }

    // Buscar durações dos serviços agendados
    const bookedServiceIds = Array.from(new Set(existingBookings?.map(b => b.service_id) || []));
    const { data: bookedServices } = await supabase
      .from("services")
      .select("id, duration")
      .in("id", bookedServiceIds.length > 0 ? bookedServiceIds : ["none"]) as { data: { id: string; duration: number }[] | null };

    const serviceDurations: Record<string, number> = {};
    bookedServices?.forEach(s => {
      serviceDurations[s.id] = s.duration;
    });

    // Verificar conflitos
    const hasConflict = existingBookings?.some(booking => {
      const existingStart = new Date(booking.date_time);
      const existingDuration = serviceDurations[booking.service_id] || 60;
      const existingEnd = new Date(existingStart.getTime() + existingDuration * 60 * 1000);

      // Verifica sobreposição
      return bookingStart < existingEnd && bookingEnd > existingStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: "Este horário já está ocupado" },
        { status: 409 }
      );
    }

    // Criar agendamento
    const { data: booking, error: createError } = await supabase
      .from("bookings")
      .insert({
        service_id: serviceId,
        date_time: dateTime,
        client_name: clientName.trim(),
        client_whatsapp: whatsappNumbers,
        status: "pending",
      } as never)
      .select()
      .single();

    if (createError) {
      console.error("Error creating booking:", createError);
      return NextResponse.json(
        { error: "Erro ao criar agendamento" },
        { status: 500 }
      );
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/bookings:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings
 * Lista agendamentos (para admin)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");
    const queryText = searchParams.get("q");

    let query = supabase
      .from("bookings")
      .select(`
        *,
        services (
          id,
          name,
          price,
          duration
        )
      `)
      .order("date_time", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }

    if (date) {
      const startOfDay = new Date(date + "T00:00:00").toISOString();
      const endOfDay = new Date(date + "T23:59:59").toISOString();
      query = query.gte("date_time", startOfDay).lte("date_time", endOfDay);
    }

    if (serviceId) {
      query = query.eq("service_id", serviceId);
    }

    if (queryText && queryText.trim()) {
      const text = queryText.trim();
      const phone = text.replace(/\D/g, "");
      const filters = [`client_name.ilike.%${text}%`];
      if (phone) {
        filters.push(`client_whatsapp.ilike.%${phone}%`);
      }
      query = query.or(filters.join(","));
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json(
        { error: "Erro ao buscar agendamentos" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Error in GET /api/bookings:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
