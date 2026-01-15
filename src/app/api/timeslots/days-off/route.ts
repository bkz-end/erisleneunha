/**
 * Days Off API
 * GET - List all days off
 * POST - Add a day off
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const { data, error } = await supabase
      .from("days_off")
      .select("*")
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date");

    if (error) {
      // Se a tabela não existe, retorna array vazio
      if (error.code === "42P01") {
        return NextResponse.json({ daysOff: [] });
      }
      console.error("Error fetching days off:", error);
      return NextResponse.json(
        { error: "Erro ao buscar folgas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ daysOff: data || [] });
  } catch (error) {
    console.error("Error in GET days off:", error);
    return NextResponse.json({ daysOff: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const body = await request.json();
    const { date, reason } = body;

    if (!date) {
      return NextResponse.json(
        { error: "Data é obrigatória" },
        { status: 400 }
      );
    }

    const payload = { date, reason: reason || null };
    const { data, error } = await (supabase as any)
      .from("days_off")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error creating day off:", error);
      return NextResponse.json(
        { error: "Erro ao criar folga" },
        { status: 500 }
      );
    }

    return NextResponse.json({ dayOff: data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST day off:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
