"use client";

/**
 * Bookings Management Page
 * 
 * Requirements:
 * - 6.1: Exibir lista de agendamentos no painel administrativo
 * - 6.4: Ordenar agendamentos por data/hora
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BookingStatus } from "@/types/database";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchBookings();
  }, [filterStatus, filterDate]);

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

  function formatDateTime(dateTimeStr: string): string {
    const date = new Date(dateTimeStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatDate(dateTimeStr: string): string {
    const date = new Date(dateTimeStr);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function formatTime(dateTimeStr: string): string {
    const date = new Date(dateTimeStr);
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
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

  function getWhatsAppLink(whatsapp: string, clientName: string, serviceName: string, dateTime: string): string {
    const formattedDate = formatDateTime(dateTime);
    const message = encodeURIComponent(
      `Olá ${clientName}! Seu agendamento de ${serviceName} para ${formattedDate} foi confirmado. Aguardamos você!`
    );
    const numbers = whatsapp.replace(/\D/g, "");
    return `https://wa.me/55${numbers}?text=${message}`;
  }

  function clearFilters() {
    setFilterStatus("all");
    setFilterDate("");
  }

  return (
    <main className="min-h-screen bg-neutral-soft p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/admin" 
              className="text-rose-gold hover:text-rose-gold-dark text-sm mb-2 inline-block"
            >
              ← Voltar ao Dashboard
            </Link>
            <h1 className="font-display text-3xl text-rose-gold-dark">
              Agendamentos
            </h1>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-soft mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="confirmed">Confirmado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                id="filterDate"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
              />
            </div>
            {(filterStatus !== "all" || filterDate) && (
              <button
                onClick={clearFilters}
                className="text-rose-gold hover:text-rose-gold-dark px-4 py-2 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Bookings List */}
        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-xl text-rose-gold-dark">
              Lista de Agendamentos
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {bookings.length} agendamento{bookings.length !== 1 ? "s" : ""} encontrado{bookings.length !== 1 ? "s" : ""}
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Carregando agendamentos...
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum agendamento encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-pastel-cream">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serviço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WhatsApp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-pastel-cream transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(booking.date_time)}
                        </div>
                        <div className="text-sm text-rose-gold font-semibold">
                          {formatTime(booking.date_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {booking.services?.name || "Serviço não encontrado"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.client_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatWhatsApp(booking.client_whatsapp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={getWhatsAppLink(
                            booking.client_whatsapp,
                            booking.client_name,
                            booking.services?.name || "serviço",
                            booking.date_time
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors"
                        >
                          WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
