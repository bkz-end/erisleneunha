"use client";

/**
 * Admin Login Page
 * 
 * Requirements:
 * - 4.1: Exigir autenticação segura para painel administrativo
 * - 5.1: Redirecionar para login se não autenticado
 * - 5.2: Criar sessão autenticada com credenciais válidas
 * - 5.3: Exibir mensagem de erro com credenciais inválidas
 */

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao fazer login");
        return;
      }

      // Redirect to admin dashboard on success
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-luxury flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-48 md:w-96 h-48 md:h-96 bg-pastel-rose/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-48 md:w-96 h-48 md:h-96 bg-pastel-peach/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-soft max-w-md w-full relative z-10 border border-pastel-rose/30">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-rose to-pastel-peach flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <h1 className="font-display text-xl sm:text-2xl text-rose-gold-dark text-center mb-2">
          Área Administrativa
        </h1>
        <p className="text-stone-500 text-sm text-center mb-6">
          Faça login para acessar o painel
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold outline-none transition-all bg-white/50 text-base"
              placeholder="seu@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold outline-none transition-all bg-white/50 text-base"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-gold hover:bg-rose-gold-dark text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow hover:shadow-lg active:scale-[0.98] mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Entrando...
              </span>
            ) : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
