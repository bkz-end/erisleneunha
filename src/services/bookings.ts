import { supabase, createServerClient } from "@/lib/supabase";
import type { Booking, InsertBooking, BookingStatus } from "@/types/database";

export interface BookingWithService extends Booking {
  service?: {
    name: string;
    price: number;
    duration: number;
  };
}

/**
 * Get all bookings with optional filters
 * Requirement 6.1: Exibir lista de agendamentos
 * Requirement 6.4: Ordenar por data/hora
 */
export async function getBookings(filters?: {
  status?: BookingStatus;
  fromDate?: Date;
  toDate?: Date;
}): Promise<BookingWithService[]> {
  let query = supabase
    .from("bookings")
    .select(`
      *,
      service:services(name, price, duration)
    `);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.fromDate) {
    query = query.gte("date_time", filters.fromDate.toISOString());
  }

  if (filters?.toDate) {
    query = query.lte("date_time", filters.toDate.toISOString());
  }

  const { data, error } = await query.order("date_time", { ascending: true });

  if (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }

  return (data || []) as BookingWithService[];
}

/**
 * Check if a time slot is available for booking
 * Requirement 6.3: Impedir agendamentos em horários já ocupados
 */
export async function isTimeSlotAvailable(
  dateTime: Date,
  duration: number
): Promise<boolean> {
  const startTime = dateTime;
  const endTime = new Date(dateTime.getTime() + duration * 60 * 1000);

  // Check for overlapping bookings
  const { data, error } = await supabase
    .from("bookings")
    .select("id, date_time")
    .neq("status", "cancelled")
    .gte("date_time", startTime.toISOString())
    .lt("date_time", endTime.toISOString());

  if (error) {
    console.error("Error checking time slot availability:", error);
    return false;
  }

  return !data || data.length === 0;
}

/**
 * Create a new booking
 * Requirement 6.2: Armazenar agendamento
 */
export async function createBooking(
  booking: InsertBooking
): Promise<Booking | null> {
  const client = createServerClient();

  const { data, error } = await client
    .from("bookings")
    .insert(booking as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating booking:", error);
    return null;
  }

  return data as Booking;
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<Booking | null> {
  const client = createServerClient();

  const { data, error } = await client
    .from("bookings")
    .update({ status } as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating booking status:", error);
    return null;
  }

  return data as Booking;
}

/**
 * Get booking by ID
 */
export async function getBookingById(id: string): Promise<BookingWithService | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      service:services(name, price, duration)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching booking:", error);
    return null;
  }

  return data as BookingWithService;
}
