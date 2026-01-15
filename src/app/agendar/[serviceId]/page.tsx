"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Service } from "@/types/database";

interface AvailableSlot {
  time: string;
  dateTime: string;
  endTime: string;
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
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: Date | null; isToday: boolean; isPast: boolean; dayNum: number }[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push({ date: null, isToday: false, isPast: true, dayNum: 0 });
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      days.push({ date, isToday, isPast, dayNum: day });
    }

    return days;
  };

  const calendarDays = generateCalendar();
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const goToPrevMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    if (newMonth >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) {
      setCurrentMonth(newMonth);
    }
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    const maxMonth = new Date();
    maxMonth.setMonth(maxMonth.getMonth() + 3);
    if (newMonth <= maxMonth) {
      setCurrentMonth(newMonth);
    }
  };

  useEffect(() => {
    async function fetchService() {
      try {
        const response = await fetch(`/api/services/${serviceId}`);
        if (!response.ok) {
          setError("Serviço não encontrado");
          return;
        }
        const data = await response.json();
        setService(data.service);
      } catch (err) {
        setError("Erro ao carregar o serviço");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchService();
  }, [serviceId]);

  useEffect(() => {
    if (!selectedDate || !serviceId) return;
    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const response = await fetch(
          `/api/bookings/available-slots?serviceId=${serviceId}&date=${selectedDate}`
        );
        if (!response.ok) throw new Error("Erro");
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      } catch (err) {
        console.error(err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, serviceId]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
  const formatDuration = (minutes: number) =>
    minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 > 0 ? ` ${minutes % 60}min` : ""}`;

  const handleDateSelect = (date: Date | null) => {
    if (!date) return;
    setSelectedDate(date.toISOString().split("T")[0]);
  };

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
          <div className="w-14 h-14 border-4 border-pastel-rose rounded-full" />
          <div className="w-14 h-14 border-4 border-rose-gold border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
      </main>
    );
  }

  if (error || !service) {
    return (
      <main className="min-h-screen bg-gradient-luxury flex items-center justify-center p-4">
        <div className="card-glass p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pastel-rose flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-rose-gold-dark mb-4">{error || "Serviço não encontrado"}</p>
          <Link href="/agendar" className="text-rose-gold hover:text-rose-gold-dark">
            Voltar
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-luxury relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 sm:w-80 h-48 sm:h-80 bg-pastel-rose/30 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-48 sm:w-80 h-48 sm:h-80 bg-pastel-peach/30 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 px-4 sm:px-6">
        <header className="pt-6 sm:pt-12 pb-4 sm:pb-6 text-center">
          <Link href="/agendar" className="inline-flex items-center gap-2 text-rose-gold hover:text-rose-gold-dark transition-colors mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Voltar</span>
          </Link>

          <h1 className="font-display text-2xl sm:text-3xl text-rose-gold-dark mb-3">
            Escolha seu horário
          </h1>

          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-4 py-2.5 bg-white/60 backdrop-blur-sm rounded-2xl border border-rose-gold-light/30">
            <span className="font-display text-rose-gold text-sm sm:text-base">{service.name}</span>
            <span className="hidden sm:block w-px h-4 bg-rose-gold-light" />
            <span className="text-rose-gold-dark font-semibold text-sm sm:text-base">{formatPrice(service.price)}</span>
            <span className="hidden sm:block w-px h-4 bg-rose-gold-light" />
            <span className="text-stone-500 text-xs sm:text-sm">{formatDuration(service.duration)}</span>
          </div>
        </header>

        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-rose-gold-light/30">
            <span className="w-6 h-6 rounded-full bg-rose-gold text-white flex items-center justify-center text-xs">1</span>
            <div className="w-6 h-px bg-rose-gold" />
            <span className="w-6 h-6 rounded-full bg-rose-gold text-white flex items-center justify-center text-xs font-bold">2</span>
            <div className="w-6 h-px bg-gray-300" />
            <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs">3</span>
          </div>
        </div>

        <div className="max-w-lg mx-auto pb-8">
          <div className="card-glass p-4 sm:p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPrevMonth}
                className="p-2 hover:bg-pastel-rose/30 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-display text-lg text-rose-gold-dark capitalize">
                {currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-pastel-rose/30 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-stone-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (!day.date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dateStr = day.date.toISOString().split("T")[0];
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    onClick={() => !day.isPast && handleDateSelect(day.date)}
                    disabled={day.isPast}
                    className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
                      day.isPast
                        ? "text-gray-300 cursor-not-allowed"
                        : isSelected
                        ? "bg-rose-gold text-white shadow-glow scale-105"
                        : day.isToday
                        ? "bg-pastel-rose text-rose-gold-dark ring-2 ring-rose-gold"
                        : "hover:bg-pastel-rose/50 text-stone-600"
                    }`}
                  >
                    {day.dayNum}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="card-glass p-4 sm:p-5 mb-5">
              <h3 className="font-medium text-rose-gold-dark mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Horários disponíveis
              </h3>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="relative">
                    <div className="w-8 h-8 border-3 border-pastel-rose rounded-full" />
                    <div className="w-8 h-8 border-3 border-rose-gold border-t-transparent rounded-full animate-spin absolute inset-0" />
                  </div>
                  <span className="ml-3 text-rose-gold text-sm">Carregando...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-pastel-cream flex items-center justify-center">
                    <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-stone-500 text-sm">Sem horários disponíveis</p>
                  <p className="text-stone-400 text-xs mt-1">Tente outra data</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.dateTime}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-3.5 px-2 rounded-xl text-center text-sm font-medium transition-all ${
                        selectedSlot?.dateTime === slot.dateTime
                          ? "bg-rose-gold text-white shadow-glow scale-105"
                          : "bg-pastel-cream/70 text-stone-600 hover:bg-pastel-rose/50 active:scale-95"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card-glass p-4 sm:p-5">
            {selectedSlot ? (
              <div className="mb-4 p-4 bg-pastel-cream/50 rounded-xl">
                <p className="text-sm text-stone-500 mb-1">Você selecionou:</p>
              <p className="font-display text-rose-gold-dark">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}{" "}
                • <span className="text-rose-gold font-bold">{selectedSlot.time}</span>
              </p>
              </div>
            ) : (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl text-center">
                <p className="text-sm text-stone-400">
                  {selectedDate ? "Selecione um horário acima" : "Selecione uma data no calendário"}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href="/agendar"
                className="flex-1 py-3.5 px-4 rounded-xl text-center border-2 border-rose-gold-light text-rose-gold hover:bg-pastel-rose/30 transition-all font-medium text-sm"
              >
                Voltar
              </Link>
              <button
                onClick={handleContinue}
                disabled={!selectedSlot}
                className={`flex-1 py-3.5 px-4 rounded-xl text-center font-semibold text-sm transition-all ${
                  selectedSlot
                    ? "bg-rose-gold text-white shadow-glow hover:bg-rose-gold-dark active:scale-[0.98]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
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
