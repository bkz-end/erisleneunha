"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Service } from "@/types/database";

interface AvailableSlot {
  time: string;
  dateTime: string;
}

export default function SelecionarHorarioPage({
  params,
}: {
  params: { serviceId: string };
}) {
  const { serviceId } = params;
  const router = useRouter();

  const [service, setService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAvailableDates = () => {
    const dates: { value: string; dayName: string; dayNum: string; month: string; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split("T")[0],
        dayName: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        dayNum: date.getDate().toString().padStart(2, "0"),
        month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        isToday: i === 0,
      });
    }
    return dates;
  };

  const availableDates = getAvailableDates();

  useEffect(() => {
    async function fetchService() {
      try {
        const response = await fetch(`/api/services/${serviceId}`);
        if (!response.ok) { setError("Servico nao encontrado"); return; }
        const data = await response.json();
        setService(data.service);
      } catch (err) { setError("Erro ao carregar"); console.error(err); }
      finally { setLoading(false); }
    }
    fetchService();
  }, [serviceId]);

  useEffect(() => {
    if (!selectedDate || !serviceId) return;
    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const response = await fetch(`/api/bookings/available-slots?serviceId=${serviceId}&date=${selectedDate}`);
        if (!response.ok) throw new Error("Erro");
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      } catch (err) { console.error(err); setAvailableSlots([]); }
      finally { setLoadingSlots(false); }
    }
    fetchSlots();
  }, [selectedDate, serviceId]);

  const formatPrice = (price: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
  const formatDuration = (minutes: number) => minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 > 0 ? ` ${minutes % 60}min` : ""}`;

  const handleContinue = () => {
    if (selectedSlot) {
      sessionStorage.setItem("booking_serviceId", serviceId);
      sessionStorage.setItem("booking_dateTime", selectedSlot.dateTime);
      sessionStorage.setItem("booking_time", selectedSlot.time);
      sessionStorage.setItem("booking_date", selectedDate);
      router.push(`/agendar/${serviceId}/dados`);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-luxury flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-pastel-rose rounded-full" />
          <div className="w-16 h-16 border-4 border-rose-gold border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
      </main>
    );
  }

  if (error || !service) {
    return (
      <main className="min-h-screen bg-gradient-luxury flex items-center justify-center p-4">
        <div className="card-glass p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-pastel-rose flex items-center justify-center">
            <svg className="w-10 h-10 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-rose-gold-dark mb-6">{error || "Servico nao encontrado"}</p>
          <Link href="/agendar" className="text-rose-gold hover:text-rose-gold-dark transition-colors inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-luxury relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-pastel-rose/30 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-pastel-peach/30 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10">
        {/* Header */}
        <header className="pt-12 pb-6 px-4 text-center">
          <Link href="/agendar" className="inline-flex items-center gap-2 text-rose-gold hover:text-rose-gold-dark transition-colors mb-6">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Voltar aos servicos</span>
          </Link>
          
          <h1 className="font-display text-3xl md:text-4xl text-rose-gold-dark mb-3">
            Escolha seu Horario
          </h1>
          
          <div className="inline-flex items-center gap-4 px-5 py-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-rose-gold-light/30">
            <span className="font-display text-rose-gold">{service.name}</span>
            <span className="w-px h-4 bg-rose-gold-light" />
            <span className="text-rose-gold-dark font-semibold">{formatPrice(service.price)}</span>
            <span className="w-px h-4 bg-rose-gold-light" />
            <span className="text-stone-500 text-sm">{formatDuration(service.duration)}</span>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8 px-4">
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full border border-rose-gold-light/30">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-rose-gold text-white flex items-center justify-center text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-rose-gold text-sm">Servico</span>
            </div>
            <div className="w-8 h-px bg-rose-gold" />
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-rose-gold text-white flex items-center justify-center text-sm font-semibold shadow-glow">2</span>
              <span className="text-rose-gold-dark font-medium text-sm">Horario</span>
            </div>
            <div className="w-8 h-px bg-neutral-elegant" />
            <div className="flex items-center gap-2 opacity-50">
              <span className="w-8 h-8 rounded-full bg-neutral-elegant text-stone-400 flex items-center justify-center text-sm">3</span>
              <span className="text-stone-400 text-sm">Dados</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-12">
          {/* Date Selection */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-rose-gold-dark mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Selecione a data
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {availableDates.map((date) => (
                <button
                  key={date.value}
                  onClick={() => setSelectedDate(date.value)}
                  className={`flex-shrink-0 w-20 py-4 rounded-2xl text-center transition-all duration-300 ${
                    selectedDate === date.value
                      ? "bg-rose-gold text-white shadow-glow scale-105"
                      : "bg-white/80 backdrop-blur-sm text-stone-600 hover:bg-white border border-pastel-rose/50 hover:border-rose-gold-light"
                  }`}
                >
                  {date.isToday && (
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${selectedDate === date.value ? "text-rose-gold-light" : "text-rose-gold"}`}>
                      Hoje
                    </span>
                  )}
                  <div className={`text-xs uppercase font-medium ${date.isToday ? "" : "mt-1"} ${selectedDate === date.value ? "text-white/80" : "text-stone-400"}`}>
                    {date.dayName}
                  </div>
                  <div className="text-2xl font-display mt-1">{date.dayNum}</div>
                  <div className={`text-xs ${selectedDate === date.value ? "text-white/70" : "text-stone-400"}`}>{date.month}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-rose-gold-dark mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Horarios disponiveis
              </h2>
              
              {loadingSlots ? (
                <div className="card-glass p-12 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-10 h-10 border-3 border-pastel-rose rounded-full" />
                    <div className="w-10 h-10 border-3 border-rose-gold border-t-transparent rounded-full animate-spin absolute inset-0" />
                  </div>
                  <span className="ml-4 text-rose-gold">Carregando horarios...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="card-glass p-10 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pastel-cream flex items-center justify-center">
                    <svg className="w-8 h-8 text-luxury-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-stone-600 font-medium">Nenhum horario disponivel</p>
                  <p className="text-stone-400 text-sm mt-1">Tente selecionar outra data</p>
                </div>
              ) : (
                <div className="card-glass p-5">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.dateTime}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3.5 px-3 rounded-xl text-center transition-all duration-300 ${
                          selectedSlot?.dateTime === slot.dateTime
                            ? "bg-rose-gold text-white shadow-glow scale-105 font-semibold"
                            : "bg-pastel-cream/50 text-stone-600 hover:bg-pastel-rose/50 hover:text-rose-gold-dark"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Card */}
          <div className="card-glass p-6">
            <h3 className="font-display text-xl text-rose-gold-dark mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-luxury-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Resumo do Agendamento
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-pastel-rose/30">
                <span className="text-stone-500">Servico</span>
                <span className="text-stone-700 font-medium">{service.name}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-pastel-rose/30">
                <span className="text-stone-500">Valor</span>
                <span className="text-rose-gold font-display text-xl">{formatPrice(service.price)}</span>
              </div>
              {selectedDate && (
                <div className="flex justify-between items-center py-3 border-b border-pastel-rose/30">
                  <span className="text-stone-500">Data</span>
                  <span className="text-stone-700 font-medium">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  </span>
                </div>
              )}
              {selectedSlot && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-stone-500">Horario</span>
                  <span className="text-rose-gold font-semibold text-lg">{selectedSlot.time}</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <Link
                href="/agendar"
                className="flex-1 py-4 px-6 rounded-2xl text-center border-2 border-rose-gold-light text-rose-gold hover:bg-pastel-rose/30 transition-all duration-300 font-medium"
              >
                Voltar
              </Link>
              <button
                onClick={handleContinue}
                disabled={!selectedSlot}
                className={`flex-1 py-4 px-6 rounded-2xl text-center font-semibold transition-all duration-300 ${
                  selectedSlot
                    ? "btn-luxury"
                    : "bg-neutral-elegant text-stone-400 cursor-not-allowed"
                }`}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
