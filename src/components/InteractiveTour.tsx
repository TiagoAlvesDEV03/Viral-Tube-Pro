import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Coins,
  Tv,
  PlusCircle,
  Gift,
  X,
  ChevronRight,
  ChevronLeft,
  Award,
  CreditCard,
  User,
  CheckCircle,
  Smartphone
} from "lucide-react";

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  userCredits: number;
  onTabChange?: (tab: "all" | "view" | "like" | "comment" | "subscribe" | "admin" | "progress" | "buy-coins") => void;
}

interface Step {
  targetId: string;
  title: string;
  description: string;
  position: "bottom" | "top" | "left" | "right" | "center";
  icon: React.ReactNode;
}

export default function InteractiveTour({
  isOpen,
  onClose,
  userCredits,
  onTabChange
}: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);

  const generalSteps: Step[] = [
    {
      targetId: "user-credits-badge",
      title: "Seu Saldo Inicial de Impulso!",
      description: "Parabéns pelo cadastro bem-sucedido! Você acaba de receber 1.500 moedas de presente de boas-vindas. Seus créditos ficam sempre visíveis nesta carteira no cabeçalho.",
      position: "bottom",
      icon: <Coins className="w-5 h-5 text-amber-400 animate-bounce" />,
    },
    {
      targetId: "highlighted-campaigns-section",
      title: "Ganhe Moedas com Tarefas",
      description: "Precisa de mais moedas para bombar seu canal? Logo na página inicial, você verá tarefas cooperadas brasileiras ativas. Assista, curta ou comente para coletar cada vez mais recompensas legítimas!",
      position: "top",
      icon: <Tv className="w-5 h-5 text-red-500" />,
    },
    {
      targetId: "btn-boost-channel",
      title: "Cadastre sua Primeira Campanha",
      description: "Pronto para receber novos inscritos, visualizações ou likes brasileiros de verdade? Clique em 'Impulsionar Canal' no topo para registrar seu vídeo do YouTube e usar suas moedas!",
      position: "bottom",
      icon: <PlusCircle className="w-5 h-5 text-indigo-400" />,
    },
    {
      targetId: "daily-renewal-widget",
      title: "Sua Salvaguarda Diária Grátis",
      description: "As moedas voluntárias acabaram? Não se preocupe! O widget de Renovação Diária garante que você resgate +1.500 moedas grátis a cada 24 horas para nunca parar de crescer.",
      position: "left",
      icon: <Gift className="w-5 h-5 text-amber-500 animate-pulse" />,
    },
  ];

  const steps = generalSteps;
  const activeStep = steps[currentStep];

  // Auto switch tab when taking the tour
  useEffect(() => {
    if (isOpen) {
      onTabChange?.("all");
    }
  }, [isOpen, onTabChange]);

  // Reset steps on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Calculate coordinates of current target element
  const updateCoords = () => {
    if (!isOpen || !activeStep) return;
    
    // Find target in DOM
    const element = document.getElementById(activeStep.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      const newTop = rect.top + window.scrollY;
      const newLeft = rect.left + window.scrollX;
      const newWidth = rect.width;
      const newHeight = rect.height;

      // Only update state if coordinates actually changed by more than 1px
      setCoords((prev) => {
        if (
          prev &&
          Math.abs(prev.top - newTop) < 1.5 &&
          Math.abs(prev.left - newLeft) < 1.5 &&
          Math.abs(prev.width - newWidth) < 1.5 &&
          Math.abs(prev.height - newHeight) < 1.5
        ) {
          return prev;
        }
        return { top: newTop, left: newLeft, width: newWidth, height: newHeight };
      });
    } else {
      setCoords((prev) => (prev === null ? null : null));
    }
  };

  // Scroll target into view once when step or tour type changes
  useEffect(() => {
    if (!isOpen || !activeStep) return;
    
    const scrollTimeout = setTimeout(() => {
      const element = document.getElementById(activeStep.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top >= 60 && rect.bottom <= window.innerHeight - 60;
        if (!isVisible) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }, 250);

    return () => clearTimeout(scrollTimeout);
  }, [currentStep, isOpen]);

  // Keep coordinates updated dynamically to handle layout Shifts, lazy tabs, or window resizing
  useEffect(() => {
    if (isOpen) {
      // Run once immediately
      updateCoords();

      // Poll at short intervals to catch lazy tab loading or transitions
      const interval = setInterval(updateCoords, 150);
      
      const handleResize = () => {
        updateCoords();
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize);

      return () => {
        clearInterval(interval);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleResize);
      };
    }
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("yt_tour_completed", "true");
    onClose();
  };

  // Determine popup coordinates relative to the highlighted target bounds
  const getPopoverStyle = () => {
    if (!coords) {
      // Center position fallback
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        position: "fixed" as const,
      };
    }

    const margin = 16;
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // For mobile device compatibility, center popup at bottom area of screen to prevent text clipping
      return {
        left: "50%",
        bottom: "20px",
        transform: "translateX(-50%)",
        position: "fixed" as const,
        width: "calc(100% - 32px)",
        maxWidth: "400px",
      };
    }

    switch (activeStep.position) {
      case "bottom":
        return {
          top: `${coords.top + coords.height + margin}px`,
          left: `${coords.left + coords.width / 2 - 180}px`,
          position: "absolute" as const,
          width: "360px",
        };
      case "top":
        return {
          top: `${coords.top - 240}px`, // approximate height of popover
          left: `${coords.left + coords.width / 2 - 185}px`,
          position: "absolute" as const,
          width: "370px",
        };
      case "left":
        return {
          top: `${coords.top + coords.height / 2 - 100}px`,
          left: `${coords.left - 380}px`,
          position: "absolute" as const,
          width: "360px",
        };
      case "right":
        return {
          top: `${coords.top + coords.height / 2 - 100}px`,
          left: `${coords.left + coords.width + margin}px`,
          position: "absolute" as const,
          width: "360px",
        };
      default:
        return {
          top: `${coords.top + coords.height + margin}px`,
          left: `${coords.left + coords.width / 2 - 180}px`,
          position: "absolute" as const,
          width: "360px",
        };
    }
  };

  return (
    <div id="interactive-tour-overlay" className="fixed inset-0 z-[100] overflow-y-auto pointer-events-none">
      
      {/* Absolute high-contrast SVG overlay for custom spot cutout focus effect - Backdrop click is disabled so popup remains fixed on steps */}
      <div className="absolute inset-0 bg-slate-950/75 pointer-events-auto backdrop-blur-[1.5px]" onClick={(e) => { e.stopPropagation(); }}>
        {coords && (
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                {/* Rounded cutout focusing on active dashboard item */}
                <rect
                  x={coords.left - 8}
                  y={coords.top - 8}
                  width={coords.width + 16}
                  height={coords.height + 16}
                  rx="14"
                  ry="14"
                  fill="black"
                />
              </mask>
            </defs>
            {/* Overlay background inheriting mask */}
            <rect width="100%" height="100%" fill="currentColor" className="text-slate-950/40" mask="url(#tour-mask)" />
          </svg>
        )}
      </div>

      {/* PopUp Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`tour-card-step-${currentStep}`}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -15 }}
          transition={{ duration: 0.3 }}
          style={getPopoverStyle()}
          className="bg-slate-900 border border-red-500/30 rounded-3xl p-5 px-9 shadow-2xl relative overflow-hidden pointer-events-auto select-none"
        >
          {/* Side navigation chevrons for next/prev steps */}
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              type="button"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer z-25 hover:scale-110 active:scale-90"
              title="Voltar Passo"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleNext}
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-all cursor-pointer z-25 hover:scale-110 active:scale-90"
            title={currentStep === steps.length - 1 ? "Começar!" : "Próximo Passo"}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Subtle tech background flare */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <button
            onClick={handleComplete}
            title="Pular Tour"
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
              {activeStep.icon}
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wider block">
                Guia de Introdução • Passo {currentStep + 1} de {steps.length}
              </span>
              <h3 className="text-xs font-black text-white uppercase tracking-tight">
                {activeStep.title}
              </h3>
            </div>
          </div>

          {/* Description text */}
          <p className="text-[11px] leading-relaxed text-slate-300 font-sans mb-4">
            {activeStep.description}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-1">
              {steps.map((_, idx) => (
                <div
                  key={`dot-${idx}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? "w-4 bg-red-500" : "w-1.5 bg-slate-700"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-0.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-3.5 py-1.5 rounded-xl bg-red-650 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold transition-all flex items-center gap-0.5 shadow-md shadow-red-950/25 cursor-pointer uppercase tracking-wide"
              >
                {currentStep === steps.length - 1 ? "Começar!" : "Próximo"}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Guide pulsing target indicator focus marker (only if coords exist) */}
      {coords && (
        <div
          style={{
            top: `${coords.top - 8}px`,
            left: `${coords.left - 8}px`,
            width: `${coords.width + 16}px`,
            height: `${coords.height + 16}px`,
          }}
          className="absolute border border-red-500/60 rounded-xl pointer-events-none custom-tour-pulse animate-pulse z-[101]"
        />
      )}
    </div>
  );
}
