"use client";

import { useState } from "react";

export default function PagamentoPendentePage() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/checkout", { method: "POST" });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert("Erro ao gerar link de pagamento");
      }
    } catch {
      alert("Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-luxury relative overflow-hidden flex items-center justify-center p-4 sm:p-8">
      <div className="absolute top-0 left-0 w-48 sm:w-96 h-48 sm:h-96 bg-pastel-rose/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-pastel-peach/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 w-full max-w-md">
        <div className="card-glass p-6 sm:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 sm:mb-6 rounded-full bg-gradient-to-br from-rose-gold to-rose-gold-dark flex items-center justify-center">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="font-display text-xl sm:text-2xl text-rose-gold-dark mb-3 sm:mb-4">
            Assinatura pendente
          </h1>

          <p className="text-stone-500 mb-5 sm:mb-6 leading-relaxed text-sm sm:text-base">
            Sua assinatura está pendente. Regularize para reativar seu sistema.
          </p>

          <div className="bg-gradient-to-br from-rose-gold to-rose-gold-dark rounded-2xl p-5 text-white mb-5 sm:mb-6">
            <p className="text-rose-gold-light text-xs sm:text-sm">Plano mensal</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">R$ 30,00</p>
            <p className="text-rose-gold-light text-xs sm:text-sm mt-1">por mês</p>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full btn-luxury disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              "Regularizar pagamento"
            )}
          </button>

          <p className="text-xs sm:text-sm text-stone-400 mt-4">
            Após o pagamento, seu sistema será reativado automaticamente.
          </p>
        </div>
      </div>
    </main>
  );
}
