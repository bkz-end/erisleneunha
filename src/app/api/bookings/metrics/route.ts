import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import type { Database } from "@/types/database";

type BookingWithService = Database["public"]["Tables"]["bookings"]["Row"] & {
  services: { name: string; price: number } | null;
};

/**
 * GET /api/bookings/metrics
 * Retorna métricas de agendamentos e faturamento
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Buscar todos os agendamentos do mês com serviços
    const { data: monthBookings, error: monthError } = await supabase
      .from("bookings")
      .select(`*, services(name, price)`)
      .gte("date_time", startOfMonth.toISOString())
      .order("date_time", { ascending: true });

    if (monthError) {
      return NextResponse.json({ error: monthError.message }, { status: 500 });
    }

    const bookings = (monthBookings || []) as BookingWithService[];

    // Calcular métricas
    const totalMonth = bookings.length;
    const confirmedMonth = bookings.filter(b => b.status === "confirmed").length;
    const cancelledMonth = bookings.filter(b => b.status === "cancelled").length;
    const pendingMonth = bookings.filter(b => b.status === "pending").length;

    // Faturamento (apenas confirmados)
    const revenueMonth = bookings
      .filter(b => b.status === "confirmed" && b.services)
      .reduce((sum, b) => sum + (b.services?.price || 0), 0);

    // Faturamento potencial (confirmados + pendentes)
    const potentialRevenue = bookings
      .filter(b => ["confirmed", "pending"].includes(b.status) && b.services)
      .reduce((sum, b) => sum + (b.services?.price || 0), 0);

    // Agendamentos da semana
    const weekBookings = bookings.filter(
      b => new Date(b.date_time) >= startOfWeek
    );
    const totalWeek = weekBookings.length;

    // Serviço mais popular
    const serviceCount: Record<string, { name: string; count: number }> = {};
    bookings.forEach(b => {
      if (b.services?.name) {
        if (!serviceCount[b.services.name]) {
          serviceCount[b.services.name] = { name: b.services.name, count: 0 };
        }
        serviceCount[b.services.name].count++;
      }
    });
    const popularService = Object.values(serviceCount).sort((a, b) => b.count - a.count)[0] || null;

    // Taxa de cancelamento
    const cancellationRate = totalMonth > 0 ? (cancelledMonth / totalMonth) * 100 : 0;

    // Agendamentos por dia da semana (para gráfico)
    const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Dom-Sáb
    bookings.forEach(b => {
      const day = new Date(b.date_time).getDay();
      byDayOfWeek[day]++;
    });

    // Agendamentos por dia do mês (últimos 30 dias)
    const last30Days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const count = bookings.filter(
        b => b.date_time.split("T")[0] === dateStr
      ).length;
      last30Days.push({ date: dateStr, count });
    }

    return NextResponse.json({
      metrics: {
        month: {
          total: totalMonth,
          confirmed: confirmedMonth,
          cancelled: cancelledMonth,
          pending: pendingMonth,
          revenue: revenueMonth,
          potentialRevenue,
          cancellationRate: Math.round(cancellationRate * 10) / 10,
        },
        week: {
          total: totalWeek,
        },
        popularService,
        byDayOfWeek,
        last30Days,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
