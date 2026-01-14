"use client";

/**
 * Time Slots Management Page
 * 
 * Requirements:
 * - 4.5: Gestão de horários disponíveis para agendamento
 */

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import type { TimeSlot } from "@/types/database";

interface TimeSlotFormData {
  day_of_week: string;
  start_time: string;
  end_time: string;
  available: boolean;
}

const initialFormData: TimeSlotFormData = {
  day_of_week: "1",
  start_time: "09:00",
  end_time: "10:00",
  available: true,
};

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

export default function TimeSlotsPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form state
  const [formData, setFormData] = useState<TimeSlotFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Fetch time slots on mount
  useEffect(() => {
    fetchTimeSlots();
  }, []);

  async function fetchTimeSlots() {
    try {
      setLoading(true);
      const response = await fetch("/api/timeslots");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar horários");
      }
      
      setTimeSlots(data.timeSlots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar horários");
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }


  function handleInputChange(field: keyof TimeSlotFormData, value: string | boolean) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function handleEdit(timeSlot: TimeSlot) {
    setFormData({
      day_of_week: timeSlot.day_of_week.toString(),
      start_time: timeSlot.start_time.substring(0, 5),
      end_time: timeSlot.end_time.substring(0, 5),
      available: timeSlot.available,
    });
    setEditingId(timeSlot.id);
    setShowForm(true);
    clearMessages();
  }

  function handleCancelEdit() {
    setFormData(initialFormData);
    setEditingId(null);
    setShowForm(false);
    clearMessages();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    setSubmitting(true);

    try {
      const payload = {
        day_of_week: parseInt(formData.day_of_week, 10),
        start_time: formData.start_time,
        end_time: formData.end_time,
        available: formData.available,
      };

      // Validate
      if (isNaN(payload.day_of_week) || payload.day_of_week < 0 || payload.day_of_week > 6) {
        throw new Error("Dia da semana inválido");
      }
      if (!payload.start_time || !payload.end_time) {
        throw new Error("Horários são obrigatórios");
      }
      if (payload.start_time >= payload.end_time) {
        throw new Error("Horário de término deve ser após o horário de início");
      }

      const url = editingId ? `/api/timeslots/${editingId}` : "/api/timeslots";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar horário");
      }

      setSuccess(editingId ? "Horário atualizado com sucesso!" : "Horário criado com sucesso!");
      setFormData(initialFormData);
      setEditingId(null);
      setShowForm(false);
      await fetchTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar horário");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este horário?")) {
      return;
    }

    clearMessages();

    try {
      const response = await fetch(`/api/timeslots/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir horário");
      }

      setSuccess("Horário excluído com sucesso!");
      await fetchTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir horário");
    }
  }

  async function handleToggleAvailable(timeSlot: TimeSlot) {
    clearMessages();

    try {
      const response = await fetch(`/api/timeslots/${timeSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !timeSlot.available }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar horário");
      }

      await fetchTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar horário");
    }
  }

  function getDayName(dayOfWeek: number): string {
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || "";
  }

  function formatTime(time: string): string {
    return time.substring(0, 5);
  }

  // Group time slots by day of week
  function getGroupedTimeSlots(): Map<number, TimeSlot[]> {
    const grouped = new Map<number, TimeSlot[]>();
    for (const slot of timeSlots) {
      const existing = grouped.get(slot.day_of_week) || [];
      existing.push(slot);
      grouped.set(slot.day_of_week, existing);
    }
    return grouped;
  }


  const groupedTimeSlots = getGroupedTimeSlots();

  return (
    <main className="min-h-screen bg-neutral-soft p-8">
      <div className="max-w-4xl mx-auto">
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
              Gestão de Horários
            </h1>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); clearMessages(); }}
              className="bg-rose-gold hover:bg-rose-gold-dark text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              + Novo Horário
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-soft mb-8">
            <h2 className="font-display text-xl text-rose-gold-dark mb-4">
              {editingId ? "Editar Horário" : "Novo Horário"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700 mb-1">
                  Dia da Semana
                </label>
                <select
                  id="day_of_week"
                  value={formData.day_of_week}
                  onChange={(e) => handleInputChange("day_of_week", e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
                  disabled={submitting}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    id="start_time"
                    value={formData.start_time}
                    onChange={(e) => handleInputChange("start_time", e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Horário de Término
                  </label>
                  <input
                    type="time"
                    id="end_time"
                    value={formData.end_time}
                    onChange={(e) => handleInputChange("end_time", e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available}
                  onChange={(e) => handleInputChange("available", e.target.checked)}
                  className="w-4 h-4 text-rose-gold border-gray-300 rounded focus:ring-rose-gold"
                  disabled={submitting}
                />
                <label htmlFor="available" className="text-sm font-medium text-gray-700">
                  Disponível para agendamento
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-rose-gold hover:bg-rose-gold-dark text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}


        {/* Time Slots Grid */}
        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-xl text-rose-gold-dark">
              Grade de Horários
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Carregando horários...
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum horário cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {DAYS_OF_WEEK.map((day) => {
                const slots = groupedTimeSlots.get(day.value) || [];
                if (slots.length === 0) return null;
                
                return (
                  <div key={day.value} className="p-4">
                    <h3 className="font-medium text-gray-900 mb-3">{day.label}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            slot.available 
                              ? "bg-pastel-cream border-rose-gold/20" 
                              : "bg-gray-100 border-gray-200 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              slot.available ? "text-gray-900" : "text-gray-500"
                            }`}>
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                            {!slot.available && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                Indisponível
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleToggleAvailable(slot)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                slot.available
                                  ? "text-amber-600 hover:text-amber-700"
                                  : "text-green-600 hover:text-green-700"
                              }`}
                              title={slot.available ? "Desativar" : "Ativar"}
                            >
                              {slot.available ? "Desativar" : "Ativar"}
                            </button>
                            <button
                              onClick={() => handleEdit(slot)}
                              className="text-rose-gold hover:text-rose-gold-dark text-xs px-2 py-1 rounded transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(slot.id)}
                              className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
