"use client";

/**
 * Admin Dashboard Page
 * 
 * Requirements:
 * - 4.3: Exibir dashboard com status da assinatura integrado via API do Mercado Pago
 * - 4.6: Exibir informações financeiras da assinatura
 * - 8.4: Exibir banner informando dias restantes do trial
 * - 8.5: Exibir alerta mais proeminente quando restam 2 dias ou menos
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SubscriptionStatus, BookingStatus } from "@/types/database";

interface SubscriptionInfo {
  status: SubscriptionStatus;
  expiresAt: string | null;
  trialStartedAt: string | null;
  trialDaysRemaining: number | null;
  mercadoPagoId: string | null;
}

interface BookingWithService {
  id: string;
  service_id: string;
  client_name: string;
  client_whatsapp: string;
  date_time: string;
  status: BookingStatus;
  created_at: string;
  services: {
    id: string;
    name: string;
    price: number;
    duration: number;
  } | null;
}

interface DashboardStats {
  todayBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
}

export default function AdminDashboardPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [todayBookings, setTodayBookings] = useState<BookingWithService[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError("");

      // Fetch subscription status and bookings in parallel
      const [subscriptionRes, bookingsRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/bookings"),
      ]);

      // Handle subscription
      if (subscriptionRes.ok) {
        const subData = await subscriptionRes.json();
        setSubscription(subData.subscription);
      }

      // Handle bookings
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        const allBookings: BookingWithService[] = bookingsData.bookings || [];
        
        // Filter today's bookings
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayOnly = allBookings.filter((b) => {
          const bookingDate = new Date(b.date_time);
          return bookingDate >= today && bookingDate < tomorrow;
        });

        setTodayBookings(todayOnly);

        // Calculate stats
        setStats({
          todayBookings: todayOnly.length,
          pendingBookings: todayOnly.filter((b) => b.status === "pending").length,
          confirmedBookings: todayOnly.filter((b) => b.status === "confirmed").length,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  function getStatusLabel(status: SubscriptionStatus): string {
    const labels: Record<SubscriptionStatus, string> = {
      active: "Ativo",
      inactive: "Inativo",
      expired: "Expirado",
      trial: "Período de Teste",
    };
    return labels[status];
  }

  function getStatusColor(status: SubscriptionStatus): string {
    const colors: Record<SubscriptionStatus, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800",
      expired: "bg-red-100 text-red-800",
      trial: "bg-yellow-100 text-yellow-800",
    };
    return colors[status];
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateStr));
  }

  function formatTime(dateTimeStr: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateTimeStr));
  }

  function getBookingStatusBadge(status: BookingStatus) {
    const styles: Record<BookingStatus, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pendente" },
      confirmed: { bg: "bg-green-100", text: "text-green-800", label: "Confirmado" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Cancelado" },
    };
    const style = styles[status];
    return (
      <span className={`${style.bg} ${style.text} text-xs font-medium px-2 py-0.5 rounded`}>
        {style.label}
      </span>
    );
  }

  // Trial banner component - responsivo
  function TrialBanner() {
    if (!subscription || subscription.status !== "trial" || subscription.trialDaysRemaining === null) {
      return null;
    }

    const daysRemaining = subscription.trialDaysRemaining;
    const isUrgent = daysRemaining <= 2;

    return (
      <div
        className={`rounded-xl p-4 mb-6 ${
          isUrgent
            ? "bg-red-50 border-2 border-red-300"
            : "bg-yellow-50 border border-yellow-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isUrgent ? "bg-red-100" : "bg-yellow-100"
              }`}
            >
              <span className="text-xl">{isUrgent ? "⚠️" : "⏰"}</span>
            </div>
            <div className="min-w-0">
              <h3
                className={`font-semibold text-sm sm:text-base ${
                  isUrgent ? "text-red-800" : "text-yellow-800"
                }`}
              >
                {isUrgent
                  ? `Atenção! Teste termina em ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""}!`
                  : `Período de teste - ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""} restante${daysRemaining !== 1 ? "s" : ""}`}
              </h3>
              <p
                className={`text-xs sm:text-sm ${
                  isUrgent ? "text-red-600" : "text-yellow-600"
                }`}
              >
                {isUrgent
                  ? "Assine agora para não perder acesso!"
                  : "Aproveite todas as funcionalidades."}
              </p>
            </div>
          </div>
          <a
            href="https://www.mercadopago.com.br/subscriptions"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full sm:w-auto text-center px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
              isUrgent
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-yellow-600 hover:bg-yellow-700 text-white"
            }`}
          >
            Assinar Agora
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-soft p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="relative inline-block">
              <div className="w-12 h-12 border-4 border-pastel-rose rounded-full" />
              <div className="w-12 h-12 border-4 border-rose-gold border-t-transparent rounded-full animate-spin absolute inset-0" />
            </div>
            <p className="text-gray-500 mt-4">Carregando dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-soft p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header - responsivo */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl text-rose-gold-dark truncate">
                Painel Administrativo
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Bem-vinda de volta! ✨
              </p>
            </div>
            <Link
              href="/admin/configuracoes"
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-gray-600 hover:text-rose-gold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline ml-2">Configurações</span>
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Trial Banner */}
        <TrialBanner />

        {/* Subscription Status Card */}
        <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-rose-gold-dark">
              Status da Assinatura
            </h2>
            {subscription && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  subscription.status
                )}`}
              >
                {getStatusLabel(subscription.status)}
              </span>
            )}
          </div>

          {subscription ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-pastel-cream rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <p className="font-semibold text-gray-900">
                  {getStatusLabel(subscription.status)}
                </p>
              </div>
              <div className="bg-pastel-cream rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">
                  {subscription.status === "trial" ? "Início do Trial" : "Data de Vencimento"}
                </p>
                <p className="font-semibold text-gray-900">
                  {subscription.status === "trial"
                    ? formatDate(subscription.trialStartedAt)
                    : formatDate(subscription.expiresAt)}
                </p>
              </div>
              <div className="bg-pastel-cream rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">
                  {subscription.status === "trial" ? "Dias Restantes" : "ID Mercado Pago"}
                </p>
                <p className="font-semibold text-gray-900">
                  {subscription.status === "trial"
                    ? `${subscription.trialDaysRemaining ?? 0} dias`
                    : subscription.mercadoPagoId || "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Informações de assinatura não disponíveis.</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pastel-pink rounded-full flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Agendamentos Hoje</p>
                <p className="text-2xl font-bold text-rose-gold-dark">
                  {stats.todayBookings}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pendingBookings}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Confirmados</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.confirmedBookings}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            href="/admin/services"
            className="bg-white rounded-xl shadow-soft p-6 hover:shadow-glow transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pastel-lavender rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">💅</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Serviços</h3>
                <p className="text-sm text-gray-500">Gerenciar serviços</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/timeslots"
            className="bg-white rounded-xl shadow-soft p-6 hover:shadow-glow transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pastel-rose rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">🕐</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Horários</h3>
                <p className="text-sm text-gray-500">Definir disponibilidade</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/bookings"
            className="bg-white rounded-xl shadow-soft p-6 hover:shadow-glow transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pastel-blush rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Agendamentos</h3>
                <p className="text-sm text-gray-500">Ver todos os agendamentos</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Today's Bookings */}
        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-rose-gold-dark">
                Agendamentos de Hoje
              </h2>
              <p className="text-sm text-gray-500">
                {new Intl.DateTimeFormat("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(new Date())}
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="text-rose-gold hover:text-rose-gold-dark text-sm font-medium"
            >
              Ver todos →
            </Link>
          </div>

          {todayBookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <span className="text-4xl mb-2 block">📭</span>
              Nenhum agendamento para hoje.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 flex items-center justify-between hover:bg-pastel-cream transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-center">
                      <span className="text-lg font-bold text-rose-gold">
                        {formatTime(booking.date_time)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {booking.client_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.services?.name || "Serviço não encontrado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getBookingStatusBadge(booking.status)}
                    <a
                      href={`https://wa.me/55${booking.client_whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
