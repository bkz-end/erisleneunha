import { supabase, createServerClient } from "@/lib/supabase";
import type { TimeSlot, InsertTimeSlot } from "@/types/database";

/**
 * Get all time slots
 * Requirement 4.5: Gestão de horários disponíveis
 */
export async function getTimeSlots(availableOnly = false): Promise<TimeSlot[]> {
  let query = supabase.from("time_slots").select("*");
  
  if (availableOnly) {
    query = query.eq("available", true);
  }
  
  const { data, error } = await query
    .order("day_of_week")
    .order("start_time");

  if (error) {
    console.error("Error fetching time slots:", error);
    return [];
  }

  return data || [];
}

/**
 * Get a single time slot by ID
 * Requirement 4.5: Gestão de horários
 */
export async function getTimeSlotById(id: string): Promise<TimeSlot | null> {
  const { data, error } = await supabase
    .from("time_slots")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching time slot:", error);
    return null;
  }

  return data;
}

/**
 * Get time slots for a specific day
 * Requirement 3.3: Exibir horários disponíveis
 */
export async function getTimeSlotsForDay(dayOfWeek: number): Promise<TimeSlot[]> {
  const { data, error } = await supabase
    .from("time_slots")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .eq("available", true)
    .order("start_time");

  if (error) {
    console.error("Error fetching time slots for day:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a new time slot
 * Requirement 4.5: Gestão de horários (criar)
 */
export async function createTimeSlot(slot: InsertTimeSlot): Promise<TimeSlot | null> {
  const client = createServerClient();
  
  const { data, error } = await client
    .from("time_slots")
    .insert(slot as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating time slot:", error);
    return null;
  }

  return data as TimeSlot;
}

/**
 * Update a time slot
 * Requirement 4.5: Gestão de horários (editar)
 */
export async function updateTimeSlot(
  id: string,
  updates: Partial<InsertTimeSlot>
): Promise<TimeSlot | null> {
  const client = createServerClient();
  
  const { data, error } = await client
    .from("time_slots")
    .update(updates as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating time slot:", error);
    return null;
  }

  return data as TimeSlot;
}

/**
 * Delete a time slot
 * Requirement 4.5: Gestão de horários (excluir)
 */
export async function deleteTimeSlot(id: string): Promise<boolean> {
  const client = createServerClient();
  
  const { error } = await client
    .from("time_slots")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting time slot:", error);
    return false;
  }

  return true;
}
