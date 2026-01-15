/**
 * Bulk Time Slots API
 * DELETE - Remove all time slots
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const { error } = await supabase
      .from("time_slots")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (error) {
      console.error("Error deleting time slots:", error);
      return NextResponse.json(
        { error: "Erro ao deletar horários" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
