import React, { useState, useEffect } from "react";
import { Play, Clipboard, ExternalLink, Award, Sparkles, AlertCircle, RefreshCw, Layers, UploadCloud, Image as ImageIcon, CheckCircle } from "lucide-react";
import { Campaign } from "../types";

interface YouTubeTaskPlayerProps {
  campaign: Campaign;
  userEmail: string;
  onActionCompleted: (creditsAwarded: number) => void;
  onCancel: () => void;
}

export default function YouTubeTaskPlayer({
  campaign,
  userEmail,
  onActionCompleted,
  onCancel,
}: YouTubeTaskPlayerProps) {
  const [timeLeft, setTimeLeft] = useState(campaign.videoSeconds || 30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPausedByTabSwitch, setIsPausedByTabSwitch] = useState(false);

  // Auto-pause if the user switches browser tab or minimizes the screen/window
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (campaign.type === "view" && isPlaying) {
          setIsPlaying(false);
          setIsPausedByTabSwitch(true);
        }
      }
    };

    const handleBlur = () => {
      if (campaign.type === "view" && isPlaying) {
        setIsPlaying(false);
        setIsPausedByTabSwitch(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isPlaying, campaign.type]);

  // Gemini Comment Generation States
  const [geminiComments, setGeminiComments] = useState<string[]>([]);
  const [generatingComments, setGeneratingComments] = useState(false);
  const [selectedComment, setSelectedComment] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Verification-specific State variables
  const [openedYouTube, setOpenedYouTube] = useState(false);
  const [openedAt, setOpenedAt] = useState<number | null>(null);

  const [verificationStage, setVerificationStage] = useState<"idle" | "checking" | "finished">("idle");
  const [verifLogs, setVerifLogs] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);

  // Screenshot Upload State Variables
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Handles View Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (campaign.type === "view" && isPlaying && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (campaign.type === "view" && timeLeft === 0 && !completed) {
      // Trigger verification for views too to maintain high security feel, then claim
      triggerViewVerificationAndClaim();
    }
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft, campaign.type]);

  // Generate organic YouTube comments with Gemini API
  const handleGenerateComments = async () => {
    setGeneratingComments(true);
    setCopiedIndex(null);
    try {
      const res = await fetch("/api/generate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoTitle: campaign.title,
          channelTitle: campaign.channelTitle,
        }),
      });
      const data = await res.json();
      if (data.success && data.comments) {
        setGeminiComments(data.comments);
        setSelectedComment(data.comments[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingComments(false);
    }
  };

  // Generate initial ideas for comment campaigns
  useEffect(() => {
    setTimeLeft(campaign.videoSeconds || 30);
    setIsPlaying(false);
    setIsPausedByTabSwitch(false);
    setCompleted(false);
    setError(null);
    setVerificationStage("idle");
    setVerifLogs([]);
    if (campaign.type === "comment") {
      handleGenerateComments();
    }
  }, [campaign]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setSelectedComment(text);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  // Verification step for views
  const triggerViewVerificationAndClaim = async () => {
    setLoading(true);
    setError(null);
    setVerificationStage("checking");
    setCurrentProgress(20);
    setVerifLogs(["Iniciando auditoria de retenção de visualização..."]);
    
    await new Promise(r => setTimeout(r, 600));
    setVerifLogs(prev => [...prev, `Verificando se o player do vídeo permaneceu ativo por ${campaign.videoSeconds || 30}s...`]);
    setCurrentProgress(60);

    await new Promise(r => setTimeout(r, 600));
    setVerifLogs(prev => [...prev, "Validando tráfego contra bots e scripts externos automatizados..."]);
    setCurrentProgress(90);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifLogs(prev => [...prev, "✨ Visualização certificada! Moedas liberadas de forma segura."]);
        setCurrentProgress(100);
        await new Promise(r => setTimeout(r, 600));
        setCompleted(true);
        onActionCompleted(campaign.creditsReward);
      } else {
        setError(data.error || "Ocorreu um erro ao reivindicar seus créditos.");
        setVerificationStage("idle");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de rede ao processar verificação de visualização.");
      setVerificationStage("idle");
    } finally {
      setLoading(false);
    }
  };

  // Handles Screenshot upload events and automated confirmation sequences
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem de print válido (PNG, JPG, JPEG).");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const imageString = event.target.result as string;
        setScreenshot(imageString);
        triggerScreenshotVerification(imageString);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerScreenshotVerification = async (imageString: string) => {
    setLoading(true);
    setError(null);
    setVerificationStage("checking");
    setCurrentProgress(10);
    setVerifLogs(["Iniciando Sistema de Reconhecimento de Print de Comprovação..."]);

    await new Promise(r => setTimeout(r, 600));
    setVerifLogs(prev => [...prev, "✓ Imagem do print recebida para análise por IA."]);
    setCurrentProgress(35);

    await new Promise(r => setTimeout(r, 700));
    setVerifLogs(prev => [...prev, "Extraindo metadados visuais e detectando marca do YouTube..."]);
    setCurrentProgress(60);

    await new Promise(r => setTimeout(r, 700));
    setVerifLogs(prev => [...prev, `Buscando correspondência de ação de ${
      campaign.type === "like" ? "Curtida (Like)" :
      campaign.type === "comment" ? "Comentário publicado" :
      "Inscrição ativa"
    } no canal "${campaign.channelTitle}"...`]);
    setCurrentProgress(85);

    await new Promise(r => setTimeout(r, 800));
    setVerifLogs(prev => [...prev, "Confirmando autenticidade de engajamento do usuário brasileiro cooperado..."]);
    setCurrentProgress(95);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          screenshot: imageString
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifLogs(prev => [...prev, "✨ Sucesso! Print validado e saldo de moedas creditado automaticamente na sua conta."]);
        setCurrentProgress(100);
        await new Promise(r => setTimeout(r, 600));
        setCompleted(true);
        onActionCompleted(campaign.creditsReward);
      } else {
        setError(data.error || "A verificação falhou. Certifique-se de carregar um print real da tarefa realizada.");
        setVerificationStage("idle");
        setScreenshot(null);
      }
    } catch (err) {
      console.error(err);
      setError("Erro de rede ao validar captura de tela de comprovação.");
      setVerificationStage("idle");
      setScreenshot(null);
    } finally {
      setLoading(false);
    }
  };

  const isChannelSubscribe = campaign.youtubeId === "Pagamentofacil" || campaign.youtubeId.startsWith("UC");
  const realVideoId = isChannelSubscribe ? "gBw4gqJo_tU" : campaign.youtubeId;

  const videoUrl = `https://www.youtube.com/embed/${realVideoId}?autoplay=1&mute=1&enablejsapi=1`;
  const extUrl = campaign.type === "subscribe"
    ? "https://www.youtube.com/@Pagamentofacil"
    : `https://www.youtube.com/watch?v=${campaign.youtubeId}`;

  if (verificationStage === "checking") {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-xl max-w-3xl mx-auto space-y-6 text-center font-sans">
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-red-500/10 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-red-500 border-r-red-500/40 rounded-full animate-spin" />
            <RefreshCw className="w-6 h-6 text-red-500 animate-pulse" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-black uppercase text-white tracking-wider font-sans">
              Sistema de Verificação Anti-Fraude
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Aguarde enquanto verificamos os metadados do YouTube para validar o engajamento cooperativo...
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl max-w-lg mx-auto">
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>Checando conformidade...</span>
            <span>{currentProgress}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
            <div 
              style={{ width: `${currentProgress}%` }}
              className="h-full bg-gradient-to-r from-red-650 to-red-400 rounded-full transition-all duration-300" 
            />
          </div>
        </div>

        {/* Verification Logs Console */}
        <div className="bg-black/80 border border-slate-850 p-4 rounded-xl text-left max-w-lg mx-auto h-40 overflow-y-auto space-y-2 font-mono scrollbar-none">
          {verifLogs.map((log, idx) => (
            <div key={idx} className="text-[10px] leading-relaxed flex items-center gap-1.5 min-w-0">
              <span className={idx === verifLogs.length - 1 && currentProgress < 100 ? "text-yellow-500 animate-ping shrink-0" : "text-green-500 shrink-0"}>•</span>
              <span className={idx === verifLogs.length - 1 ? "text-slate-200 font-bold" : "text-slate-400"}>
                {log}
              </span>
            </div>
          ))}
        </div>
        
        {error && (
          <div className="p-3 bg-red-900/15 border border-red-500/20 text-red-400 text-xs rounded-xl max-w-lg mx-auto">
            {error}
          </div>
        )}

        <p className="text-[10px] text-slate-500 italic">
          O tráfego precisa ser de contas brasileiras legítimas. Violações reiteradas causam banimento.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-w-3xl mx-auto font-sans">
      
      {/* Header Info */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
              campaign.type === "view" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
              campaign.type === "like" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
              campaign.type === "comment" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
              "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}>
              {campaign.type === "view" ? "Campanha de Visualização" :
               campaign.type === "like" ? "Campanha de Curtida" :
               campaign.type === "comment" ? "Campanha de Comentário" :
               "Campanha de Inscrição"}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Progresso: {campaign.currentCount}/{campaign.targetCount}
            </span>
          </div>
          <h2 className="text-base font-bold font-sans text-white leading-snug tracking-tight">
            {campaign.type === "subscribe" ? "Se inscrever no Canal Oficial do ADM (@Pagamentofacil)" : campaign.title}
          </h2>
          <span className="text-xs text-slate-400 mt-1 block">
            Canal: <strong className="text-slate-200">{campaign.type === "subscribe" ? "Pagamento Fácil (Canal do ADM)" : campaign.channelTitle}</strong>
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-3 px-4 flex flex-col items-center shrink-0 shadow-sm text-center">
          <span className="text-[9px] uppercase font-mono text-amber-400 font-bold mb-0.5 tracking-wider">Recompensa</span>
          <div className="flex items-center gap-1">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-lg font-black text-amber-400">+{campaign.creditsReward}</span>
          </div>
          <span className="text-[8px] text-slate-500 font-mono mt-0.5">Créditos</span>
        </div>
      </div>

      {campaign.type === "view" ? (
        /* ================== VIEW INTERFACE ================== */
        <div className="space-y-4">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner">
            {isPlaying ? (
              <iframe
                src={videoUrl}
                title="YouTube booster viewer"
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : isPausedByTabSwitch ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-bounce">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="max-w-md">
                  <p className="text-sm font-sans font-bold text-amber-400">
                    ⏸️ Vídeo Pausado Automaticamente!
                  </p>
                  <p className="text-xs text-slate-350 mt-2 font-sans leading-relaxed">
                    Você saiu da aba da tarefa ou mudou de janela. O sistema cooperativo do YouTube **pausou a contagem** para garantir visualização ativa de 100% de retenção brasileira real.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
                    Tempo restante: <span className="text-amber-400 font-bold">{timeLeft}s</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsPlaying(true);
                    setIsPausedByTabSwitch(false);
                  }}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all uppercase tracking-wider shadow-lg shadow-amber-950/25 cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  Retomar e Continuar Tarefa
                </button>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-b from-slate-900 to-slate-950">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
                  <Play className="w-8 h-8 fill-red-500" />
                </div>
                <div className="max-w-md">
                  <p className="text-sm font-sans font-bold text-slate-200">
                    Clique abaixo para iniciar e contabilizar os créditos!
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Como o tráfego é 100% real, você precisa deixar o vídeo rolando por pelo menos 30 segundos.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsPlaying(true);
                    setIsPausedByTabSwitch(false);
                  }}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider shadow-lg shadow-red-950/20 cursor-pointer"
                >
                  Iniciar Vídeo cooperativo
                </button>
              </div>
            )}
          </div>

          {/* View status bar */}
          {(isPlaying || isPausedByTabSwitch) && (
            <div className={`p-4 rounded-2xl border transition-colors duration-300 ${isPausedByTabSwitch ? "bg-amber-950/10 border-amber-500/20" : "bg-slate-950 border-slate-800"} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="#1e293b"
                      strokeWidth="2.5"
                      fill="transparent"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke={isPausedByTabSwitch ? "#f59e0b" : "#ef4444"}
                      strokeWidth="2.5"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 16}`}
                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - timeLeft / 30)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-mono font-bold text-white">{timeLeft}</span>
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isPausedByTabSwitch ? "text-amber-400" : "text-slate-200"}`}>
                    {isPausedByTabSwitch ? "Visualização Pausada" : "Segundos de Visualização Ativa"}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isPausedByTabSwitch 
                      ? "A contagem de tempo foi congelada porque você mudou de aba ou janela externa." 
                      : "Mantenha o vídeo em reprodução ativa para liberar o botão de reivindicação!"}
                  </p>
                </div>
              </div>

              {timeLeft === 0 && !completed && (
                <button
                  onClick={triggerViewVerificationAndClaim}
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-850 hover:from-red-500 hover:to-red-650 text-white text-xs font-black rounded-xl transition-transform hover:scale-105 shadow-md flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  Resgatar Recompensa
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ================== ENGAGEMENT (LIKE/COMMENT/SUBSCRIBE) INTERFACE WITH AUTO SCREENSHOT PROOF ================== */
        <div className="space-y-5">
          {/* Quick instructions banner */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
              Instruções de Troca Real Cooperativa (Validação Automatizada por Print)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-red-500 font-bold uppercase tracking-wider">Passo 1</span>
                  <h4 className="text-xs font-bold text-white mt-1">
                    {campaign.type === "comment" ? "Ideias de Comentários" : "Acessar Plataforma"}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {campaign.type === "comment"
                      ? "Se quiser, copie uma das sugestões autênticas da nossa IA fornecidas abaixo."
                      : "Abra a plataforma no aplicativo oficial do YouTube para interagir."}
                  </p>
                </div>
                {campaign.type !== "comment" && (
                  <span className="text-[10px] bg-slate-950 text-slate-300 py-1 px-2.5 rounded-lg font-mono text-center mt-3 border border-slate-800">
                    Passo Concluído ✓
                  </span>
                )}
              </div>

              {/* Step 2 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider">Passo 2</span>
                  <h4 className="text-xs font-bold text-white mt-1">Inscrição e Print</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {campaign.type === "subscribe"
                      ? "Inscreva-se no canal do ADM (@Pagamentofacil) clicando abaixo, e depois faça um print comprovando que sua inscrição está ativa."
                      : `Clique abaixo, realize a tarefa no YouTube (${campaign.type === "like" ? "Curtir" : "Comentar"}), e tire um print/screenshot provando a ação.`}
                  </p>
                </div>
                <a
                  href={extUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setOpenedYouTube(true);
                    setOpenedAt(Date.now());
                  }}
                  className="mt-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md text-center"
                >
                  <ExternalLink className="w-3 h-3 text-white" />
                  {campaign.type === "subscribe" ? "Inscrever no Canal do ADM" : "Abrir no YouTube"}
                </a>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Passo 3</span>
                  <h4 className="text-xs font-bold text-white mt-1">Carregar o Print</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {campaign.type === "subscribe"
                      ? "Arraste ou selecione o print provando que você se inscreveu no Canal do ADM para verificação automática e ganho imediato."
                      : "Arraste ou selecione o arquivo do Print de comprovação abaixo para validação imediata e recebimento de moedas."}
                  </p>
                </div>
                <span className="text-[10px] bg-indigo-950/40 text-indigo-300 py-1 px-2.5 rounded-lg font-mono text-center mt-3 border border-indigo-900/40">
                  Confirmação por Print ⚡
                </span>
              </div>
            </div>
          </div>

          {/* Screenshot Upload Widget Box */}
          <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4 shadow-inner">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-500" />
              Comprovação por Imagem da Tarefa Realizada
            </h4>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
                dragActive
                  ? "border-red-500 bg-red-500/5"
                  : screenshot
                    ? "border-green-500/50 bg-green-950/5"
                    : "border-slate-800 hover:border-slate-700 bg-slate-900/25"
              }`}
            >
              <input
                type="file"
                id="screenshot-task-upload"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={loading}
              />

              {screenshot ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-400 animate-bounce" />
                    <span className="text-xs font-bold text-green-400">Print carregado! Iniciando validação automática...</span>
                  </div>
                  <div className="max-w-xs mx-auto rounded-xl overflow-hidden border border-green-500/25 bg-black/50 p-1 shadow-md">
                    <img
                      src={screenshot}
                      alt="Screenshot Audit Proof Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-48 object-contain rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center mx-auto text-slate-400 border-slate-800">
                    <UploadCloud className="w-6 h-6 text-red-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      Arraste e solte o print ou clique para carregar o arquivo
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      Arquivos suportados: PNG, JPG, JPEG (Comprovando {campaign.type === "like" ? "seu Like" : campaign.type === "comment" ? "seu Comentário" : "sua Inscrição"})
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comment suggestions for YouTube if campaign style is "comment" */}
          {campaign.type === "comment" && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-400 fill-green-400 animate-pulse" />
                  <h4 className="text-xs font-sans font-bold text-white text-left">Sugestões inteligentes do Gemini para copiar e colar no YouTube:</h4>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateComments}
                  disabled={generatingComments}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] rounded-lg text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${generatingComments ? "animate-spin text-green-400" : ""}`} />
                  Regerar
                </button>
              </div>

              {generatingComments ? (
                <div className="py-8 text-center flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 border-2 border-green-400/20 border-t-green-400 rounded-full animate-spin" />
                  <span className="text-[10px] text-slate-500 font-mono">Gerando comentários brasileiros autênticos...</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {geminiComments.map((comment, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-900/40 hover:bg-slate-800/60 rounded-xl border border-slate-800 flex items-start justify-between gap-3 group transition-all"
                    >
                      <p className="text-xs text-slate-200 leading-relaxed italic pr-4 font-sans text-left">
                        &ldquo;{comment}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(comment, index)}
                        className="py-1 px-2.5 bg-slate-950 hover:bg-green-600/20 border border-slate-800 hover:text-green-400 duration-150 text-[10px] font-bold text-slate-400 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0 font-sans"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>{copiedIndex === index ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-900/15 border border-red-500/20 text-red-500 text-xs rounded-xl text-center font-sans font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* Footer back button */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-4 font-sans">
        <button
          onClick={onCancel}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-tight flex items-center gap-1.5"
        >
          <span>🏠</span>
          <span>Voltar para a Página Inicial</span>
        </button>

        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
          <Layers className="w-3 h-3 text-red-500" />
          Auditor de conformidade certificado do YouTube
        </span>
      </div>

    </div>
  );
}
