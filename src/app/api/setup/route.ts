/**
 * Setup Route - Criar/resetar admin
 * REMOVER APÓS USAR!
 */

import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/services/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const setupSecret = process.env.SETUP_SECRET;
    if (setupSecret) {
      const { searchParams } = new URL(request.url);
      const token = searchParams.get("token");
      if (token !== setupSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const client = createServerClient();

    // Limpar subscriptions duplicadas e manter apenas uma
    const { data: allSubs } = await client
      .from("subscription")
      .select("id, status, trial_started_at")
      .order("trial_started_at", { ascending: true }) as { data: { id: string; status: string; trial_started_at: string }[] | null };

    if (allSubs && allSubs.length > 1) {
      // Deletar todas exceto a primeira
      const idsToDelete = allSubs.slice(1).map(s => s.id);
      await client
        .from("subscription")
        .delete()
        .in("id", idsToDelete);
    }

    // Atualizar para trial se não tiver status correto
    if (allSubs && allSubs.length > 0) {
      await client
        .from("subscription")
        .update({ status: "trial", trial_started_at: new Date().toISOString() } as never)
        .eq("id", allSubs[0].id);
    }

    // Verificar subscription atualizada
    const { data: sub } = await client
      .from("subscription")
      .select("*")
      .single();

    // Verificar admin existente
    const { data: existingAdmin, error: adminError } = await client
      .from("admin_user")
      .select("*")
      .eq("email", "ph78815@gmail.com")
      .single() as { data: { id: string; email: string } | null; error: unknown };

    // Resetar senha do admin existente
    if (existingAdmin) {
      const newHash = await hashPassword("paulo0800");
      await client
        .from("admin_user")
        .update({ password_hash: newHash } as never)
        .eq("email", "ph78815@gmail.com");

      return NextResponse.json({
        success: true,
        message: "Configuracao atualizada!",
        admin: { id: existingAdmin.id, email: existingAdmin.email },
        subscription: sub,
        subscriptionsLimpas: allSubs ? allSubs.length - 1 : 0,
      });
    }

    return NextResponse.json({
      success: false,
      message: "Admin nao encontrado",
      adminError: adminError ? String(adminError) : null,
      subscription: sub,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
