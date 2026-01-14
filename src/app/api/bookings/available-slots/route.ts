/**
 * Available Slots API Route
 * 
 * Requirements:
 * - 3.3: Exibir horários disponíveis para o serviço selecionado
 * - 6.3: Filtrar horários já ocupados
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServiceById } from "@/services/services";

export const dynamic = "force-dynamic";

interface AvailableSlot {
  time: string;
  dateTime: string;
}

/**
 * GET /api/bookings/available-slots?serviceId=xxx&date=YYYY-MM-DD
 * Retorna horários disponíveis para um serviço em uma data específica
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");
    const dateStr = searchParams.get("date");

    if (!serviceId) {
      return NextResponse.json(
        { error: "serviceId é obrigatório" },
        { status: 400 }
      );
    }

    if (!dateStr) {
      return NextResponse.json(
        { error: "date é obrigatório (formato: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return NextResponse.json(
        { error: "Formato de data inválido. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Get service to know duration
    const service = await getServiceById(serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    // Get day of week (0 = Sunday, 6 = Saturday)
    const selectedDate = new Date(dateStr + "T12:00:00");
    const dayOfWeek = selectedDate.getDay();

    // Get available time slots for this day of week
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from("time_slots")
      .select("*")
      .eq("day_of_week", dayOfWeek)
      .eq("available", true)
      .order("start_time") as { data: { id: string; day_of_week: number; start_time: string; end_time: string; available: boolean }[] | null; error: unknown };

    if (timeSlotsError) {
      console.error("Error fetching time slots:", timeSlotsError);
      return NextResponse.json(
        { error: "Erro ao buscar horários" },
        { status: 500 }
      );
    }

    if (!timeSlots || timeSlots.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // Get existing bookings for this date
    const startOfDay = new Date(dateStr + "T00:00:00").toISOString();
    const endOfDay = new Date(dateStr + "T23:59:59").toISOString();

    const { data: existingBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("date_time, service_id")
      .gte("date_time", startOfDay)
      .lte("date_time", endOfDay)
      .neq("status", "cancelled") as { data: { date_time: string; service_id: string }[] | null; error: unknown };

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json(
        { error: "Erro ao verificar agendamentos" },
        { status: 500 }
      );
    }

    // Get service durations for booked services
    const bookedServiceIds = Array.from(new Set(existingBookings?.map(b => b.service_id) || []));
    const { data: bookedServices } = await supabase
      .from("services")
      .select("id, duration")
      .in("id", bookedServiceIds.length > 0 ? bookedServiceIds : ["none"]) as { data: { id: string; duration: number }[] | null };

    const serviceDurations: Record<string, number> = {};
    bookedServices?.forEach(s => {
      serviceDurations[s.id] = s.duration;
    });

    // Build list of occupied time ranges
    const occupiedRanges: { start: Date; end: Date }[] = [];
    existingBookings?.forEach(booking => {
      const bookingStart = new Date(booking.date_time);
      const duration = serviceDurations[booking.service_id] || 60;
      const bookingEnd = new Date(bookingStart.getTime() + duration * 60 * 1000);
      occupiedRanges.push({ start: bookingStart, end: bookingEnd });
    });

    // Generate available slots
    const availableSlots: AvailableSlot[] = [];
    const serviceDuration = service.duration;

    for (const slot of timeSlots) {
      // Parse start and end times
      const [startHour, startMin] = slot.start_time.split(":").map(Number);
      const [endHour, endMin] = slot.end_time.split(":").map(Number);

      // Generate slots within this time range
      let currentTime = new Date(selectedDate);
      currentTime.setHours(startHour, startMin, 0, 0);

      const slotEndTime = new Date(selectedDate);
      slotEndTime.setHours(endHour, endMin, 0, 0);

      while (currentTime.getTime() + serviceDuration * 60 * 1000 <= slotEndTime.getTime()) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60 * 1000);

        // Check if this slot overlaps with any existing booking
        const isOccupied = occupiedRanges.some(range => {
          return slotStart < range.end && slotEnd > range.start;
        });

        // Check if slot is in the past
        const now = new Date();
        const isPast = slotStart <= now;

        if (!isOccupied && !isPast) {
          availableSlots.push({
            time: slot.start_time.substring(0, 5) === currentTime.toTimeString().substring(0, 5) 
              ? slot.start_time.substring(0, 5)
              : currentTime.toTimeString().substring(0, 5),
            dateTime: slotStart.toISOString(),
          });
        }

        // Move to next slot (30 min intervals)
        currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
      }
    }

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error("Error getting available slots:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
