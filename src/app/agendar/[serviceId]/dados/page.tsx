"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Service } from "@/types/database";

interface PageProps {
  params: { serviceId: string };
}

/**
 * Página de Dados do Cliente
 * Requirements: 3.4, 3.6
 * - Solicitar apenas Nome e WhatsApp
 * - Validação de formato de WhatsApp
 * - Permitir agendamento em no máximo 3 etapas
 */
export default function DadosClientePage({ params }: PageProps) {
  const { serviceId } = params;
  const router = useRouter();
  
  const [service, setService] = useState<Service | null>(null);
  const [bookingDateTime, setBookingDateTime] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [adminWhatsApp, setAdminWhatsApp] = useState<string>("");
  
  const [clientName, setClientName] = useState("");
  const [clientWhatsApp, setClientWhatsApp] = useState("");
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Recuperar dados da sessão
  useEffect(() => {
    const storedServiceId = sessionStorage.getItem("booking_serviceId");
    const storedDateTime = sessionStorage.getItem("booking_dateTime");
    const storedTime = sessionStorage.getItem("booking_time");
    const storedDate = sessionStorage.getItem("booking_date");

    if (!storedServiceId || storedServiceId !== serviceId || !storedDateTime) {
      router.push("/agendar");
      return;
    }

    setBookingDateTime(storedDateTime);
    setBookingTime(storedTime || "");
    setBookingDate(storedDate || "");
  }, [serviceId, router]);

  // Buscar dados do serviço e WhatsApp do admin
  useEffect(() => {
    async function fetchData() {
      try {
        const [serviceRes, whatsappRes] = await Promise.all([
          fetch(`/api/services/${serviceId}`),
          fetch("/api/settings/whatsapp"),
        ]);
        
        if (!serviceRes.ok) {
          router.push("/agendar");
          return;
        }
        
        const serviceData = await serviceRes.json();
        setService(serviceData.service);
        
        if (whatsappRes.ok) {
          const whatsappData = await whatsappRes.json();
          setAdminWhatsApp(whatsappData.whatsapp || "");
        }
      } catch (err) {
        console.error(err);
        router.push("/agendar");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [serviceId, router]);


  // Formatar WhatsApp enquanto digita
  const formatWhatsApp = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "");
    
    // Limita a 11 dígitos (DDD + 9 dígitos)
    const limited = numbers.slice(0, 11);
    
    // Formata: (XX) XXXXX-XXXX
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setClientWhatsApp(formatted);
    if (errors.whatsapp) {
      setErrors((prev) => ({ ...prev, whatsapp: undefined }));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientName(e.target.value);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: { name?: string; whatsapp?: string } = {};
    
    // Validar nome
    if (!clientName.trim()) {
      newErrors.name = "Por favor, informe seu nome";
    } else if (clientName.trim().length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres";
    }
    
    // Validar WhatsApp
    const whatsappNumbers = clientWhatsApp.replace(/\D/g, "");
    if (!whatsappNumbers) {
      newErrors.whatsapp = "Por favor, informe seu WhatsApp";
    } else if (whatsappNumbers.length < 10 || whatsappNumbers.length > 11) {
      newErrors.whatsapp = "WhatsApp deve ter 10 ou 11 dígitos";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          dateTime: bookingDateTime,
          clientName: clientName.trim(),
          clientWhatsApp: clientWhatsApp.replace(/\D/g, ""),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          alert("Este horário já foi reservado. Por favor, escolha outro horário.");
          router.push(`/agendar/${serviceId}`);
          return;
        }
        throw new Error(data.error || "Erro ao criar agendamento");
      }

      // Limpar dados da sessão
      sessionStorage.removeItem("booking_serviceId");
      sessionStorage.removeItem("booking_dateTime");
      sessionStorage.removeItem("booking_time");
      sessionStorage.removeItem("booking_date");
      
      setSuccess(true);
      
      // Redirecionar para WhatsApp após 2 segundos
      setTimeout(() => {
        const whatsappMessage = encodeURIComponent(
          `Olá! Acabei de agendar:\n\n` +
          `📋 Serviço: ${service?.name}\n` +
          `📅 Data: ${new Date(bookingDateTime).toLocaleDateString("pt-BR")}\n` +
          `⏰ Horário: ${bookingTime}\n` +
          `👤 Nome: ${clientName.trim()}\n\n` +
          `Aguardo confirmação! 💕`
        );
        
        const targetWhatsApp = adminWhatsApp || process.env.NEXT_PUBLIC_KEYLA_WHATSAPP || "5511999999999";
        const whatsappUrl = `https://wa.me/55${targetWhatsApp}?text=${whatsappMessage}`;
        
        window.location.href = whatsappUrl;
      }, 2000);
      
    } catch (err) {
      console.error(err);
      alert("Erro ao criar agendamento. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };


  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-luxury relative overflow-hidden flex items-center justify-center">
        <div className="absolute top-0 left-0 w-96 h-96 bg-pastel-rose/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pastel-peach/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="relative flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-pastel-rose rounded-full" />
            <div className="w-16 h-16 border-4 border-rose-gold border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="mt-6 text-rose-gold font-medium">Carregando...</p>
        </div>
      </main>
    );
  }

  if (!service) {
    return null;
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-luxury relative overflow-hidden flex items-center justify-center">
        <div className="absolute top-0 left-0 w-96 h-96 bg-pastel-rose/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pastel-peach/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="relative z-10 text-center px-4">
          <div className="card-glass p-12 max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-3xl text-rose-gold-dark mb-4">Agendamento Confirmado!</h2>
            <p className="text-stone-500 mb-6">Redirecionando para o WhatsApp...</p>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-3 border-rose-gold-light border-t-rose-gold rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-luxury relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-pastel-rose/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pastel-peach/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-luxury-champagne/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10">
        {/* Header */}
        <header className="pt-16 pb-8 px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full mb-6 border border-rose-gold-light/30">
            <span className="w-2 h-2 bg-rose-gold rounded-full animate-pulse-soft" />
            <span className="text-sm text-rose-gold-dark font-medium">Ultimo Passo</span>
          </div>
          
          <h1 className="font-display text-4xl md:text-5xl text-rose-gold-dark mb-4">
            Seus <span className="text-gold-gradient">Dados</span>
          </h1>
          
          <p className="text-stone-500 text-lg">Preencha para confirmar o agendamento</p>
          
          <div className="mt-6 flex justify-center">
            <div className="w-32 line-elegant" />
          </div>
        </header>

        {/* Step Indicator */}
        <div className="flex justify-center items-center gap-3 mb-10 px-4">
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full border border-rose-gold-light/30">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-rose-gold-light text-rose-gold-dark flex items-center justify-center text-sm font-semibold">
                ✓
              </span>
              <span className="text-rose-gold">Servico</span>
            </div>
            <div className="w-12 h-px bg-rose-gold" />
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-rose-gold-light text-rose-gold-dark flex items-center justify-center text-sm font-semibold">
                ✓
              </span>
              <span className="text-rose-gold">Horario</span>
            </div>
            <div className="w-12 h-px bg-rose-gold" />
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-rose-gold text-white flex items-center justify-center text-sm font-semibold shadow-glow">
                3
              </span>
              <span className="text-rose-gold-dark font-medium">Dados</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-lg mx-auto px-4 pb-20">
          {/* Resumo do Agendamento */}
          <div className="card-luxury p-6 mb-6">
            <h3 className="font-display text-lg text-rose-gold-dark mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Resumo do Agendamento
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-pastel-rose/30">
                <span className="text-stone-500">Servico:</span>
                <span className="text-stone-700 font-medium">{service.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-pastel-rose/30">
                <span className="text-stone-500">Valor:</span>
                <span className="text-rose-gold font-semibold text-lg">{formatPrice(service.price)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-pastel-rose/30">
                <span className="text-stone-500">Data:</span>
                <span className="text-stone-700">
                  {bookingDate && new Date(bookingDate + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-stone-500">Horario:</span>
                <span className="text-stone-700 font-medium">{bookingTime}</span>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="card-luxury p-6">
            <h3 className="font-display text-lg text-rose-gold-dark mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informacoes de Contato
            </h3>
            
            <div className="space-y-5">
              {/* Campo Nome */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-stone-600 mb-2">
                  Seu Nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={clientName}
                  onChange={handleNameChange}
                  placeholder="Digite seu nome completo"
                  className={`input-elegant ${
                    errors.name ? "border-red-300 focus:border-red-400" : ""
                  }`}
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Campo WhatsApp */}
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-stone-600 mb-2">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  id="whatsapp"
                  value={clientWhatsApp}
                  onChange={handleWhatsAppChange}
                  placeholder="(11) 99999-9999"
                  className={`input-elegant ${
                    errors.whatsapp ? "border-red-300 focus:border-red-400" : ""
                  }`}
                />
                {errors.whatsapp && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.whatsapp}
                  </p>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="mt-8 flex gap-3">
              <Link
                href={`/agendar/${serviceId}`}
                className="flex-1 py-3 px-4 rounded-xl text-center border-2 border-rose-gold-light text-rose-gold hover:bg-pastel-rose/30 transition-all duration-300 font-medium"
              >
                ← Voltar
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 py-3 px-4 rounded-xl text-center font-medium transition-all duration-300 ${
                  submitting
                    ? "bg-neutral-elegant text-stone-400 cursor-not-allowed"
                    : "btn-luxury"
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Agendando...
                  </span>
                ) : (
                  "Confirmar Agendamento ✨"
                )}
              </button>
            </div>
          </form>

          {/* Info WhatsApp */}
          <p className="mt-6 text-center text-sm text-stone-400 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Voce sera redirecionado para o WhatsApp
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-stone-400 text-sm">
            ✨ Experiencia exclusiva de beleza ✨
          </p>
        </div>
      </div>
    </main>
  );
}
