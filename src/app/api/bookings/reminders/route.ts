import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/bookings/reminders
 * Retorna agendamentos das próximas 24-48h para envio de lembretes
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        services(name, price, duration)
      `)
      .gte("date_time", tomorrow.toISOString())
      .lt("date_time", dayAfter.toISOString())
      .in("status", ["pending", "confirmed"])
      .order("date_time", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reminders: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
