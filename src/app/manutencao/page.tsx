export default function ManutencaoPage() {
  return (
    <main className="min-h-screen bg-gradient-luxury relative overflow-hidden flex items-center justify-center p-4 sm:p-8">
      <div className="absolute top-0 left-0 w-48 sm:w-96 h-48 sm:h-96 bg-pastel-rose/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-pastel-peach/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 text-center w-full">
        <div className="card-glass p-8 sm:p-12 max-w-md mx-auto">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 sm:mb-6 rounded-full bg-pastel-rose flex items-center justify-center">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-rose-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-rose-gold-dark mb-3 sm:mb-4">
            Serviço temporariamente indisponível
          </h1>
          <p className="text-stone-500 leading-relaxed text-sm sm:text-base">
            Estamos em manutenção. Por favor, tente novamente em instantes.
          </p>
          <div className="mt-6 sm:mt-8 flex justify-center">
            <div className="w-24 sm:w-32 line-elegant" />
          </div>
        </div>
      </div>
    </main>
  );
}
