"use client";

import { useState } from "react";

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  tip?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Bem-vinda ao seu Sistema! 🎉",
    description: "Este é o seu painel de agendamentos. Aqui você vai gerenciar tudo: seus serviços, horários disponíveis e os agendamentos das suas clientes.",
    icon: "👋",
    tip: "Vamos fazer um tour rápido para você conhecer tudo!"
  },
  {
    title: "Cadastre seus Serviços 💅",
    description: "Primeiro, você precisa cadastrar os serviços que oferece. Clique em 'Serviços' no menu e adicione cada um com nome, preço e duração.",
    icon: "✨",
    tip: "Exemplo: 'Unha em Gel' - R$ 80,00 - 60 minutos"
  },
  {
    title: "Defina seus Horários 🕐",
    description: "Depois, vá em 'Horários' e configure os dias e horários que você atende. Assim suas clientes só vão ver os horários que você realmente está disponível.",
    icon: "📅",
    tip: "Você pode definir horários diferentes para cada dia da semana!"
  },
  {
    title: "Acompanhe os Agendamentos 📋",
    description: "Quando uma cliente agendar, você vai ver aqui no painel. Clique em 'Agendamentos' para ver todos os horários marcados.",
    icon: "✅",
    tip: "Você também recebe uma mensagem no WhatsApp quando alguém agenda!"
  },
  {
    title: "Compartilhe o Link 📱",
    description: "Para suas clientes agendarem, basta compartilhar o link do seu site. Elas escolhem o serviço, o horário e pronto!",
    icon: "🔗",
    tip: "Coloque o link na sua bio do Instagram!"
  },
  {
    title: "Configurações ⚙️",
    description: "Em 'Configurações' você pode atualizar seu número de WhatsApp para receber as notificações de agendamento.",
    icon: "📞",
    tip: "Mantenha seu WhatsApp sempre atualizado!"
  },
  {
    title: "Tudo Pronto! 🚀",
    description: "Agora é só começar! Cadastre seus serviços, defina seus horários e compartilhe o link com suas clientes. Sucesso! 💖",
    icon: "🎀",
    tip: "Qualquer dúvida, clique no botão de ajuda novamente!"
  }
];

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Tutorial({ isOpen, onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
      setCurrentStep(0);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-br from-rose-gold to-rose-gold-dark p-6 text-white text-center">
          <div className="text-5xl mb-3">{step.icon}</div>
          <h2 className="font-display text-xl sm:text-2xl">{step.title}</h2>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          <p className="text-gray-600 text-center leading-relaxed mb-4">
            {step.description}
          </p>
          
          {step.tip && (
            <div className="bg-pastel-cream rounded-xl p-4 border border-pastel-rose/30">
              <p className="text-sm text-rose-gold-dark flex items-start gap-2">
                <span className="text-lg">💡</span>
                <span>{step.tip}</span>
              </p>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-4">
          {tutorialSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep 
                  ? "bg-rose-gold w-6" 
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>

        {/* Botões */}
        <div className="p-4 pt-0 flex gap-3">
          {!isFirstStep && (
            <button
              onClick={handlePrev}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-gold text-white font-medium hover:bg-rose-gold-dark transition-colors"
          >
            {isLastStep ? "Começar! 🎉" : "Próximo"}
          </button>
        </div>

        {/* Botão fechar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Botão de ajuda flutuante
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-rose-gold to-rose-gold-dark text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
      title="Precisa de ajuda?"
    >
      <span className="text-xl sm:text-2xl">?</span>
    </button>
  );
}
