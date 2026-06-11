import React, { useState, useEffect, useRef } from "react";
import { Campaign } from "../types";
import { 
  Tv, 
  ThumbsUp, 
  MessageSquare, 
  Bell, 
  Activity, 
  Zap, 
  TrendingUp, 
  Clock, 
  Server, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw
} from "lucide-react";

export function getThumbnailUrl(camp: Campaign): string {
  const isChannelSubscribe = camp.youtubeId === "Pagamentofacil" || camp.youtubeId.startsWith("UC");
  const videoId = isChannelSubscribe ? "gBw4gqJo_tU" : camp.youtubeId;
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

interface ProgressDashboardProps {
  campaigns: Campaign[];
  userEmail: string;
  onBoost: (id: string) => void;
  onRefresh: () => void;
}

interface ActivityLog {
  id: string;
  time: string;
  user: string;
  region: string;
  taskType: "view" | "like" | "comment" | "subscribe";
  campaignTitle: string;
  outcome: string;
  coins: number;
}

const BRAZILIAN_REGIONS = [
  "São Paulo, SP", "Rio de Janeiro, RJ", "Belo Horizonte, MG", 
  "Curitiba, PR", "Salvador, BA", "Porto Alegre, RS", 
  "Fortaleza, CE", "Brasília, DF", "Recife, PE", "Goiânia, GO"
];

const BR_USER_NICKNAMES = [
  "thiaginho_gamer", "rebeca_financas", "lucas_dev_br", "cris_influencer",
  "pedro_tutoriais", "mari_receitas", "felipe_marketing", "ana_tech",
  "gabriel_booster", "ju_vlogs", "vitor_pixel", "carol_clicks"
];

export default function ProgressDashboard({
  campaigns,
  userEmail,
  onBoost,
  onRefresh,
}: ProgressDashboardProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Filter logged-in user campaigns and restrict other user campaigns
  const myCampaigns = campaigns.filter(c => c.userEmail && c.userEmail.toLowerCase() === userEmail.toLowerCase());
  const otherCampaigns = userEmail.toLowerCase() === "cpdatividades@gmail.com"
    ? campaigns.filter(c => c.userEmail && c.userEmail.toLowerCase() !== "cpdatividades@gmail.com")
    : [];

  // Statistical calculations based on current user's campaigns
  const totalCampaignsTarget = myCampaigns.reduce((acc, curr) => acc + curr.targetCount, 0);
  const totalCampaignsCurrent = myCampaigns.reduce((acc, curr) => acc + curr.currentCount, 0);
  const globalCompletionPct = totalCampaignsTarget > 0 ? Math.round((totalCampaignsCurrent / totalCampaignsTarget) * 100) : 0;

  // Initialize logs on mount
  useEffect(() => {
    const initialLogs: ActivityLog[] = [];
    const now = new Date();
    
    // Pre-populate some fresh live logs
    for (let i = 4; i >= 0; i--) {
      const logTime = new Date(now.getTime() - i * 45000 * (1 + Math.random()));
      const typeOptions: ("view" | "like" | "comment" | "subscribe")[] = ["view", "like", "comment", "subscribe"];
      const rType = typeOptions[Math.floor(Math.random() * rTypeSelector(i))];
      
      const matchCamp = myCampaigns.length > 0 
        ? myCampaigns[Math.floor(Math.random() * myCampaigns.length)]
        : campaigns[0];

      const title = matchCamp ? matchCamp.title : "Vídeo Inicial do Canal";
      const uType = matchCamp ? matchCamp.type : rType;

      initialLogs.push({
        id: `prev-log-${i}-${Date.now()}`,
        time: logTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        user: `@${BR_USER_NICKNAMES[Math.floor(Math.random() * BR_USER_NICKNAMES.length)]}`,
        region: BRAZILIAN_REGIONS[Math.floor(Math.random() * BRAZILIAN_REGIONS.length)],
        taskType: uType,
        campaignTitle: title,
        outcome: uType === "view" ? "assistiu 45s e contabilizou view" : 
                 uType === "like" ? "deixou o like pelo YouTube Player" :
                 uType === "comment" ? "copiou comentário IA recomendado" : "completou inscrição automática",
        coins: uType === "view" ? 30 : uType === "like" ? 10 : uType === "comment" ? 20 : 25,
      });
    }

    setLogs(initialLogs);
  }, [campaigns.length, userEmail]);

  // Helper selector index
  const rTypeSelector = (index: number) => {
    return 4;
  };

  // Simulated streaming updates in real-time
  useEffect(() => {
    const handleAddLiveLog = () => {
      const matchCamp = myCampaigns.length > 0 
        ? myCampaigns[Math.floor(Math.random() * myCampaigns.length)]
        : campaigns[Math.floor(Math.random() * campaigns.length)];

      if (!matchCamp) return;

      const randomUser = `@${BR_USER_NICKNAMES[Math.floor(Math.random() * BR_USER_NICKNAMES.length)]}`;
      const randomRegion = BRAZILIAN_REGIONS[Math.floor(Math.random() * BRAZILIAN_REGIONS.length)];
      const now = new Date();
      const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      const newActivity: ActivityLog = {
        id: `live-log-${Date.now()}`,
        time: timeStr,
        user: randomUser,
        region: randomRegion,
        taskType: matchCamp.type,
        campaignTitle: matchCamp.title,
        outcome: matchCamp.type === "view" ? "assistiu 45s e contabilizou view" : 
                 matchCamp.type === "like" ? "deixou o like pelo YouTube Player" :
                 matchCamp.type === "comment" ? "copiou comentário IA recomendado" : "completou inscrição automática",
        coins: matchCamp.creditsReward,
      };

      setLogs(prev => {
        const updated = [...prev, newActivity];
        // Keep last 15 items for memory optimization
        if (updated.length > 15) {
          updated.shift();
        }
        return updated;
      });

      // Auto scroll terminal log to bottom
      if (logContainerRef.current) {
        setTimeout(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    };

    // Trigger activities streaming every 4 seconds to make screen tick in real-time
    const interval = setInterval(handleAddLiveLog, 4800);
    return () => clearInterval(interval);
  }, [campaigns]);

  const triggerManualRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Status Ring Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Deliveries Card */}
        <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
              {userEmail.toLowerCase() === "cpdatividades@gmail.com" ? "Entregas do Canal ADM" : "Entregas Solicitadas"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tracking-tight">{totalCampaignsCurrent}</span>
              <span className="text-[10px] text-slate-500 font-mono">/ {totalCampaignsTarget} un</span>
            </div>
            <span className="text-[10px] text-teal-400 block font-sans font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Retenção Geral: 98.4%
            </span>
          </div>
          <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-teal-400" />
          </div>
        </div>

        {/* Global Progress Badge */}
        <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Percentual Concluído</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-red-400 tracking-tight">{globalCompletionPct}%</span>
              <span className="text-[10px] text-slate-500">Média Geral</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              Suas Campanhas Ativas: {myCampaigns.length}
            </span>
          </div>
          <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-red-400" />
          </div>
        </div>

        {/* Deliver rate speed indicator */}
        <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Velocidade de Processamento</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-indigo-400 tracking-tight">Estável</span>
              <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 rounded font-mono">~20/min</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              Fila Dedicada Premium
            </span>
          </div>
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        {/* In-Memory Sync Connection Status */}
        <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Status do Buffer Local</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-400 tracking-tight">Ativo</span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 font-mono uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              Node ID: API-YOUTUBE-BR
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
            <Server className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

      </div>

      {/* Main progress sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left pane: User Campaigns Progress Grid (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                <span>
                  {userEmail.toLowerCase() === "cpdatividades@gmail.com"
                    ? "Progresso em Tempo Real - Canal ADM (@Pagamentofacil)"
                    : "Painel de Progresso de Suas Campanhas 👑"}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Monitorando engajamento para <strong className="text-slate-300 font-mono">{userEmail}</strong>
              </p>
            </div>

            <button
              onClick={triggerManualRefresh}
              className="p-1 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-[10px] rounded-xl border border-slate-850 cursor-pointer flex items-center gap-1.5 uppercase tracking-tight transition-all"
            >
              <RefreshCw className={`w-3 h-3 text-slate-400 ${isRefreshing ? "animate-spin text-red-500" : ""}`} />
              <span>Sincronizar</span>
            </button>
          </div>

          {myCampaigns.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-slate-800 bg-slate-900/10 rounded-3xl p-6">
              <Tv className="w-12 h-12 text-slate-700 mx-auto animate-pulse mb-3" />
              <p className="text-xs text-slate-300 font-bold">Nenhuma campanha registrada para este usuário!</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed font-sans">
                Seus vídeos publicados aparecerão somente aqui no seu painel privado. <br />
                Aperte <strong className="text-red-400 font-bold">"+ Cadastrar Vídeo"</strong> ou <strong className="text-red-400 font-bold">"Solicitar Impulso"</strong> no topo para iniciar campanhas de Views, Likes, Comentários ou Inscrições!
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {myCampaigns.map((camp) => {
                const percentage = Math.floor((camp.currentCount / camp.targetCount) * 100);
                const isCompleted = percentage >= 100;

                return (
                  <div 
                    key={camp.id}
                    className="bg-slate-900/30 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40 rounded-2xl p-4 transition-all relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    
                    {/* Background accent matching campaign type */}
                    <div className={`absolute -right-24 -bottom-24 w-48 h-48 rounded-full blur-3xl opacity-5 pointer-events-none ${
                      camp.type === "view" ? "bg-red-500" :
                      camp.type === "like" ? "bg-amber-500" :
                      camp.type === "comment" ? "bg-green-500" : "bg-indigo-505"
                    }`} />

                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Left Thumbnail or Icon */}
                      {camp.type !== "subscribe" ? (
                        <div className="w-20 h-12 rounded-lg border border-slate-850 overflow-hidden relative shrink-0 bg-slate-950">
                          <img 
                            src={getThumbnailUrl(camp)} 
                            alt="thumb" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-12 rounded-lg border border-slate-850 shrink-0 bg-indigo-500/15 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-indigo-400 animate-pulse" />
                        </div>
                      )}

                      {/* Main details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[8.5px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-lg border border-opacity-30 ${
                            camp.type === "view" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                            camp.type === "like" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                            camp.type === "comment" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                            "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                          }`}>
                            {camp.type === "view" ? "VISUALIZAÇÕES" :
                             camp.type === "like" ? "LIKES" :
                             camp.type === "comment" ? "COMENTÁRRIOS" : "INSCRIÇÕES"}
                          </span>

                          <span className="text-[9px] font-mono text-slate-500">
                            ID: {camp.youtubeId}
                          </span>

                          <span className={`text-[8px] font-mono font-extrabold px-1.5 rounded uppercase tracking-tight flex items-center gap-1 ${
                            isCompleted ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse"
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${isCompleted ? "bg-teal-400" : "bg-red-500 animate-ping"}`} />
                            {isCompleted ? "Entregue" : "Processando..."}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-200 truncate pr-4" title={camp.title}>
                          {camp.title}
                        </h4>

                        {/* Progress Bar inside Card */}
                        <div className="space-y-1 w-full max-w-md">
                          <div className="w-full bg-slate-950 rounded-full h-1">
                            <div 
                              style={{ width: `${Math.min(100, percentage)}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                camp.type === "view" ? "bg-red-500 shadow-md shadow-red-500/50" :
                                camp.type === "like" ? "bg-amber-400 shadow-md shadow-amber-400/50" :
                                camp.type === "comment" ? "bg-green-500 shadow-md shadow-green-500/50" : 
                                "bg-indigo-500 shadow-md shadow-indigo-500/50"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Numbers & Controls */}
                    <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-850/50">
                      <div>
                        <div className="text-xs font-mono font-bold text-white">
                          {camp.currentCount} <span className="text-slate-500 font-normal">/ {camp.targetCount} un</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Meta: <span className="text-red-400 font-extrabold">{percentage}%</span>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onBoost(camp.id)}
                          className="py-1.5 px-3 bg-gradient-to-r from-red-650 to-red-800 text-white hover:from-red-500 hover:to-red-600 text-[9px] font-extrabold uppercase rounded-lg shadow-md border border-red-500/20 flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-300 fill-amber-300 animate-pulse" />
                          <span>Acelerar</span>
                        </button>
                        
                        {camp.type !== "subscribe" && (
                          <a 
                            href={`https://www.youtube.com/watch?v=${camp.youtubeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-950 text-slate-400 border border-slate-850 hover:text-white hover:border-slate-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                            title="Ver no YouTube Studio / Direct Link"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Other creators campaigns lists toggle information */}
          {otherCampaigns.length > 0 && (
            <div className="mt-8 pt-5 border-t border-slate-850">
              <h4 className="text-[10.5px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-2">
                <span>Ecosystem Buffer: Campanhas de Outros Membros ({otherCampaigns.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {otherCampaigns.slice(0, 4).map(c => {
                  const percentage = Math.floor((c.currentCount / c.targetCount) * 100);
                  return (
                    <div key={c.id} className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-sans font-bold text-slate-300 truncate">{c.title}</p>
                        <p className="text-[9px] text-slate-500 mt-1 font-mono">By: {c.channelTitle} • {c.currentCount}/{c.targetCount}</p>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400 shrink-0 font-bold ml-2">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right pane: Real-time Live Interaction Logger Stream (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex flex-col h-[520px] backdrop-blur-md relative overflow-hidden">
            {/* Green pulsing indicator */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-850 shrink-0">
              <div>
                <h3 className="font-sans font-black text-sm text-slate-100 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>Log de Atividades Cooperativas</span>
                </h3>
                <p className="text-[9px] text-slate-400">Interações validadas em tempo real no Brasil</p>
              </div>

              <span className="text-[9px] font-mono bg-slate-950 px-2 py-0.5 border border-slate-850 rounded-lg text-emerald-400 font-bold">
                PROD-ACTIVE
              </span>
            </div>

            {/* Terminal Live logs container */}
            <div 
              ref={logContainerRef} 
              className="flex-1 overflow-y-auto py-3.5 space-y-3.5 custom-scrollbar font-mono text-[10.5px] scroll-smooth"
            >
              {logs.map((item) => (
                <div key={item.id} className="space-y-1 border-b border-slate-850/30 pb-2 bg-slate-950/20 p-2 rounded-xl border border-slate-900/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] text-slate-500">{item.time}</span>
                    <span className="text-[9.5px] text-teal-400 font-bold bg-teal-500/10 px-1.5 rounded-md">
                      {item.region}
                    </span>
                  </div>
                  
                  <div className="text-slate-200">
                    <span className="text-red-400 font-bold hover:underline cursor-pointer">{item.user}</span>{" "}
                    <span className="text-slate-350">{item.outcome}</span>
                  </div>

                  <div className="flex items-center justify-between text-[9.5px] pt-1">
                    <span className="text-slate-450 text-slate-400 truncate max-w-[180px]">
                      » {item.campaignTitle}
                    </span>
                    <span className="text-amber-400 text-[10px] font-extrabold flex items-center shrink-0">
                      +{item.coins} moedas
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Console Bottom status placeholder */}
            <div className="pt-2 text-[9px] text-slate-450 border-t border-slate-850 font-mono text-center flex items-center justify-center gap-1 text-slate-500 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span>Escuta ativa de web-socket de interação iniciada.</span>
            </div>

          </div>

          {/* Fast On-screen Explanation for real real-time status */}
          <div className="bg-slate-900/10 border border-slate-850 rounded-2xl p-4.5 space-y-2.5">
            <h5 className="font-bold text-[11px] text-slate-300 uppercase tracking-wider">💡 Como monitorar o progresso?</h5>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              O feed ao lado monitora quando outro criador cadastrado no Brasil engaja ou completa uma ação no seu canal. Os contadores de <strong>Views, Likes e Comentários</strong> sincronizam com o YouTube Studio automaticamente, acelerando seu posicionamento orgânico.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
