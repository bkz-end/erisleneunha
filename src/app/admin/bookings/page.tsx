"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BookingStatus, Service } from "@/types/database";

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

type FilterStatus = "all" | BookingStatus;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterServiceId, setFilterServiceId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings();
    }, 200);
    return () => clearTimeout(timer);
  }, [filterStatus, filterDate, filterServiceId, searchQuery]);

  async function fetchServices() {
    try {
      const response = await fetch("/api/services");
      const data = await response.json();
      if (response.ok) {
        setServices(data.services || []);
      }
    } catch (err) {
      console.error("Erro ao carregar servicos", err);
    }
  }

  async function fetchBookings() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (filterStatus !== "all") {
        params.set("status", filterStatus);
      }
      if (filterDate) {
        params.set("date", filterDate);
      }
      if (filterServiceId !== "all") {
        params.set("serviceId", filterServiceId);
      }
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const url = `/api/bookings${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar agendamentos");
      }

      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateTimeStr: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateTimeStr));
  }

  function formatTimeFromDate(date: Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatTime(dateTimeStr: string): string {
    return formatTimeFromDate(new Date(dateTimeStr));
  }

  function formatTimeRange(dateTimeStr: string, duration?: number): string {
    const start = new Date(dateTimeStr);
    const startLabel = formatTimeFromDate(start);
    if (!duration || duration <= 0) return startLabel;
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const endLabel = formatTimeFromDate(end);
    return `${startLabel} - ${endLabel}`;
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  }

  function formatDuration(minutes?: number): string {
    if (!minutes || minutes <= 0) return "";
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  function getServiceMeta(service: { price: number; duration: number } | null): string {
    const parts: string[] = [];
    if (service && typeof service.price === "number") {
      parts.push(formatPrice(service.price));
    }
    const durationLabel = formatDuration(service?.duration);
    if (durationLabel) {
      parts.push(durationLabel);
    }
    return parts.join(" | ");
  }

  function formatWhatsApp(whatsapp: string): string {
    const numbers = whatsapp.replace(/\D/g, "");
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    if (numbers.length === 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return whatsapp;
  }

  function getStatusLabel(status: BookingStatus): string {
    const labels: Record<BookingStatus, string> = {
      pending: "Pendente",
      confirmed: "Confirmado",
      cancelled: "Cancelado",
    };
    return labels[status];
  }

  function getStatusBadge(status: BookingStatus) {
    const styles: Record<BookingStatus, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pendente" },
      confirmed: { bg: "bg-green-100", text: "text-green-800", label: "Confirmado" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Cancelado" },
    };
    const style = styles[status];
    return (
      <span className={`${style.bg} ${style.text} text-xs font-medium px-2.5 py-0.5 rounded`}>
        {style.label}
      </span>
    );
  }

  function getWhatsAppLink(
    whatsapp: string,
    clientName: string,
    serviceName: string,
    dateTime: string,
    duration?: number
  ): string {
    const timeLabel = formatTimeRange(dateTime, duration);
    const message = encodeURIComponent(
      `Ola ${clientName}! Seu agendamento de ${serviceName} ficou para ${formatDate(dateTime)} as ${timeLabel}. Se precisar ajustar, me avise.`
    );
    const numbers = whatsapp.replace(/\D/g, "");
    return `https://wa.me/55${numbers}?text=${message}`;
  }

  function clearFilters() {
    setFilterStatus("all");
    setFilterDate("");
    setFilterServiceId("all");
    setSearchQuery("");
  }

  async function updateStatus(id: string, status: BookingStatus) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status");
      }

      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      setToast("Status atualizado com sucesso.");
      setTimeout(() => setToast(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setUpdatingId(null);
    }
  }

  function escapeCsv(value: string): string {
    const sanitized = value ?? "";
    if (/[";\n]/.test(sanitized)) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  }

  function exportCsv() {
    if (bookings.length === 0) {
      setToast("Nenhum agendamento para exportar.");
      setTimeout(() => setToast(""), 2500);
      return;
    }

    const headers = ["Data", "Hora", "Servico", "Cliente", "WhatsApp", "Status", "Valor"];

    const rows = bookings.map((booking) => [
      formatDate(booking.date_time),
      formatTimeRange(booking.date_time, booking.services?.duration),
      booking.services?.name || "Servico nao encontrado",
      booking.client_name,
      formatWhatsApp(booking.client_whatsapp),
      getStatusLabel(booking.status),
      booking.services?.price ? formatPrice(booking.services.price) : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "agendamentos.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-neutral-soft p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link href="/admin" className="text-rose-gold hover:text-rose-gold-dark text-sm mb-2 inline-block">
              Voltar ao painel
            </Link>
            <h1 className="font-display text-3xl text-rose-gold-dark">Agendamentos</h1>
            <p className="text-gray-600 mt-1">Confirme, reagende ou cancele com facilidade.</p>
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-rose-gold-light text-rose-gold hover:bg-pastel-rose/40 transition-colors text-sm font-medium shadow-soft"
          >
            Exportar CSV
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-soft mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-full sm:w-auto">
              <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="confirmed">Confirmado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                id="filterDate"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label htmlFor="filterService" className="block text-sm font-medium text-gray-700 mb-1">
                Servico
              </label>
              <select
                id="filterService"
                value={filterServiceId}
                onChange={(e) => setFilterServiceId(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
              >
                <option value="all">Todos</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px] w-full sm:w-auto">
              <label htmlFor="filterClient" className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <input
                id="filterClient"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou WhatsApp"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
              />
            </div>
            {(filterStatus !== "all" || filterDate || filterServiceId !== "all" || searchQuery) && (
              <button
                onClick={clearFilters}
                className="text-rose-gold hover:text-rose-gold-dark px-4 py-2 transition-colors w-full sm:w-auto text-left"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}
        {toast && (
          <div className="bg-rose-50 border border-rose-200 text-rose-gold-dark px-4 py-3 rounded-lg mb-6">
            {toast}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-xl text-rose-gold-dark">Lista de agendamentos</h2>
            <p className="text-sm text-gray-500 mt-1">
              {bookings.length} agendamento{bookings.length !== 1 ? "s" : ""} encontrado{bookings.length !== 1 ? "s" : ""}
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando agendamentos...</div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum agendamento encontrado.</div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-100">
                {bookings.map((booking) => {
                  const serviceMeta = getServiceMeta(booking.services);
                  return (
                    <div key={booking.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-gray-500">{formatDate(booking.date_time)}</p>
                          <p className="text-sm font-semibold text-rose-gold">
                            {formatTimeRange(booking.date_time, booking.services?.duration)}
                          </p>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="rounded-xl bg-pastel-cream/60 px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {booking.services?.name || "Servico nao encontrado"}
                        </p>
                        {serviceMeta && <p className="text-xs text-gray-500 mt-1">{serviceMeta}</p>}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.client_name}</p>
                        <p className="text-xs text-gray-500">{formatWhatsApp(booking.client_whatsapp)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {booking.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateStatus(booking.id, "confirmed")}
                              disabled={updatingId === booking.id}
                              className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => updateStatus(booking.id, "cancelled")}
                              disabled={updatingId === booking.id}
                              className="px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => updateStatus(booking.id, "cancelled")}
                            disabled={updatingId === booking.id}
                            className="px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        )}
                        {booking.status === "cancelled" && (
                          <button
                            onClick={() => updateStatus(booking.id, "pending")}
                            disabled={updatingId === booking.id}
                            className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            Reabrir
                          </button>
                        )}
                        <a
                          href={getWhatsAppLink(
                            booking.client_whatsapp,
                            booking.client_name,
                            booking.services?.name || "servico",
                            booking.date_time,
                            booking.services?.duration
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-pastel-cream">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servico</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-pastel-cream transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatDate(booking.date_time)}</div>
                          <div className="text-sm text-rose-gold font-semibold">
                            {formatTimeRange(booking.date_time, booking.services?.duration)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {booking.services?.name || "Servico nao encontrado"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.client_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatWhatsApp(booking.client_whatsapp)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(booking.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {booking.status === "pending" && (
                              <>
                                <button
                                  onClick={() => updateStatus(booking.id, "confirmed")}
                                  disabled={updatingId === booking.id}
                                  className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => updateStatus(booking.id, "cancelled")}
                                  disabled={updatingId === booking.id}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                            {booking.status === "confirmed" && (
                              <button
                                onClick={() => updateStatus(booking.id, "cancelled")}
                                disabled={updatingId === booking.id}
                                className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            )}
                            {booking.status === "cancelled" && (
                              <button
                                onClick={() => updateStatus(booking.id, "pending")}
                                disabled={updatingId === booking.id}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                Reabrir
                              </button>
                            )}
                            <a
                              href={getWhatsAppLink(
                                booking.client_whatsapp,
                                booking.client_name,
                                booking.services?.name || "servico",
                                booking.date_time,
                                booking.services?.duration
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors ml-2"
                            >
                              WhatsApp
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
