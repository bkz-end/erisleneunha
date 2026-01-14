/**
 * Days Off API
 * GET - List all days off
 * POST - Add a day off
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    const body = await request.json();
    const { date, reason } = body;

    if (!date) {
      return NextResponse.json(
        { error: "Data é obrigatória" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("days_off")
      .insert({ date, reason: reason || null })
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
