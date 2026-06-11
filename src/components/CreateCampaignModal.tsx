import React, { useState } from "react";
import { X, Video, ThumbsUp, MessageSquare, Bell, Heart, Sparkles, PlusCircle, ArrowLeft } from "lucide-react";
import { Campaign } from "../types";

interface CreateCampaignModalProps {
  onClose: () => void;
  userCredits: number;
  deductCredits: (amount: number) => void;
  onCampaignCreated: (campaign: Campaign) => void;
  userEmail: string;
  onOutOfCredits?: () => void;
}

export default function CreateCampaignModal({
  onClose,
  userCredits,
  deductCredits,
  onCampaignCreated,
  userEmail,
  onOutOfCredits,
}: CreateCampaignModalProps) {
  const [type, setType] = useState<"view" | "like" | "comment" | "subscribe">("view");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [channelTitle, setChannelTitle] = useState("");
  const [targetCount, setTargetCount] = useState<number>(30);
  const [videoSeconds, setVideoSeconds] = useState<number>(30);
  const [customUserEmail, setCustomUserEmail] = useState(userEmail || "");
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isPartnerChannel, setIsPartnerChannel] = useState<boolean>(false);
  const [positionIndex, setPositionIndex] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingYouTube, setFetchingYouTube] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const isAdmin = userEmail && userEmail.toLowerCase() === "cpdatividades@gmail.com";

  const handleFetchYouTubeInfo = async () => {
    if (!url.trim()) return;
    setFetchingYouTube(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(`/api/youtube/info?url=${encodeURIComponent(url.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTitle(data.title || "");
          setChannelTitle(data.channelTitle || "");
          if (data.warning) {
            setWarning(data.warning);
          }
        } else {
          setWarning("A auto-busca falhou. Não se preocupe! Você pode digitar o título e canal manualmente abaixo.");
        }
      } else {
        setWarning("IP de Hospedagem Limitado pelo YouTube. Não se preocupe! O preenchimento automático falhou, mas você pode digitar os dados manualmente nos campos abaixo normalmente.");
      }
    } catch (err) {
      console.error(err);
      setWarning("Hospedagem offline para conexões com o YouTube. Você pode preencher o título e canal manualmente logo abaixo e o sistema aceitará!");
    } finally {
      setFetchingYouTube(false);
    }
  };

  // Parse Youtube Video ID or Channel ID
  const parseYouTubeId = (input: string): { id: string; isChannel: boolean } | null => {
    const trimmed = input.trim();
    
    // Check channel structures
    if (trimmed.includes("/channel/") || trimmed.includes("/c/") || trimmed.includes("/@") || trimmed.startsWith("UC")) {
      // Channel ID matches or named handle
      if (trimmed.startsWith("UC")) return { id: trimmed, isChannel: true };
      
      const parts = trimmed.split("/");
      const lastPart = parts[parts.length - 1] || "";
      if (lastPart) {
        return { id: lastPart, isChannel: true };
      }
      return { id: "UC_x5XG1OV2P6uMXXXXXXXX", isChannel: true };
    }

    // Check standard video matches
    // regex for video ID: youtube.com/watch?v=ID or youtu.be/ID
    const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(videoRegExp);
    
    if (match && match[2].length === 11) {
      return { id: match[2], isChannel: false };
    }

    // Direct 11-char fallback if they just type the YouTube ID
    if (trimmed.length === 11 && !trimmed.includes("/")) {
      return { id: trimmed, isChannel: false };
    }

    return null;
  };

  const getCostPerUnit = (t: string) => {
    const rewards = { view: 30, like: 10, comment: 20, subscribe: 25 };
    return rewards[t as keyof typeof rewards] || 30;
  };

  const cost = getCostPerUnit(type) * targetCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Por favor, insira o link do YouTube!");
      return;
    }
    if (!title.trim()) {
      setError("Por favor, insira um título descritivo!");
      return;
    }
    if (!channelTitle.trim()) {
      setError("Por favor, insira o nome do seu canal!");
      return;
    }

    const parsed = parseYouTubeId(url);
    if (!parsed) {
      setError("Link do YouTube inválido! Insira uma URL de vídeo válida (ex: youtube.com/watch?v=...) ou canal.");
      return;
    }

    if (type === "subscribe" && !parsed.isChannel) {
      setError("Para campanha de INSCRIÇÃO, você deve usar o link do seu CANAL do YouTube, não de um vídeo!");
      return;
    }
    if (type !== "subscribe" && parsed.isChannel) {
      setError("Para campanhas de Visualização, Like ou Comentário, use o link de um VÍDEO do YouTube, não do canal!");
      return;
    }

    const isLocalAdmin = localStorage.getItem("yt_boost_email")?.trim().toLowerCase() === "cpdatividades@gmail.com";

    if (!isLocalAdmin && userCredits < cost) {
      setError(`Créditos insuficientes! Você precisa de ${cost} créditos, mas possui apenas ${userCredits}. Redirecionando para a página de compras...`);
      if (onOutOfCredits) {
        setTimeout(() => {
          onOutOfCredits();
        }, 1500);
      }
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          youtubeId: parsed.id,
          channelTitle,
          targetCount,
          videoSeconds: type === "view" ? videoSeconds : undefined,
          userEmail: isAdmin && customUserEmail.trim() ? customUserEmail.trim() : userEmail,
          isPinned: isAdmin ? isPinned : false,
          isPartnerChannel: isAdmin ? isPartnerChannel : false,
          positionIndex: isAdmin && positionIndex.trim() !== "" ? Number(positionIndex) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        deductCredits(cost);
        onCampaignCreated(data.campaign);
        onClose();
      } else {
        setError(data.error || "Ocorreu um erro ao criar a campanha.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de rede ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative font-sans">
        
        {/* Header banner */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 px-5 py-3 sm:px-6 sm:py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 animate-pulse text-red-250" />
            <h2 className="text-sm sm:text-base font-bold font-sans">Criar Campanha de Impulso</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Container */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* Action type picker */}
          <div>
            <label className="text-[10.5px] text-slate-400 font-mono block mb-2 font-semibold uppercase">
              Qual serviço você precisa?
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => { setType("view"); setUrl(""); }}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                  type === "view"
                    ? "bg-red-500/20 text-red-300 border-red-500"
                    : "bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-750"
                }`}
              >
                <Video className="w-4 h-4" />
                <span className="text-[10px] font-bold">Views</span>
              </button>
              
              <button
                type="button"
                onClick={() => { setType("like"); setUrl(""); }}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                  type === "like"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500"
                    : "bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-750"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-[10px] font-bold">Likes</span>
              </button>

              <button
                type="button"
                onClick={() => { setType("comment"); setUrl(""); }}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                  type === "comment"
                    ? "bg-green-500/20 text-green-300 border-green-500"
                    : "bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-750"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-[10px] font-bold">Comentários</span>
              </button>

              <button
                type="button"
                onClick={() => { setType("subscribe"); setUrl(""); }}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                  type === "subscribe"
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500"
                    : "bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-750"
                }`}
              >
                <Bell className="w-4 h-4" />
                <span className="text-[10px] font-bold">Inscrição</span>
              </button>
            </div>
          </div>

          {/* YouTube Video / Channel Link input */}
          <div>
            <label className="text-[10.5px] text-slate-400 font-mono block mb-1.5 font-semibold uppercase">
              {type === "subscribe" ? "URL do Canal do YouTube" : "URL do Vídeo do YouTube"}
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                type === "subscribe"
                  ? "Ex: youtube.com/@MeuCanal ou youtube.com/channel/..."
                  : "Ex: youtube.com/watch?v=N8Z-S685XoA"
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-between items-center mt-2 bg-slate-950/40 p-1 px-2.5 rounded-xl border border-slate-850">
              <span className="text-[9.5px] text-slate-400 font-sans">
                {fetchingYouTube ? "⏳ Carregando dados oficiais..." : "💡 Cole o link e aperte o botão ao lado"}
              </span>
              <button
                type="button"
                onClick={handleFetchYouTubeInfo}
                disabled={fetchingYouTube || !url.trim()}
                className="py-1 px-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800/50 disabled:text-slate-500 text-[9.5px]/none font-bold text-white rounded-lg transition-all cursor-pointer shadow-sm uppercase tracking-wide flex items-center gap-1"
              >
                {fetchingYouTube ? "Buscando..." : "Puxar Dados"}
              </button>
            </div>
          </div>

          {/* Video / Channel Title */}
          <div>
            <label className="text-[10.5px] text-slate-400 font-mono block mb-1.5 font-semibold uppercase">
              Título da Campanha
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Novo clipe oficial - Minha Música Autoral!"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Channel Name */}
          <div>
            <label className="text-[10.5px] text-slate-400 font-mono block mb-1.5 font-semibold uppercase">
              Nome do Canal (Dono do Conteúdo)
            </label>
            <input
              type="text"
              required
              value={channelTitle}
              onChange={(e) => setChannelTitle(e.target.value)}
              placeholder="Ex: Canal Som Legal"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Target engagement amount */}
          <div className="grid grid-cols-2 gap-3.5 font-sans">
            <div>
              <label className="text-[10.5px] text-slate-400 font-mono block mb-1.5 font-semibold uppercase">
                Meta Desejada
              </label>
              <select
                value={targetCount}
                onChange={(e) => setTargetCount(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-sans cursor-pointer"
              >
                <option value={10}>10 Unidades</option>
                <option value={30}>30 Unidades</option>
                <option value={50}>50 Unidades</option>
                <option value={100}>100 Unidades</option>
                <option value={200}>200 Unidades</option>
              </select>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 flex flex-col justify-center">
              <span className="text-[9px] uppercase font-mono text-slate-450">Total a Pagar</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-amber-400">{cost}</span>
                <span className="text-[8px] text-slate-500 font-mono">moedas</span>
              </div>
            </div>
          </div>

          {/* Video watch duration if view task */}
          {type === "view" && (
            <div className="font-sans">
              <label className="text-[10.5px] text-slate-400 font-mono block mb-1.5 font-semibold uppercase">
                Tempo de Visualização Exigido (Segundos)
              </label>
              <select
                value={videoSeconds}
                onChange={(e) => setVideoSeconds(parseInt(e.target.value) || 30)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-sans cursor-pointer"
              >
                <option value={30}>30 Segundos (Básico - 30 Moedas)</option>
                <option value={60}>60 Segundos (Médio - Altamente Recomendado)</option>
                <option value={120}>120 Segundos (Retenção Avançada)</option>
                <option value={240}>240 Segundos (Máxima Autoridade de Algoritmo)</option>
              </select>
            </div>
          )}

          {/* ADM Exclusives inside Campaign Creation - Highly compacted */}
          {isAdmin && (
            <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-3 space-y-2.5">
              <span className="text-[9px] text-amber-500 font-extrabold uppercase tracking-widest block flex items-center gap-1 leading-none select-none">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Configurar em canal de outro usuário (ADM)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-left">
                  <label className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide mb-0.5 leading-none">
                    E-mail do Dono
                  </label>
                  <input
                    type="email"
                    value={customUserEmail}
                    onChange={(e) => setCustomUserEmail(e.target.value)}
                    placeholder="Ex: cpdatividades@gmail.com"
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-750 focus:border-amber-500 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-705 focus:outline-none transition-colors"
                  />
                </div>

                <div className="text-left">
                  <label className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide mb-0.5 leading-none">
                    Ordem / Posição
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={positionIndex}
                    onChange={(e) => setPositionIndex(e.target.value)}
                    placeholder="Posição (ex: 1, 2...)"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1.5 text-xs text-white font-mono placeholder-slate-650 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {/* Pin switch */}
                <label className="flex items-center gap-2 bg-slate-900/60 px-2 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer shrink-0"
                  />
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold text-slate-300 uppercase">
                      Fixar no Topo
                    </span>
                    <span className="text-[8px] text-slate-550 mt-0.5">Exibe no topo</span>
                  </div>
                </label>

                {/* Partner Channel checkbox */}
                <label className="flex items-center gap-2 bg-slate-900/60 px-2 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={isPartnerChannel}
                    onChange={(e) => setIsPartnerChannel(e.target.checked)}
                    className="w-3.5 h-3.5 accent-red-500 rounded cursor-pointer shrink-0"
                  />
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold text-slate-300 uppercase text-red-400">
                      Canal Parceiro
                    </span>
                    <span className="text-[8px] text-slate-550 mt-0.5">Fixo no topo</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/15 border border-red-500/20 text-red-400 text-xs rounded-xl flex flex-col gap-2">
              <span>{error}</span>
              {onOutOfCredits && error.toLowerCase().includes("créditos insuficientes") && (
                <button
                  type="button"
                  onClick={() => onOutOfCredits()}
                  className="mt-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wider self-start cursor-pointer transition-all duration-200"
                >
                  🛒 Ir comprar moedas via Pix
                </button>
              )}
            </div>
          )}

          {warning && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] rounded-xl leading-relaxed space-y-1 font-sans">
              <span className="font-extrabold text-amber-300 flex items-center gap-1 text-[10px] uppercase tracking-wide">
                <span>⚠️</span> Nota de Auto-Preenchimento:
              </span>
              <p className="text-[10px] text-slate-300">{warning}</p>
            </div>
          )}

          {/* Budget notice */}
          <div className="bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10 flex items-start gap-2 select-none">
            <Sparkles className="w-4.5 h-4.5 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-[10.5px] text-amber-300 leading-relaxed">
              <strong>Estimativa de entrega:</strong> Tráfego cooperado de brasileiros reais de forma gradual e segura dentro de 24 horas, evitando penalidades do algoritmo.
            </div>
          </div>

          {/* Action buttons (always beautifully visible and accessible) */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Voltar</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-red-650 to-red-800 hover:from-red-600 hover:to-red-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-red-950/10 flex items-center justify-center gap-1.5 uppercase tracking-wide active:scale-[0.98]"
            >
              {loading ? "Processando..." : `Confirmar Projeto`}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
