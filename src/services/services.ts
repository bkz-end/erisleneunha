import { supabase, createServerClient } from "@/lib/supabase";
import type { Service, InsertService } from "@/types/database";

/**
 * Get all active services
 * Requirement 3.2: Exibir lista de serviços disponíveis
 */
export async function getServices(activeOnly = true): Promise<Service[]> {
  let query = supabase.from("services").select("*");
  
  if (activeOnly) {
    query = query.eq("active", true);
  }
  
  const { data, error } = await query.order("name");

  if (error) {
    console.error("Error fetching services:", error);
    return [];
  }

  return data || [];
}

/**
 * Get a single service by ID
 */
export async function getServiceById(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching service:", error);
    return null;
  }

  return data;
}

/**
 * Create a new service
 * Requirement 4.4: Gestão de serviços (criar)
 */
export async function createService(service: InsertService): Promise<Service | null> {
  const client = createServerClient();
  
  const { data, error } = await client
    .from("services")
    .insert(service as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating service:", error);
    return null;
  }

  return data as Service;
}

/**
 * Update a service
 * Requirement 4.4: Gestão de serviços (editar)
 */
export async function updateService(
  id: string,
  updates: Partial<InsertService>
): Promise<Service | null> {
  const client = createServerClient();
  
  const { data, error } = await client
    .from("services")
    .update(updates as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating service:", error);
    return null;
  }

  return data as Service;
}

/**
 * Delete a service (soft delete by setting active = false)
 * Requirement 4.4: Gestão de serviços (excluir)
 */
export async function deleteService(id: string): Promise<boolean> {
  const client = createServerClient();
  
  const { error } = await client
    .from("services")
    .update({ active: false } as never)
    .eq("id", id);

  if (error) {
    console.error("Error deleting service:", error);
    return false;
  }

  return true;
}
