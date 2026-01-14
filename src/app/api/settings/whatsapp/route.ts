import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET - Buscar WhatsApp configurado
export async function GET() {
  try {
    const client = createServerClient();
    
    const { data } = await client
      .from("settings")
      .select("value")
      .eq("key", "admin_whatsapp")
      .single() as { data: { value: string } | null };

    return NextResponse.json({ whatsapp: data?.value || "" });
  } catch (error) {
    console.error("Error fetching whatsapp:", error);
    return NextResponse.json({ whatsapp: "" });
  }
}

// POST - Salvar WhatsApp
export async function POST(request: NextRequest) {
  try {
    const { whatsapp } = await request.json();
    const client = createServerClient();

    // Verificar se já existe
    const { data: existing } = await client
      .from("settings")
      .select("id")
      .eq("key", "admin_whatsapp")
      .single() as { data: { id: string } | null };

    if (existing) {
      await client
        .from("settings")
        .update({ value: whatsapp, updated_at: new Date().toISOString() } as never)
        .eq("key", "admin_whatsapp");
    } else {
      await client
        .from("settings")
        .insert({ key: "admin_whatsapp", value: whatsapp } as never);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving whatsapp:", error);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
