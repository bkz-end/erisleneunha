"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SubscriptionData {
  status: "active" | "inactive" | "expired" | "trial";
  trial_started_at: string | null;
  expires_at: string | null;
}

export default function ConfiguracoesPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [subRes, settingsRes] = await Promise.all([fetch("/api/subscription"), fetch("/api/settings/whatsapp")]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setWhatsapp(settingsData.whatsapp || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const limited = numbers.slice(0, 11);
    if (limited.length <= 2) return limited;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsApp(e.target.value));
  };

  const saveWhatsApp = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: whatsapp.replace(/\D/g, "") }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "WhatsApp salvo com sucesso!" });
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao salvar WhatsApp" });
    } finally {
      setSaving(false);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_started_at) return 0;
    const start = new Date(subscription.trial_started_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - diffDays);
  };

  const handlePayment = async () => {
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
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-soft flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-gold-light border-t-rose-gold rounded-full animate-spin" />
      </div>
    );
  }

  const daysRemaining = getTrialDaysRemaining();
  const isTrialExpired = subscription?.status === "trial" && daysRemaining <= 0;

  return (
    <div className="min-h-screen bg-neutral-soft">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-800">Configurações</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Assinatura
            </h2>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500">Status atual</p>
                <div className="flex items-center gap-2 mt-1">
                  {subscription?.status === "active" ? (
                    <>
                      <span className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="font-semibold text-green-600">Ativa</span>
                    </>
                  ) : subscription?.status === "trial" ? (
                    <>
                      <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                      <span className="font-semibold text-yellow-600">Período de teste</span>
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="font-semibold text-red-600">Inativa</span>
                    </>
                  )}
                </div>
              </div>

              {subscription?.status === "trial" && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Dias restantes</p>
                  <p className={`text-2xl font-bold ${daysRemaining <= 2 ? "text-red-500" : "text-rose-gold"}`}>
                    {daysRemaining}
                  </p>
                </div>
              )}
            </div>

            {subscription?.status === "trial" && daysRemaining <= 3 && (
              <div
                className={`p-4 rounded-xl mb-6 ${
                  isTrialExpired ? "bg-red-50 border border-red-200" : "bg-yellow-50 border border-yellow-200"
                }`}
              >
                <p className={`text-sm ${isTrialExpired ? "text-red-700" : "text-yellow-700"}`}>
                  {isTrialExpired
                    ? "Seu período de teste expirou. Assine agora para continuar usando."
                    : `Seu período de teste termina em ${daysRemaining} dia${daysRemaining > 1 ? "s" : ""}. Assine para não perder acesso.`}
                </p>
              </div>
            )}

            <div className="bg-gradient-to-br from-rose-gold to-rose-gold-dark rounded-2xl p-6 text-white mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-gold-light text-sm">Plano mensal</p>
                  <p className="text-3xl font-bold mt-1">R$ 30,00</p>
                  <p className="text-rose-gold-light text-sm mt-1">por mês</p>
                </div>
                <div className="text-right">
                  <ul className="text-sm space-y-1 text-rose-gold-light">
                    <li>• Agendamentos ilimitados</li>
                    <li>• Gestão de serviços</li>
                    <li>• Lembretes por WhatsApp</li>
                    <li>• Suporte prioritário</li>
                  </ul>
                </div>
              </div>
            </div>

            {subscription?.status !== "active" && (
              <button
                onClick={handlePayment}
                className="w-full py-4 bg-rose-gold text-white rounded-xl font-semibold hover:bg-rose-gold-dark transition-colors shadow-lg shadow-rose-gold/30"
              >
                {subscription?.status === "trial" ? "Assinar agora" : "Reativar assinatura"}
              </button>
            )}

            {subscription?.status === "active" && (
              <div className="text-center py-4 bg-green-50 rounded-xl">
                <p className="text-green-600 font-medium">Sua assinatura está ativa!</p>
                {subscription.expires_at && (
                  <p className="text-sm text-green-500 mt-1">
                    Próxima cobrança: {new Date(subscription.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp para clientes
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Número para onde os clientes serão redirecionados após agendar.
            </p>
          </div>

          <div className="p-6">
            <div className="flex gap-3">
              <input
                type="tel"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                placeholder="(11) 99999-9999"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-gold-light focus:border-rose-gold"
              />
              <button
                onClick={saveWhatsApp}
                disabled={saving}
                className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>

            {message && (
              <p className={`mt-3 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {message.text}
              </p>
            )}

            <p className="mt-4 text-xs text-gray-400">Inclua o DDD. Exemplo: (11) 99999-9999</p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/admin" className="text-rose-gold hover:text-rose-gold-dark transition-colors">
            Voltar ao painel
          </Link>
        </div>
      </main>
    </div>
  );
}
