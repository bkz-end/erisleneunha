"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Service } from "@/types/database";

export default function AgendarPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch("/api/services");
        if (!response.ok) throw new Error("Erro ao carregar serviços");
        const data = await response.json();
        setServices(data.services || []);
      } catch (err) {
        setError("Não foi possível carregar os serviços. Tente novamente.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <main className="min-h-screen bg-gradient-luxury relative overflow-hidden">
      <div className="absolute top-0 left-0 w-48 md:w-96 h-48 md:h-96 bg-pastel-rose/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-48 md:w-96 h-48 md:h-96 bg-pastel-peach/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 px-4 sm:px-6">
        <header className="pt-8 sm:pt-16 pb-5 sm:pb-8 text-center">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative inline-flex items-center max-w-[95vw]">
              <div className="absolute inset-y-2.5 left-10 sm:left-16 right-0 rounded-[28px] bg-gradient-to-r from-[#F5E2D7] via-[#F9F1E9] to-[#EED6C9] shadow-elegant" />
              <div className="absolute inset-y-3 left-14 sm:left-20 right-6 rounded-[26px] bg-white/60 blur-[1px]" />
              <div className="relative z-10 flex items-center gap-3 sm:gap-4 pr-6 sm:pr-8 pl-0 py-2.5 sm:py-3">
                <div className="relative w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden shadow-elegant ring-4 ring-white/70">
                  <img
                    src="/erislenefoto.png"
                    alt="Foto da Erislene Ferreira"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <p className="font-display text-2xl sm:text-3xl md:text-4xl text-stone-700 leading-none">
                    Erislene Ferreira
                  </p>
                  <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.28em] text-rose-gold mt-1">
                    Designer de Unhas
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h1 className="font-display text-[2.15rem] sm:text-4xl md:text-5xl text-rose-gold-dark mb-3 sm:mb-4 leading-tight">
            Sua beleza, no seu tempo
            <span className="block text-gold-gradient">Agende com carinho</span>
          </h1>

          <p className="text-stone-500 text-base sm:text-base max-w-md mx-auto leading-relaxed px-2">
            Escolha o serviço, selecione o horário e confirme em poucos passos. Tudo simples e claro.
          </p>
        </header>

        <div className="flex justify-center mb-6 sm:mb-10">
          <div className="flex items-center gap-2 sm:gap-3 bg-white/60 backdrop-blur-sm px-4 sm:px-6 py-2.5 sm:py-3 rounded-full border border-rose-gold-light/30">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-gold text-white flex items-center justify-center text-xs sm:text-sm font-semibold shadow-glow">
                1
              </span>
              <span className="text-rose-gold-dark font-medium text-xs sm:text-sm">Serviço</span>
            </div>
            <div className="w-6 sm:w-10 h-px bg-neutral-elegant" />
            <div className="flex items-center gap-1.5 sm:gap-2 opacity-50">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-elegant text-stone-400 flex items-center justify-center text-xs sm:text-sm">
                2
              </span>
              <span className="text-stone-400 text-xs sm:text-sm hidden sm:inline">Horário</span>
            </div>
            <div className="w-6 sm:w-10 h-px bg-neutral-elegant" />
            <div className="flex items-center gap-1.5 sm:gap-2 opacity-50">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-elegant text-stone-400 flex items-center justify-center text-xs sm:text-sm">
                3
              </span>
              <span className="text-stone-400 text-xs sm:text-sm hidden sm:inline">Dados</span>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: "Escolha o serviço", text: "Veja preços e duração sem dúvidas." },
              { title: "Selecione o horário", text: "Aparecem apenas horários livres." },
              { title: "Confirme no WhatsApp", text: "Receba confirmação rapidinho." },
            ].map((item) => (
              <div key={item.title} className="card-glass p-4 text-center">
                <p className="font-display text-rose-gold-dark">{item.title}</p>
                <p className="text-xs text-stone-500 mt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto pb-20 sm:pb-24">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-14 h-14 border-4 border-pastel-rose rounded-full" />
                <div className="w-14 h-14 border-4 border-rose-gold border-t-transparent rounded-full animate-spin absolute inset-0" />
              </div>
              <p className="mt-5 text-rose-gold font-medium text-sm">Carregando serviços...</p>
            </div>
          ) : error ? (
            <div className="card-glass p-8 text-center mx-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pastel-rose flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-rose-gold-dark font-medium text-sm">{error}</p>
            </div>
          ) : services.length === 0 ? (
            <div className="card-glass p-8 text-center mx-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pastel-cream flex items-center justify-center">
                <svg className="w-8 h-8 text-luxury-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-stone-600 text-sm">Nenhum serviço disponível no momento.</p>
            </div>
          ) : (
            <div className="space-y-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 sm:space-y-0">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/agendar/${service.id}`}
                  className="group block"
                >
                  <div className="card-luxury p-4 sm:p-6 h-full flex flex-col active:scale-[0.98] transition-transform">
                    <div className="flex items-start gap-3 sm:gap-4 mb-4">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-pastel-rose to-pastel-peach flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-display text-base sm:text-xl text-rose-gold-dark mb-1 group-hover:text-rose-gold transition-colors truncate">
                          {service.name}
                        </h2>
                        <div className="flex items-center gap-1.5 text-stone-500 text-sm">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatDuration(service.duration)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-pastel-rose/50 flex items-center justify-between">
                      <span className="text-lg sm:text-2xl font-display text-rose-gold">
                        {formatPrice(service.price)}
                      </span>
                      <span className="flex items-center gap-2 bg-rose-gold/10 text-rose-gold px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium group-hover:bg-rose-gold group-hover:text-white transition-all">
                        Agendar
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="text-center pb-6">
          <p className="text-stone-400 text-xs sm:text-sm">Unhas novas, vida nova.</p>
        </div>
      </div>

      <Link
        href="/admin/login"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-rose-gold-muted hover:text-rose-gold hover:bg-white hover:shadow-soft transition-all duration-300 border border-pastel-rose/50"
        title="Área administrativa"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Link>
    </main>
  );
}



