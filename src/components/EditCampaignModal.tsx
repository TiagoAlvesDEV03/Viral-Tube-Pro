import React, { useState, useEffect } from "react";
import { X, Video, ThumbsUp, MessageSquare, Bell, Sparkles, Edit3, Pin, User, List } from "lucide-react";
import { Campaign } from "../types";

interface EditCampaignModalProps {
  campaign: Campaign;
  onClose: () => void;
  onCampaignUpdated: (updatedCampaign: Campaign) => void;
}

export default function EditCampaignModal({
  campaign,
  onClose,
  onCampaignUpdated,
}: EditCampaignModalProps) {
  const [type, setType] = useState<"view" | "like" | "comment" | "subscribe">(campaign.type);
  const [url, setUrl] = useState(campaign.youtubeId);
  const [title, setTitle] = useState(campaign.title);
  const [channelTitle, setChannelTitle] = useState(campaign.channelTitle);
  const [currentCount, setCurrentCount] = useState<number>(campaign.currentCount);
  const [targetCount, setTargetCount] = useState<number>(campaign.targetCount);
  const [creditsReward, setCreditsReward] = useState<number>(campaign.creditsReward);
  const [videoSeconds, setVideoSeconds] = useState<number>(campaign.videoSeconds || 30);
  const [userEmail, setUserEmail] = useState(campaign.userEmail || "");
  const [isPinned, setIsPinned] = useState<boolean>(campaign.isPinned || false);
  const [isPartnerChannel, setIsPartnerChannel] = useState<boolean>(campaign.isPartnerChannel || false);
  const [positionIndex, setPositionIndex] = useState<string>(campaign.positionIndex !== undefined ? String(campaign.positionIndex) : "");
  const [loading, setLoading] = useState(false);
  const [fetchingYouTube, setFetchingYouTube] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Initialize fields if campaign changes
  useEffect(() => {
    setType(campaign.type);
    setUrl(campaign.youtubeId);
    setTitle(campaign.title);
    setChannelTitle(campaign.channelTitle);
    setCurrentCount(campaign.currentCount);
    setTargetCount(campaign.targetCount);
    setCreditsReward(campaign.creditsReward);
    setVideoSeconds(campaign.videoSeconds || 30);
    setUserEmail(campaign.userEmail || "");
    setIsPinned(campaign.isPinned || false);
    setIsPartnerChannel(campaign.isPartnerChannel || false);
    setPositionIndex(campaign.positionIndex !== undefined ? String(campaign.positionIndex) : "");
  }, [campaign]);

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

  const parseYouTubeId = (input: string): { id: string; isChannel: boolean } | null => {
    const trimmed = input.trim();
    
    // Check channel structures
    if (trimmed.includes("/channel/") || trimmed.includes("/c/") || trimmed.includes("/@") || trimmed.startsWith("UC")) {
      if (trimmed.startsWith("UC")) return { id: trimmed, isChannel: true };
      
      const parts = trimmed.split("/");
      const lastPart = parts[parts.length - 1] || "";
      if (lastPart) {
        return { id: lastPart, isChannel: true };
      }
      return { id: "UC_x5XG1OV2P6uMXXXXXXXX", isChannel: true };
    }

    const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(videoRegExp);
    
    if (match && match[2].length === 11) {
      return { id: match[2], isChannel: false };
    }

    if (trimmed.length === 11 && !trimmed.includes("/")) {
      return { id: trimmed, isChannel: false };
    }

    return null;
  };

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
      setError("Por favor, insira o nome do canal!");
      return;
    }

    const parsed = parseYouTubeId(url);
    const resolvedId = parsed ? parsed.id : url.trim();

    if (type === "subscribe" && parsed && !parsed.isChannel) {
      setError("Nota: Para inscrições, é ideal usar o identificador ou ID do canal.");
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          youtubeId: resolvedId,
          channelTitle,
          currentCount,
          targetCount,
          creditsReward,
          videoSeconds,
          userEmail,
          isPinned,
          isPartnerChannel,
          positionIndex: positionIndex.trim() === "" ? null : Number(positionIndex),
        }),
      });

      const data = await response.json();
      if (data.success) {
        onCampaignUpdated(data.campaign);
        onClose();
      } else {
        setError(data.error || "Ocorreu um erro ao atualizar a campanha.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de rede ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-fade-in font-sans">
        
        {/* Header banner */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-4 flex items-center justify-between text-slate-950">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 animate-pulse" />
            <h2 className="text-base font-black uppercase tracking-tight font-sans text-slate-950">Alterar Vídeo / Tarefa (ADM)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/10 rounded-full transition-colors cursor-pointer text-slate-950"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Action type picker (Tab switching within the edit modal) */}
          <div>
            <label className="text-xs text-slate-400 font-mono block mb-2 font-semibold uppercase">
              Tipo de Tarefa / Aba de exibição
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setType("view")}
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
                onClick={() => setType("like")}
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
                onClick={() => setType("comment")}
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
                onClick={() => setType("subscribe")}
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

          {/* YouTube Video / Channel ID or Link input */}
          <div>
            <label className="text-xs text-slate-400 font-mono block mb-1.5 font-semibold uppercase">
              URL ou Identificador do Vídeo/Canal
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Identificador (ex: Pagamentofacil) ou URL do Youtube"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-amber-500 font-mono"
            />
            <div className="flex justify-between items-center mt-2 bg-slate-950/40 p-1 px-2.5 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-400 font-sans">
                {fetchingYouTube ? "⏳ Carregando dados oficiais..." : "💡 Altere acima ou puxe os dados novamente"}
              </span>
              <button
                type="button"
                onClick={handleFetchYouTubeInfo}
                disabled={fetchingYouTube || !url.trim()}
                className="py-1 px-3 bg-slate-800 hover:bg-slate-750 disabled:bg-slate-800/10 disabled:text-slate-600 text-[10px] font-bold text-white rounded-lg transition-all cursor-pointer shadow-sm uppercase tracking-wide flex items-center gap-1"
              >
                {fetchingYouTube ? "Buscando..." : "Atualizar via Link/ID"}
              </button>
            </div>
          </div>

          {/* Video / Channel Title */}
          <div>
            <label className="text-xs text-slate-400 font-mono block mb-1.5 font-semibold uppercase">
              Título da Campanha
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da tarefa..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Channel Name */}
          <div>
            <label className="text-xs text-slate-400 font-mono block mb-1.5 font-semibold uppercase">
              Nome do Canal (Dono do Conteúdo)
            </label>
            <input
              type="text"
              required
              value={channelTitle}
              onChange={(e) => setChannelTitle(e.target.value)}
              placeholder="Escreva o nome do canal..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Counts and Rewards control */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-1 font-sans">
            <div>
              <label className="text-[9px] text-slate-400 font-mono block mb-1 font-semibold uppercase truncate">
                Atual Realizado
              </label>
              <input
                type="number"
                min={0}
                required
                value={currentCount}
                onChange={(e) => setCurrentCount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-400 font-mono block mb-1 font-semibold uppercase truncate">
                Meta Desejada
              </label>
              <input
                type="number"
                min={1}
                required
                value={targetCount}
                onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-400 font-mono block mb-1 font-semibold uppercase truncate">
                Moedas Reward
              </label>
              <input
                type="number"
                min={1}
                required
                value={creditsReward}
                onChange={(e) => setCreditsReward(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-400 font-mono block mb-1 font-semibold uppercase truncate">
                Tempo Vídeo (s)
              </label>
              <input
                type="number"
                min={10}
                disabled={type !== "view"}
                required={type === "view"}
                value={videoSeconds}
                onChange={(e) => setVideoSeconds(parseInt(e.target.value) || 30)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
                placeholder="Ex: 30"
              />
            </div>
          </div>

          {/* ADM EXCLUSIVES: Pinning, ordering & custom owner */}
          <div className="border-t border-slate-800/80 pt-4 space-y-3">
            <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest block flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Controles Avançados do Administrador
            </span>

            <div className="text-left space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" />
                E-mail do Proprietário da Tarefa
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Exemplo: cpdatividades@gmail.com ou email de outro cadastrado"
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
              />
              <p className="text-[9.5px] text-slate-500 leading-normal font-sans">
                Permite atribuir esta tarefa direta ou indiretamente para outro e-mail de usuário, aparecendo e refletindo no painel de progresso dele.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Pin Switch */}
              <label className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-850 hover:border-slate-800 cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-200 uppercase flex items-center gap-1 leading-snug">
                    <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Fixar no Topo
                  </span>
                  <span className="text-[9px] text-slate-550 leading-tight">Exibe no topo das tarefas</span>
                </div>
              </label>

              {/* Partner Channel checkbox */}
              <label className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-850 hover:border-slate-800 cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={isPartnerChannel}
                  onChange={(e) => setIsPartnerChannel(e.target.checked)}
                  className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-200 uppercase flex items-center gap-1 leading-snug text-red-400">
                    🤝 Canal Parceiro
                  </span>
                  <span className="text-[9px] text-slate-550 leading-tight">Opção permanente (só ADM remove)</span>
                </div>
              </label>

              {/* Position Index input */}
              <div className="flex flex-col justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850 hover:border-slate-800 transition-colors sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-200 uppercase flex items-center gap-1 mb-1">
                  <List className="w-3 h-3 text-slate-400" />
                  Posição da Tarefa
                </span>
                <input
                  type="number"
                  min="0"
                  value={positionIndex}
                  onChange={(e) => setPositionIndex(e.target.value)}
                  placeholder="Ordem (ex: 1, 2, 3...)"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-white font-mono placeholder-slate-650 id-task-pos focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/15 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          {warning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl leading-relaxed space-y-1 font-sans">
              <span className="font-extrabold text-amber-300 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                <span>⚠️</span> Nota de Auto-Preenchimento:
              </span>
              <p className="text-[10.5px] text-slate-300">{warning}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-850">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-950/10 flex items-center justify-center gap-1.5 uppercase tracking-wide"
            >
              {loading ? "Salvando..." : `Salvar Alteração`}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
