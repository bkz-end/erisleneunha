/**
 * Single Day Off API
 * DELETE - Remove a day off
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const { id } = params;

    const { error } = await supabase
      .from("days_off")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting day off:", error);
      return NextResponse.json(
        { error: "Erro ao deletar folga" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE day off:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
