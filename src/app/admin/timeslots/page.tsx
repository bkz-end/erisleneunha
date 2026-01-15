"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WorkSchedule {
  day_of_week: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
}

interface DayOff {
  id?: string;
  date: string;
  reason?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

const DEFAULT_SCHEDULE: WorkSchedule[] = DAYS_OF_WEEK.map((day) => ({
  day_of_week: day.value,
  enabled: day.value >= 1 && day.value <= 5,
  start_time: "09:00",
  end_time: "18:00",
  break_start: "12:00",
  break_end: "13:00",
}));

export default function TimeSlotsPage() {
  const [schedule, setSchedule] = useState<WorkSchedule[]>(DEFAULT_SCHEDULE);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [newDayOff, setNewDayOff] = useState<string>("");
  const [newDayOffReason, setNewDayOffReason] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"schedule" | "daysoff">("schedule");

  useEffect(() => {
    fetchSchedule();
  }, []);

  async function fetchSchedule() {
    try {
      setLoading(true);
      const response = await fetch("/api/timeslots");
      const data = await response.json();

      if (data.timeSlots && data.timeSlots.length > 0) {
        const existingSchedule = [...DEFAULT_SCHEDULE];

        for (const slot of data.timeSlots) {
          const dayIndex = existingSchedule.findIndex((s) => s.day_of_week === slot.day_of_week);
          if (dayIndex !== -1) {
            existingSchedule[dayIndex] = {
              ...existingSchedule[dayIndex],
              enabled: slot.available,
              start_time: slot.start_time.substring(0, 5),
              end_time: slot.end_time.substring(0, 5),
            };
          }
        }

        setSchedule(existingSchedule);
      }

      const daysOffRes = await fetch("/api/timeslots/days-off");
      if (daysOffRes.ok) {
        const daysOffData = await daysOffRes.json();
        setDaysOff(daysOffData.daysOff || []);
      }
    } catch (err) {
      console.error("Erro ao carregar:", err);
    } finally {
      setLoading(false);
    }
  }

  function updateSchedule(dayOfWeek: number, field: keyof WorkSchedule, value: string | boolean) {
    setSchedule((prev) => prev.map((s) => (s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s)));
  }

  function copyToAllDays(sourceDayOfWeek: number) {
    const source = schedule.find((s) => s.day_of_week === sourceDayOfWeek);
    if (!source) return;

    setSchedule((prev) =>
      prev.map((s) => ({
        ...s,
        start_time: source.start_time,
        end_time: source.end_time,
        break_start: source.break_start,
        break_end: source.break_end,
      }))
    );

    setSuccess("Horários copiados para todos os dias!");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function saveSchedule() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const deleteRes = await fetch("/api/timeslots/bulk", {
        method: "DELETE",
      });

      if (!deleteRes.ok) {
        throw new Error("Erro ao limpar horários antigos");
      }

      const enabledDays = schedule.filter((s) => s.enabled);

      for (const day of enabledDays) {
        const response = await fetch("/api/timeslots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day_of_week: day.day_of_week,
            start_time: day.start_time,
            end_time: day.end_time,
            available: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Erro ao salvar ${DAYS_OF_WEEK[day.day_of_week].label}`);
        }
      }

      setSuccess("Horários salvos com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function addDayOff() {
    if (!newDayOff) return;

    try {
      const response = await fetch("/api/timeslots/days-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDayOff, reason: newDayOffReason }),
      });

      if (!response.ok) throw new Error("Erro ao adicionar folga");

      const data = await response.json();
      setDaysOff((prev) => [...prev, data.dayOff]);
      setNewDayOff("");
      setNewDayOffReason("");
      setSuccess("Folga adicionada!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar folga");
    }
  }

  async function removeDayOff(id: string) {
    try {
      const response = await fetch(`/api/timeslots/days-off/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao remover folga");

      setDaysOff((prev) => prev.filter((d) => d.id !== id));
      setSuccess("Folga removida!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover folga");
    }
  }

  function formatDateDisplay(dateStr: string) {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-soft p-4 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-12 h-12 border-4 border-pastel-rose rounded-full" />
            <div className="w-12 h-12 border-4 border-rose-gold border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-gray-500 mt-4">Carregando...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-soft p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-rose-gold hover:text-rose-gold-dark text-sm mb-2 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl text-rose-gold-dark">Meus horários de trabalho</h1>
          <p className="text-gray-500 text-sm mt-1">Configure seus dias e horários de atendimento.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "schedule" ? "bg-rose-gold text-white shadow-glow" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Horários
          </button>
          <button
            onClick={() => setActiveTab("daysoff")}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "daysoff" ? "bg-rose-gold text-white shadow-glow" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Folgas
          </button>
        </div>

        {activeTab === "schedule" && (
          <>
            <div className="bg-pastel-cream rounded-xl p-4 mb-6 border border-pastel-rose/30">
              <p className="text-sm text-rose-gold-dark flex items-start gap-2">
                <span className="text-lg">💡</span>
                <span>Ative os dias que você trabalha e defina o horário de início e fim.</span>
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-6">
              <div className="divide-y divide-gray-100">
                {schedule.map((day) => (
                  <div
                    key={day.day_of_week}
                    className={`p-4 sm:p-5 transition-colors ${day.enabled ? "bg-white" : "bg-gray-50"}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 sm:w-36">
                        <button
                          onClick={() => updateSchedule(day.day_of_week, "enabled", !day.enabled)}
                          className={`w-12 h-7 rounded-full transition-all relative ${day.enabled ? "bg-rose-gold" : "bg-gray-300"}`}
                        >
                          <span
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                              day.enabled ? "left-6" : "left-1"
                            }`}
                          />
                        </button>
                        <span className={`font-medium ${day.enabled ? "text-gray-900" : "text-gray-400"}`}>
                          {DAYS_OF_WEEK[day.day_of_week].label}
                        </span>
                      </div>

                      {day.enabled && (
                        <div className="flex flex-wrap items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Das</span>
                            <input
                              type="time"
                              value={day.start_time}
                              onChange={(e) => updateSchedule(day.day_of_week, "start_time", e.target.value)}
                              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold outline-none text-center w-28"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Às</span>
                            <input
                              type="time"
                              value={day.end_time}
                              onChange={(e) => updateSchedule(day.day_of_week, "end_time", e.target.value)}
                              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold outline-none text-center w-28"
                            />
                          </div>

                          <button
                            onClick={() => copyToAllDays(day.day_of_week)}
                            className="text-xs text-rose-gold hover:text-rose-gold-dark px-2 py-1 rounded hover:bg-pastel-rose/30 transition-colors"
                          >
                            Copiar p/ todos
                          </button>
                        </div>
                      )}

                      {!day.enabled && <span className="text-sm text-gray-400 italic">Folga</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={saveSchedule}
              disabled={saving}
              className="w-full sm:w-auto bg-rose-gold hover:bg-rose-gold-dark text-white font-medium py-3 px-8 rounded-xl transition-all disabled:opacity-50 shadow-glow hover:shadow-lg active:scale-[0.98]"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Salvando...
                </span>
              ) : (
                "Salvar horários"
              )}
            </button>
          </>
        )}

        {activeTab === "daysoff" && (
          <>
            <div className="bg-white rounded-2xl shadow-soft p-5 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">Adicionar folga</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="date"
                  value={newDayOff}
                  onChange={(e) => setNewDayOff(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold outline-none"
                />
                <input
                  type="text"
                  value={newDayOffReason}
                  onChange={(e) => setNewDayOffReason(e.target.value)}
                  placeholder="Motivo (opcional)"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold outline-none"
                />
                <button
                  onClick={addDayOff}
                  disabled={!newDayOff}
                  className="px-6 py-3 bg-rose-gold text-white rounded-xl font-medium hover:bg-rose-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Folgas programadas</h3>
              </div>

              {daysOff.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <span className="text-4xl mb-2 block">🌿</span>
                  <p>Nenhuma folga programada</p>
                  <p className="text-sm mt-1">Adicione datas em que você não vai trabalhar</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {daysOff
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((dayOff) => (
                      <div key={dayOff.id || dayOff.date} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{formatDateDisplay(dayOff.date)}</p>
                          {dayOff.reason && <p className="text-sm text-gray-500">{dayOff.reason}</p>}
                        </div>
                        <button
                          onClick={() => dayOff.id && removeDayOff(dayOff.id)}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
