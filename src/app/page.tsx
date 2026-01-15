"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/agendar");
  }, [router]);

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
