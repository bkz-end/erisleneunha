"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BookingStatus } from "@/types/database";

interface ReminderBooking {
  id: string;
  client_name: string;
  client_whatsapp: string;
  date_time: string;
  status: BookingStatus;
  services: {
    name: string;
    price: number;
    duration: number;
  } | null;
}

export default function LembretesPage() {
  const [reminders, setReminders] = useState<ReminderBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReminders();
    const saved = localStorage.getItem("sentReminders");
    if (saved) {
      const parsed = JSON.parse(saved);
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      const filtered = Object.entries(parsed)
        .filter(([, timestamp]) => (timestamp as number) > twoDaysAgo)
        .map(([id]) => id);
      setSentReminders(new Set(filtered));
    }
  }, []);

  async function fetchReminders() {
    try {
      const response = await fetch("/api/bookings/reminders");
      const data = await response.json();
      setReminders(data.reminders || []);
    } catch (err) {
      console.error("Erro ao carregar lembretes:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateTimeStr: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(new Date(dateTimeStr));
  }

  function formatTime(dateTimeStr: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateTimeStr));
  }

  function getWhatsAppReminderLink(booking: ReminderBooking): string {
    const date = formatDate(booking.date_time);
    const time = formatTime(booking.date_time);
    const message = encodeURIComponent(
      `Olá ${booking.client_name}!\n\n` +
        `Passando para lembrar do seu agendamento:\n\n` +
        `Data: ${date}\n` +
        `Horário: ${time}\n` +
        `Serviço: ${booking.services?.name || "Serviço"}\n\n` +
        `Aguardamos você!`
    );
    const numbers = booking.client_whatsapp.replace(/\D/g, "");
    return `https://wa.me/55${numbers}?text=${message}`;
  }

  function markAsSent(id: string) {
    const newSent = new Set(sentReminders);
    newSent.add(id);
    setSentReminders(newSent);

    const saved = localStorage.getItem("sentReminders");
    const parsed = saved ? JSON.parse(saved) : {};
    parsed[id] = Date.now();
    localStorage.setItem("sentReminders", JSON.stringify(parsed));
  }

  function handleSendReminder(booking: ReminderBooking) {
    window.open(getWhatsAppReminderLink(booking), "_blank");
    markAsSent(booking.id);
  }

  const pendingReminders = reminders.filter((r) => !sentReminders.has(r.id));
  const sentRemindersList = reminders.filter((r) => sentReminders.has(r.id));

  return (
    <main className="min-h-screen bg-neutral-soft p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-rose-gold hover:text-rose-gold-dark text-sm mb-2 inline-block">
            ← Voltar ao painel
          </Link>
          <h1 className="font-display text-3xl text-rose-gold-dark">Lembretes do dia</h1>
          <p className="text-gray-600 mt-1">Clientes com agendamento nas próximas 24-48h</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-soft p-8 text-center">
            <div className="w-12 h-12 border-4 border-pastel-rose border-t-rose-gold rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Carregando lembretes...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-soft p-8 text-center">
            <span className="text-5xl mb-4 block">✨</span>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Nenhum lembrete pendente!</h2>
            <p className="text-gray-500">Não há agendamentos nas próximas 24-48h.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingReminders.length > 0 && (
              <div className="bg-white rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏳</span>
                    <div>
                      <h2 className="font-semibold text-yellow-800">Pendentes ({pendingReminders.length})</h2>
                      <p className="text-sm text-yellow-600">Clique para enviar lembrete via WhatsApp</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {pendingReminders.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-pastel-cream transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-pastel-rose rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">💅</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{booking.client_name}</h3>
                          <p className="text-sm text-gray-500">{booking.services?.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm">
                            <span className="text-rose-gold font-medium">{formatDate(booking.date_time)}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-rose-gold-dark font-semibold">{formatTime(booking.date_time)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendReminder(booking)}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                      >
                        Enviar lembrete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sentRemindersList.length > 0 && (
              <div className="bg-white rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-green-50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h2 className="font-semibold text-green-800">Enviados ({sentRemindersList.length})</h2>
                      <p className="text-sm text-green-600">Lembretes já enviados hoje</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {sentRemindersList.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-60"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">💬</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{booking.client_name}</h3>
                          <p className="text-sm text-gray-500">{booking.services?.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm">
                            <span className="text-gray-500">
                              {formatDate(booking.date_time)} às {formatTime(booking.date_time)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-green-600 text-sm font-medium px-4 py-2 bg-green-50 rounded-lg">
                        Lembrete enviado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
