import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Tv,
  ThumbsUp,
  MessageSquare,
  Users,
  Bell,
  Coins,
  PlusCircle,
  HelpCircle,
  Sparkles,
  Search,
  CheckCircle,
  ArrowUpRight,
  LogOut,
  X,
  Star,
  Zap,
  Activity,
  ExternalLink,
  Gift,
  Sun,
  Moon,
  Shield,
  MessageCircle,
  Edit3,
  Pin,
  Play,
  RefreshCw,
  Cloud,
  Database,
  ArrowLeft,
  Phone,
  Lock,
  User,
  Mail,
} from "lucide-react";
import { Campaign, GlobalStats } from "./types";
import DashboardStats from "./components/DashboardStats";
import LiveChat from "./components/LiveChat";
import CreateCampaignModal from "./components/CreateCampaignModal";
import EditCampaignModal from "./components/EditCampaignModal";
import YouTubeTaskPlayer from "./components/YouTubeTaskPlayer";
import ProgressDashboard from "./components/ProgressDashboard";
import InteractiveTour from "./components/InteractiveTour";
import BuyCoinsDashboard from "./components/BuyCoinsDashboard";
import AdminReports from "./components/AdminReports";

export function getThumbnailUrl(camp: Campaign): string {
  const isChannelSubscribe = camp.youtubeId === "Pagamentofacil" || camp.youtubeId.startsWith("UC");
  const videoId = isChannelSubscribe ? "gBw4gqJo_tU" : camp.youtubeId;
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

const isUserAdmin = (email: string | undefined | null): boolean => {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  const digits = clean.replace(/\D/g, "");
  return clean === "cpdatividades@gmail.com" || clean === "admin@gmail.com" || digits === "81985702243";
};

export default function App() {
  const [userEmail, setUserEmail] = useState("");
  const [userCredits, setUserCredits] = useState(1500); // 1500 Welcome Gift moedas

  const [lastDailyRenewal, setLastDailyRenewal] = useState<number>(() => {
    const saved = localStorage.getItem("yt_last_daily_renewal");
    return saved ? parseInt(saved) : 0;
  });
  const [timeToNextRenewal, setTimeToNextRenewal] = useState("");
  const [renewalProgress, setRenewalProgress] = useState(100);

  useEffect(() => {
    const updateTimer = () => {
      if (!lastDailyRenewal) {
        setTimeToNextRenewal("Disponível");
        setRenewalProgress(100);
        return;
      }
      const diff = Date.now() - lastDailyRenewal;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (diff >= twentyFourHours) {
        setTimeToNextRenewal("Disponível");
        setRenewalProgress(100);
      } else {
        const remaining = twentyFourHours - diff;
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
        
        setTimeToNextRenewal(`${hours}h ${minutes}m ${seconds}s`);
        setRenewalProgress((diff / twentyFourHours) * 100);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastDailyRenewal]);

  const claimDailyRenewal = () => {
    const diff = Date.now() - lastDailyRenewal;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (lastDailyRenewal && diff < twentyFourHours) return; // on cooldown
    
    const now = Date.now();
    setLastDailyRenewal(now);
    localStorage.setItem("yt_last_daily_renewal", now.toString());
    handleUpdateCredits(userCredits + 500);
    triggerCoinEarnedAnimation(500);
  };

  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ text: string; type: string }>({ text: "", type: "" });

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/admin/sync-status");
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error("Erro ao obter status de sincronização:", err);
    }
  };

  const handleForceSync = async () => {
    setLoadingSync(true);
    setSyncMsg({ text: "", type: "" });
    try {
      const res = await fetch("/api/admin/sync-force", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg({ text: data.message || "Sincronização completa de envio realizada!", type: "success" });
        fetchSyncStatus();
      } else {
        setSyncMsg({ text: data.error || "Falha ao forçar envio.", type: "error" });
      }
    } catch (err: any) {
      setSyncMsg({ text: "Erro ao conectar com o servidor.", type: "error" });
    } finally {
      setLoadingSync(false);
    }
  };

  const handleForceRestore = async () => {
    if (!window.confirm("Atenção: carregar os dados da nuvem irá sobrescrever quaisquer dados em cache local atuais nesta sessão do servidor. Deseja continuar?")) {
      return;
    }
    setLoadingSync(true);
    setSyncMsg({ text: "", type: "" });
    try {
      const res = await fetch("/api/admin/sync-restore", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg({ text: data.message || "Restauração completa executada!", type: "success" });
        fetchSyncStatus();
        fetchAdminReports();
        fetchAdminPayments();
      } else {
        setSyncMsg({ text: data.error || "Falha ao forçar restauração.", type: "error" });
      }
    } catch (err: any) {
      setSyncMsg({ text: "Erro ao conectar com o servidor.", type: "error" });
    } finally {
      setLoadingSync(false);
    }
  };

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pinnedChannels, setPinnedChannels] = useState<{ url: string; name: string; avatarUrl: string; }[]>([]);
  const [newPinnedChannelInput, setNewPinnedChannelInput] = useState("");
  const [pinnedChannelCustomName, setPinnedChannelCustomName] = useState("");
  const [pinnedChannelCustomAvatar, setPinnedChannelCustomAvatar] = useState("");
  const [editingChannelUrl, setEditingChannelUrl] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState("");
  const [editChannelAvatar, setEditChannelAvatar] = useState("");
  const [editChannelLoading, setEditChannelLoading] = useState(false);
  const [pinChannelLoading, setPinChannelLoading] = useState(false);

  // States for adding partner channel videos explicitly
  const [partnerVideoUrl, setPartnerVideoUrl] = useState("");
  const [partnerVideoTitle, setPartnerVideoTitle] = useState("");
  const [partnerVideoChannelTitle, setPartnerVideoChannelTitle] = useState("");
  const [partnerVideoType, setPartnerVideoType] = useState<"view" | "like" | "comment" | "subscribe">("view");
  const [partnerVideoTarget, setPartnerVideoTarget] = useState<number>(30);
  const [partnerVideoPositionIndex, setPartnerVideoPositionIndex] = useState<string>("");
  const [partnerVideoLoading, setPartnerVideoLoading] = useState(false);
  const [partnerVideoError, setPartnerVideoError] = useState<string | null>(null);
  const [partnerVideoSuccess, setPartnerVideoSuccess] = useState<string | null>(null);
  const [partnerVideoFetching, setPartnerVideoFetching] = useState(false);
  const [partnerVideoSelectedChannel, setPartnerVideoSelectedChannel] = useState("");
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalViewsGenerated: 75402,
    totalLikesDropped: 31206,
    totalCommentsCreated: 18450,
    totalSubscriptionsCompleted: 12590,
    totalActiveMembers: 974,
  });

  // UI state controllers
  const [activeTab, setActiveTab] = useState<"all" | "view" | "like" | "comment" | "subscribe" | "admin" | "progress" | "buy-coins" | "referral" | "tarefas">("all");
  const [dailyCompletedCount, setDailyCompletedCount] = useState(0);
  const [isOutOfCreditsModalOpen, setIsOutOfCreditsModalOpen] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<"all" | "view" | "like" | "comment" | "subscribe">("all");
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Campaign | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingEmail, setOnboardingEmail] = useState("");
  const [onboardingPassword, setOnboardingPassword] = useState("");
  const [isAdminFormActive, setIsAdminFormActive] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  
  // Embedded Community Task Form States
  const [taskFormUrl, setTaskFormUrl] = useState("");
  const [taskFormType, setTaskFormType] = useState<"view" | "like" | "comment" | "subscribe">("view");
  const [taskFormTitle, setTaskFormTitle] = useState("");
  const [taskFormChannelTitle, setTaskFormChannelTitle] = useState("");
  const [taskFormTarget, setTaskFormTarget] = useState<number>(30);
  const [taskFormIsLoading, setTaskFormIsLoading] = useState(false);
  const [taskFormCheckingUrl, setTaskFormCheckingUrl] = useState(false);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [taskFormSuccess, setTaskFormSuccess] = useState<string | null>(null);

  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationMsg, setVerificationMsg] = useState("");
  const [googleLoginLoading, setGoogleLoginLoading] = useState(false);
  const [showGoogleCredentialsHelp, setShowGoogleCredentialsHelp] = useState(false);
  const [simulationEmailInput, setSimulationEmailInput] = useState("");
  const [activeSimulationTab, setActiveSimulationTab] = useState<"sandbox" | "production">("sandbox");
  const [sandboxLoginStep, setSandboxLoginStep] = useState<"idle" | "connecting" | "authorizing" | "success">("idle");
  const [tourOpen, setTourOpen] = useState(false);

  // Phone/Password Auth state variables
  const [phoneAuthTab, setPhoneAuthTab] = useState<"google" | "phone">("phone");
  const [phoneAuthMode, setPhoneAuthMode] = useState<"login" | "register">("login");
  const [phoneInput, setPhoneInput] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [phoneAuthLoading, setPhoneAuthLoading] = useState(false);
  const [phoneVerificationCodeSent, setPhoneVerificationCodeSent] = useState(false);
  const [phoneVerificationCodeInput, setPhoneVerificationCodeInput] = useState("");
  const [mockSmsBannerValue, setMockSmsBannerValue] = useState<string | null>(null);

  // Theme state controller (Light/Dark Mode)
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    return localStorage.getItem("yt_theme") === "light";
  });

  // Sync the theme with body tag and document root
  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add("light-mode");
      localStorage.setItem("yt_theme", "light");
    } else {
      document.body.classList.remove("light-mode");
      localStorage.setItem("yt_theme", "dark");
    }
  }, [isLightMode]);

  // Admin and Channel Link Status Variables
  const [isAdminSyncing, setIsAdminSyncing] = useState(false);
  const [adminStatusMsg, setAdminStatusMsg] = useState("");
  const [adminPayments, setAdminPayments] = useState<any[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<any[]>([]);
  const [paymentActionLoadingId, setPaymentActionLoadingId] = useState<string | null>(null);
  const [adminReports, setAdminReports] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [coinsReceivedModal, setCoinsReceivedModal] = useState<{ isOpen: boolean; coins: number; isGift: boolean; packageName?: string } | null>(null);

  // Active real-time notifications (floating popups) and sound controller
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    return localStorage.getItem("yt_admin_sound") !== "false";
  });
  const firstPaymentLoadRef = React.useRef(true);
  const knownPaymentIdsRef = React.useRef<Set<string>>(new Set());

  // Dynamic chime synthesizer via HTML5 Web Audio API
  const playChimeSound = () => {
    if (!localStorage.getItem("yt_admin_sound") || localStorage.getItem("yt_admin_sound") !== "false") {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // Ensure browser allows audio decoding
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        // Arpeggio sound: D5, F#5, A5, D6
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); 
        osc.frequency.setValueAtTime(740.0, ctx.currentTime + 0.1);  
        osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.2); 
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.3); 
        
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.61);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.61);
      } catch (err) {
        console.error("Audio dynamic synth error:", err);
      }
    }
  };

  const handleDismissNotification = (id: string) => {
    setRecentNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAdminAddPinnedChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserAdmin(userEmail)) {
      alert("Apenas o administrador do sistema pode gerenciar canais parceiros.");
      return;
    }
    const inputVal = newPinnedChannelInput.trim();
    if (!inputVal) return;

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputVal);
    if (isEmail) {
      alert("Por favor, insira a URL do Canal do YouTube (Ex: https://www.youtube.com/@CanalExemplo) e não um endereço de e-mail.");
      return;
    }

    setPinChannelLoading(true);
    try {
      const res = await fetch("/api/admin/pinned-channels/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: inputVal,
          adminEmail: userEmail,
          name: pinnedChannelCustomName,
          avatarUrl: pinnedChannelCustomAvatar
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPinnedChannels(data.pinnedChannels);
        setNewPinnedChannelInput("");
        setPinnedChannelCustomName("");
        setPinnedChannelCustomAvatar("");
        await fetchCampaigns();
      } else {
        alert(data.error || "Erro ao fixar canal.");
      }
    } catch (err) {
      console.error("Error adding pinned channel:", err);
    } finally {
      setPinChannelLoading(false);
    }
  };

  const handleAdminEditPinnedChannel = async (channelUrl: string) => {
    if (!isUserAdmin(userEmail)) {
      alert("Apenas o administrador do sistema pode gerenciar canais parceiros.");
      return;
    }
    setEditChannelLoading(true);
    try {
      const res = await fetch("/api/admin/pinned-channels/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelUrl,
          name: editChannelName,
          avatarUrl: editChannelAvatar,
          adminEmail: userEmail
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPinnedChannels(data.pinnedChannels);
        setEditingChannelUrl(null);
        setEditChannelName("");
        setEditChannelAvatar("");
        await fetchCampaigns();
      } else {
        alert(data.error || "Erro ao editar canal fixado.");
      }
    } catch (err) {
      console.error("Error editing pinned channel:", err);
    } finally {
      setEditChannelLoading(false);
    }
  };

  const handleAdminRemovePinnedChannel = async (channelName: string) => {
    if (!isUserAdmin(userEmail)) {
      alert("Apenas o administrador do sistema pode gerenciar canais parceiros.");
      return;
    }
    try {
      const res = await fetch("/api/admin/pinned-channels/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channelName, adminEmail: userEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPinnedChannels(data.pinnedChannels);
        await fetchCampaigns();
      } else {
        alert(data.error || "Erro ao remover canal fixado.");
      }
    } catch (err) {
      console.error("Error removing pinned channel:", err);
    }
  };

  const parseYouTubeVideoOrChannelId = (input: string): { id: string; isChannel: boolean } | null => {
    const trimmed = input.trim();
    if (trimmed.includes("/channel/") || trimmed.includes("/c/") || trimmed.includes("/@") || trimmed.startsWith("UC")) {
      if (trimmed.startsWith("UC")) return { id: trimmed, isChannel: true };
      const parts = trimmed.split("/");
      const lastPart = parts[parts.length - 1] || "";
      if (lastPart) return { id: lastPart, isChannel: true };
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

  const handleFetchPartnerVideoInfo = async (urlInput: string) => {
    if (!urlInput.trim()) return;
    setPartnerVideoFetching(true);
    setPartnerVideoError(null);
    setPartnerVideoSuccess(null);
    try {
      const res = await fetch(`/api/youtube/info?url=${encodeURIComponent(urlInput.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPartnerVideoTitle(data.title || "");
          setPartnerVideoChannelTitle(data.channelTitle || "");
          
          if (data.channelTitle && pinnedChannels && pinnedChannels.length > 0) {
            const matched = pinnedChannels.find(pc => 
              pc.name.toLowerCase() === data.channelTitle.toLowerCase() ||
              (pc.url && pc.url.toLowerCase().includes(data.channelTitle.toLowerCase().replace(/\s+/g, "")))
            );
            if (matched) {
              setPartnerVideoSelectedChannel(matched.url);
            }
          }
        } else {
          setPartnerVideoError("A auto-busca falhou. Digite os dados abaixo manualmente.");
        }
      } else {
        setPartnerVideoError("Preenchimento rápido falhou. Digite os dados abaixo manualmente.");
      }
    } catch (err) {
      console.error(err);
      setPartnerVideoError("Erro de conexão. Digite os dados abaixo manualmente.");
    } finally {
      setPartnerVideoFetching(false);
    }
  };

  const handleAddPartnerChannelVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerVideoError(null);
    setPartnerVideoSuccess(null);

    const inputUrl = partnerVideoUrl.trim();
    if (!inputUrl) {
      setPartnerVideoError("Por favor, insira o link do YouTube!");
      return;
    }
    if (!partnerVideoTitle.trim()) {
      setPartnerVideoError("Por favor, insira o título!");
      return;
    }
    if (!partnerVideoChannelTitle.trim()) {
      setPartnerVideoError("Por favor, insira o canal parceiro!");
      return;
    }

    const parsed = parseYouTubeVideoOrChannelId(inputUrl);
    if (!parsed) {
      setPartnerVideoError("Link inválido! Use URL de vídeo ou de canal correspondente.");
      return;
    }

    if (partnerVideoType === "subscribe" && !parsed.isChannel) {
      setPartnerVideoError("Para Inscrição, use o link do CANAL.");
      return;
    }
    if (partnerVideoType !== "subscribe" && parsed.isChannel) {
      setPartnerVideoError("Para visualização/likes/comentários, use o link de um VÍDEO.");
      return;
    }

    setPartnerVideoLoading(true);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: partnerVideoType,
          title: partnerVideoTitle,
          youtubeId: parsed.id,
          channelTitle: partnerVideoChannelTitle,
          targetCount: partnerVideoTarget,
          userEmail: "81985702243", 
          isPinned: true,
          isPartnerChannel: true,
          positionIndex: partnerVideoPositionIndex.trim() !== "" ? Number(partnerVideoPositionIndex) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPartnerVideoSuccess(`Vídeo/Tarefa adicionado(a) com sucesso para o canal "${partnerVideoChannelTitle}"!`);
        setPartnerVideoUrl("");
        setPartnerVideoTitle("");
        setPartnerVideoChannelTitle("");
        setPartnerVideoPositionIndex("");
        setPartnerVideoSelectedChannel("");
        setPartnerVideoTarget(30);
        await fetchCampaigns();
      } else {
        setPartnerVideoError(data.error || "Erro ao adicionar a tarefa.");
      }
    } catch (err) {
      console.error(err);
      setPartnerVideoError("Erro de rede.");
    } finally {
      setPartnerVideoLoading(false);
    }
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPinnedChannelCustomAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditChannelAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchAdminReports = async () => {
    setLoadingReports(true);
    fetchSyncStatus(); // Carrega o status de sincronização automática com o Firestore
    try {
      const res = await fetch("/api/admin/reports");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.success) {
            setAdminReports(data);
          }
        } else {
          console.warn("Retrying Admin Reports sync: Received non-JSON response from server.");
        }
      }
    } catch (err) {
      console.warn("Erro ao puxar relatórios do admin:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchAdminPayments = async () => {
    try {
      const res = await fetch("/api/payments");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.success) {
            setAdminPayments(data.payments);
            if (data.auditLogs) {
              setAdminAuditLogs(data.auditLogs);
            }

            // Real-time detection of new payments!
            const incomingPayments = data.payments || [];
            if (incomingPayments.length > 0) {
              if (firstPaymentLoadRef.current) {
                // Initialize known IDs so we don't spam notifications for old records on first session load
                const initialSet = new Set<string>();
                incomingPayments.forEach((p: any) => initialSet.add(p.id));
                knownPaymentIdsRef.current = initialSet;
                firstPaymentLoadRef.current = false;
              } else {
                // Compare and identify newly added payments
                const brandNewPayments: any[] = [];
                incomingPayments.forEach((p: any) => {
                  if (!knownPaymentIdsRef.current.has(p.id)) {
                    brandNewPayments.push(p);
                    knownPaymentIdsRef.current.add(p.id);
                  }
                });

                if (brandNewPayments.length > 0) {
                  // We found new payments!
                  // Add to notification popups state
                  setRecentNotifications((prev) => [...brandNewPayments, ...prev]);
                  // Play notification sound chime!
                  playChimeSound();
                  
                  // Add a dynamic alert banner message
                  setAdminStatusMsg(`⚡ Alerta: recebemos novo(s) pedido(s) de moedas!`);
                }
              }
            }
          }
        } else {
          console.warn("Retrying Admin Payments sync: Received non-JSON response from server.");
        }
      }
    } catch (err) {
      console.warn("Erro ao puxar fila de pagamentos:", err);
    }
  };

  const handleAdminApprovePayment = async (id: string) => {
    setPaymentActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/payments/approve/${id}`, { method: "POST" });
      if (res.ok) {
        setAdminStatusMsg("Excelente! Pagamento Homologado e saldo enviado para a tela do usuário de forma automática.");
        fetchAdminPayments();
        fetchCampaigns();
        fetchAdminReports();
      } else {
        setAdminStatusMsg("Falha ao homologar o pagamento.");
      }
    } catch (err) {
      console.error(err);
      setAdminStatusMsg("Erro de rede ao homologar.");
    } finally {
      setPaymentActionLoadingId(null);
      setTimeout(() => setAdminStatusMsg(""), 5000);
    }
  };

  const handleAdminRejectPayment = async (id: string) => {
    setPaymentActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/payments/reject/${id}`, { method: "POST" });
      if (res.ok) {
        setAdminStatusMsg("Pagamento recusado e sinalizado no banco.");
        fetchAdminPayments();
        fetchAdminReports();
      } else {
        setAdminStatusMsg("Falha ao recusar o pagamento.");
      }
    } catch (err) {
      console.error(err);
      setAdminStatusMsg("Erro de rede ao recusar.");
    } finally {
      setPaymentActionLoadingId(null);
      setTimeout(() => setAdminStatusMsg(""), 5000);
    }
  };

  // Check for approved payments and automatically award coins in real-time
  const checkForApprovedPayments = async (email: string) => {
    if (!email || isUserAdmin(email)) return;
    try {
      const res = await fetch(`/api/payments/check-approved?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.success && data.payments && data.payments.length > 0) {
            let coinsToAward = 0;
            let isGift = false;
            let detectedPackageName = "";

            for (const payment of data.payments) {
              // Claim on server
              await fetch("/api/payments/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: payment.id }),
              });
              coinsToAward += payment.coins;
              if (payment.paymentMethod === "ADM GIFT" || (payment.packageName && (payment.packageName.toLowerCase().includes("suporte") || payment.packageName.toLowerCase().includes("bônus") || payment.packageName.toLowerCase().includes("envio")))) {
                isGift = true;
              }
              if (payment.packageName) {
                detectedPackageName = payment.packageName;
              }
            }

            if (coinsToAward > 0) {
              // Increment the balance!
              const oldCredits = parseInt(localStorage.getItem("yt_boost_credits") || "0") || userCredits;
              const newCreds = oldCredits + coinsToAward;
              handleUpdateCredits(newCreds);
              triggerCoinEarnedAnimation(coinsToAward);
              
              // Pop up the gorgeous new custom celebration modal
              setCoinsReceivedModal({
                isOpen: true,
                coins: coinsToAward,
                isGift: isGift,
                packageName: detectedPackageName || "Crédito Direto do ADM"
              });
            }
          }
        } else {
          console.warn("Retrying Check Approved Payments: Received non-JSON response from server.");
        }
      }
    } catch (err) {
      console.warn("Erro ao conferir e validar depósito manual", err);
    }
  };

  const handleAdminSyncChannel = async () => {
    setIsAdminSyncing(true);
    setAdminStatusMsg("");
    try {
      const res = await fetch("/api/admin/sync-channel", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAdminStatusMsg(`Canal Conectado! ${data.addedCount} novos vídeos do @Pagamentofacil vinculados.`);
        triggerCoinEarnedAnimation(100);
        fetchCampaigns();
        fetchAdminReports();
      } else {
        setAdminStatusMsg("Falha ao sincronizar vídeos do canal.");
      }
    } catch (err) {
      console.error(err);
      setAdminStatusMsg("Erro de rede ao conectar com as APIs do YouTube.");
    } finally {
      setIsAdminSyncing(false);
      setTimeout(() => setAdminStatusMsg(""), 5000);
    }
  };

  const handleAdminBoostCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/boost-campaign/${id}`, { method: "POST" });
      if (res.ok) {
        setAdminStatusMsg("Super Impulso Aplicado! Meta do vídeo estendida em +500.");
        fetchCampaigns();
        triggerCoinEarnedAnimation(50);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setAdminStatusMsg(""), 5050);
    }
  };

  const handleAcelerarCampaign = async (id: string) => {
    const isAdmin = isUserAdmin(userEmail);
    if (isAdmin) {
      return handleAdminBoostCampaign(id);
    }

    const cooldownKey = `boost_cooldown_${id}`;
    const lastBoost = localStorage.getItem(cooldownKey);
    const now = Date.now();
    const FOUR_HOURS = 4 * 60 * 60 * 1000;

    if (lastBoost) {
      const lastTime = parseInt(lastBoost, 10);
      if (now - lastTime < FOUR_HOURS) {
        const remaining = FOUR_HOURS - (now - lastTime);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        alert(`Aguarde o tempo de recarga! Você poderá acelerar esta campanha novamente em ${hours}h ${minutes}m ${seconds}s.`);
        return;
      }
    }

    if (userCredits < 15) {
      alert("Moedas insuficientes! Você precisa de 15 moedas para acelerar. Redirecionando para compra de moedas...");
      setActiveTab("buy-coins");
      setActiveTask(null);
      setIsOutOfCreditsModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${id}/boost-user`, { method: "POST" });
      if (res.ok) {
        const newCredits = Math.max(0, userCredits - 15);
        handleUpdateCredits(newCredits);
        localStorage.setItem(cooldownKey, now.toString());
        triggerCoinEarnedAnimation(15, "spend");
        alert("Campanha acelerada com sucesso! Você utilizou 15 moedas e ela subiu para o topo do feed de tarefas prioritárias.");
        fetchCampaigns();
      } else {
        alert("Erro ao acelerar a campanha. Tente novamente.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao tentar acelerar.");
    }
  };

  const handleMoveCampaignOrder = async (campId: string, direction: "up" | "down") => {
    // Determine the relevant category list as shown to the admin to maintain proper index flow
    const sortedList = [...campaigns]
      .filter((c) => (adminActiveTab === "all" || c.type === adminActiveTab))
      .sort((a, b) => {
        const pinA = a.isPinned ? 1 : 0;
        const pinB = b.isPinned ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;

        const indexA = a.positionIndex !== undefined && a.positionIndex !== null ? a.positionIndex : Infinity;
        const indexB = b.positionIndex !== undefined && b.positionIndex !== null ? b.positionIndex : Infinity;
        if (indexA !== indexB) return indexA - indexB;

        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

    const currentIndex = sortedList.findIndex(c => c.id === campId);
    if (currentIndex === -1) return;

    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sortedList.length - 1) return;

    const swapWithIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentItem = sortedList[currentIndex];
    const swapItem = sortedList[swapWithIndex];

    try {
      // Direct updates using sequential indices index * 10
      await Promise.all([
        fetch(`/api/admin/campaigns/${currentItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positionIndex: swapWithIndex * 10 })
        }),
        fetch(`/api/admin/campaigns/${swapItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positionIndex: currentIndex * 10 })
        })
      ]);
      fetchCampaigns();
    } catch (err) {
      console.error("Erro ao reordenar campanhas:", err);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdminDeleteCampaign = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Immediate confirmation/loading state
    setDeletingId(id);

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAdminStatusMsg("Vídeo removido das listagens cooperadas.");
        fetchCampaigns();
        fetchAdminReports();
      } else {
        console.error("Failed to delete campaign");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
      setTimeout(() => setAdminStatusMsg(""), 4000);
    }
  };

  const handleTaskFormCheckUrl = async () => {
    if (!taskFormUrl.trim()) return;
    setTaskFormCheckingUrl(true);
    setTaskFormError(null);
    setTaskFormSuccess(null);
    try {
      const isChannel = taskFormUrl.includes("/channel/") || taskFormUrl.includes("/c/") || taskFormUrl.includes("@") || taskFormUrl.includes("youtube.com/user/");
      const queryType = isChannel ? "channel" : "video";
      const fetchUrl = `/api/youtube/info?url=${encodeURIComponent(taskFormUrl)}&type=${queryType}`;
      
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const data = await res.json();
        setTaskFormTitle(data.title || "Vídeo do YouTube");
        setTaskFormChannelTitle(data.channelTitle || data.title || "Canal YouTube");
        setTaskFormSuccess("Link verificado com sucesso!");
      } else {
        const errData = await res.json().catch(() => ({}));
        setTaskFormError(errData.error || "Não foi possível verificar esse link do YouTube. Insira as informações manualmente abaixo.");
      }
    } catch (err) {
      console.error(err);
      setTaskFormError("Erro ao conectar ao servidor para verificar.");
    } finally {
      setTaskFormCheckingUrl(false);
    }
  };

  const handleTaskFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError(null);
    setTaskFormSuccess(null);

    if (!taskFormUrl.trim()) {
      setTaskFormError("Por favor, insira o link do vídeo ou canal.");
      return;
    }

    const parsed = parseYouTubeVideoOrChannelId(taskFormUrl);
    const resolvedYoutubeId = parsed ? parsed.id : "";

    // Determine cost per action based on task type
    const coinConfig = {
      view: 30,
      like: 10,
      comment: 20,
      subscribe: 25,
    };
    const costPerAction = coinConfig[taskFormType];
    const totalCost = costPerAction * taskFormTarget;

    // Check if user has enough coins
    const isAdmin = isUserAdmin(userEmail);
    if (!isAdmin && userCredits < totalCost) {
      setTaskFormError(`Moedas insuficientes! Esta tarefa custará ${totalCost} moedas, mas você tem apenas ${userCredits} moedas. Redirecionando para compra de moedas...`);
      setTimeout(() => {
        setActiveTab("buy-coins");
        setActiveTask(null);
        setIsOutOfCreditsModalOpen(true);
      }, 1500);
      return;
    }

    setTaskFormIsLoading(true);

    let finalTitle = taskFormTitle.trim();
    let finalChannelTitle = taskFormChannelTitle.trim();

    // If titles are missing, perform quick automatic under-the-hood lookup
    if (!finalTitle || !finalChannelTitle) {
      try {
        const isChannel = taskFormUrl.includes("/channel/") || taskFormUrl.includes("/c/") || taskFormUrl.includes("@") || taskFormUrl.includes("youtube.com/user/");
        const queryType = isChannel ? "channel" : "video";
        const fetchUrl = `/api/youtube/info?url=${encodeURIComponent(taskFormUrl.trim())}&type=${queryType}`;
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const ytData = await res.json();
          if (ytData.title) finalTitle = ytData.title;
          if (ytData.channelTitle) finalChannelTitle = ytData.channelTitle;
        }
      } catch (err) {
        console.error("Auto-fetch on submit lookup failed:", err);
      }
    }

    const defaultTitle = taskFormType === "subscribe" ? "Inscrição de Canal da Comunidade" : "Visualização de Vídeo da Comunidade";
    const defaultChannelTitle = "Canal da Comunidade";

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: taskFormUrl,
          type: taskFormType,
          youtubeId: resolvedYoutubeId,
          title: finalTitle || defaultTitle,
          channelTitle: finalChannelTitle || defaultChannelTitle,
          targetCount: taskFormTarget,
          userEmail: userEmail,
        }),
      });

      if (response.ok) {
        // Deduct coins if not admin
        if (!isAdmin) {
          const newCredits = Math.max(0, userCredits - totalCost);
          handleUpdateCredits(newCredits);
        }

        // Instantly clear form inputs and refresh Cooperative listing index.
        // As requested by the user, we completely skip any persistent confirmation panel inside the form.
        setTaskFormUrl("");
        setTaskFormTitle("");
        setTaskFormChannelTitle("");
        fetchCampaigns();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setTaskFormError(errorData.error || "Erro ao cadastrar sua tarefa. Verifique as informações.");
      }
    } catch (err) {
      console.error(err);
      setTaskFormError("Erro de rede ao salvar a tarefa.");
    } finally {
      setTaskFormIsLoading(false);
    }
  };

  // Coin burst/earned notification
  const [earnedNotification, setEarnedNotification] = useState<{ amount: number; type: "earn" | "spend" } | null>(null);

  // Sync state from server
  const fetchCampaigns = async () => {
    try {
      const savedEmail = localStorage.getItem("yt_boost_email") || userEmail;
      const url = savedEmail ? `/api/campaigns?email=${encodeURIComponent(savedEmail)}` : "/api/campaigns";
      const res = await fetch(url);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.success) {
            setCampaigns(data.campaigns);
            setGlobalStats(data.globalStats);
            if (data.pinnedChannels) {
              setPinnedChannels(data.pinnedChannels);
            }
            if (data.dailyCompletedCount !== undefined) {
              setDailyCompletedCount(data.dailyCompletedCount);
            }
            if (data.userCredits !== undefined && data.userCredits !== null) {
              const activeEmail = savedEmail || userEmail;
              if (activeEmail && !isUserAdmin(activeEmail)) {
                setUserCredits(data.userCredits);
                localStorage.setItem("yt_boost_credits", data.userCredits.toString());
              }
            }
          }
        } else {
          console.warn("Retrying campaign synchronization: Received non-JSON response from server.");
        }
      }
    } catch (err) {
      console.warn("Retrying campaign synchronization (server booting/updating):", err);
    }

    // Live checks for approved payments or admin queue
    const savedEmail = localStorage.getItem("yt_boost_email") || userEmail;
    if (savedEmail) {
      const isAdm = isUserAdmin(savedEmail);
      if (isAdm) {
        fetchAdminPayments();
      } else {
        await checkForApprovedPayments(savedEmail);
      }
    }
  };

  // On mount, load profile and sync (enforcement of manual login on every visit)
  useEffect(() => {
    // Garante login manual todas as vezes que o usuário abrir a aba do site
    localStorage.removeItem("yt_boost_email");
    setUserEmail("");
    setOnboardingOpen(true);

    const savedCredits = localStorage.getItem("yt_boost_credits");
    if (savedCredits) {
      setUserCredits(parseInt(savedCredits));
    } else {
      localStorage.setItem("yt_boost_credits", "1500");
      setUserCredits(1500);
    }

    fetchCampaigns();

    // Poll campaigns/status every 3 seconds to keep client and administrator lists perfectly aligned
    const interval = setInterval(fetchCampaigns, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle Google OAuth postMessage returns from popup window
  useEffect(() => {
    const handleGoogleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Allow preview container URLs or localhost
      if (!origin.endsWith(".run.app") && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
        return;
      }

      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        const { email } = event.data;
        if (email) {
          const emailClean = email.trim().toLowerCase();
          
          if (isUserAdmin(emailClean)) {
            localStorage.setItem("yt_boost_email", emailClean);
            setUserEmail(emailClean);
            setUserCredits(999999999);
            localStorage.setItem("yt_boost_credits", "999999999");
            setOnboardingOpen(false);
          } else {
            localStorage.setItem("yt_boost_email", emailClean);
            setUserEmail(emailClean);
            setOnboardingOpen(false);
            
            syncUserFromDatabase(emailClean);
            
            const hasCompletedTour = localStorage.getItem("yt_tour_completed") === "true";
            if (!hasCompletedTour) {
              setTourOpen(true);
            }
          }

          // Visual celebration and sync
          triggerCoinEarnedAnimation(150);
          fetchCampaigns();
        }
      }
    };

    window.addEventListener("message", handleGoogleMessage);
    return () => window.removeEventListener("message", handleGoogleMessage);
  }, []);

  const handleGoogleLogin = async () => {
    setOnboardingError(null);
    setGoogleLoginLoading(true);
    try {
      const originParam = encodeURIComponent(window.location.origin);
      const res = await fetch(`/api/auth/google/url?origin=${originParam}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Erro ao comunicar com o servidor.`);
      }
      
      const data = await res.json();
      if (data.success && data.url) {
        // Correctly open the OAuth popup window to standard Google Identity IDP
        const width = 500;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          "google_oauth_popup",
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );
        
        if (!popup) {
          setOnboardingError("O bloqueador de popups impediu a janela de login do Google. Ative o recebimento de popups e tente novamente.");
        }
      } else {
        // Applet Google Credentials are not active/configured inside Settings!
        // Show a polished, detailed error message that informs how to add credentials or to use test sandbox
        setOnboardingError(
          "As credenciais de Produção do Google Sign-In não estão configuradas nas variáveis de ambiente. " +
          "Acesse a aba 'Settings' no menu lateral esquerdo do AI Studio e adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET para logins reais. " +
          "Alternativamente, utilize a chave de engrenagem ⚙️ (no topo direito se disponível, ou na aba Sandbox de Teste) para simular o login do Google instantaneamente."
        );
        setShowGoogleCredentialsHelp(true);
      }
    } catch (err: any) {
      console.warn("Falha na autenticação direta do Google:", err);
      setOnboardingError(`Falha na autenticação do Google (Sem Firebase): ${err.message || err}`);
    } finally {
      setGoogleLoginLoading(false);
    }
  };

  const handleSimulateGoogleLogin = (email: string) => {
    const emailClean = (email || "usuario.google@gmail.com").trim().toLowerCase();
    
    // Check if admin is used here - we ask them to use the Admin Login form
    if (isUserAdmin(emailClean)) {
      setOnboardingError("Administrador Identificado! Por segurança, insira a sua senha de administrador diretamente no campo abaixo.");
      setOnboardingEmail("81985702243");
      setShowGoogleCredentialsHelp(false);
      setIsAdminFormActive(false);
      return;
    }

    localStorage.setItem("yt_boost_email", emailClean);
    setUserEmail(emailClean);
    setOnboardingOpen(false);
    setShowGoogleCredentialsHelp(false);

    syncUserFromDatabase(emailClean);
    
    const hasCompletedTour = localStorage.getItem("yt_tour_completed") === "true";
    if (!hasCompletedTour) {
      setTourOpen(true);
    }

    triggerCoinEarnedAnimation(150);
    fetchCampaigns();
  };

  const handleSandboxAccountClick = (email: string) => {
    setSandboxLoginStep("connecting");
    setTimeout(() => {
      setSandboxLoginStep("authorizing");
      setTimeout(() => {
        setSandboxLoginStep("success");
        setTimeout(() => {
          handleSimulateGoogleLogin(email);
          setSandboxLoginStep("idle");
        }, 1100);
      }, 1100);
    }, 900);
  };

  const handleSendVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError(null);
    setPhoneAuthLoading(true);

    if (!phoneInput || !phonePassword || !phoneName) {
      setOnboardingError("Por favor, preencha todos os campos (Nome, Telefone e Senha) para receber o código.");
      setPhoneAuthLoading(false);
      return;
    }

    const digits = phoneInput.replace(/\D/g, "");
    const isValidSize = digits.length === 10 || digits.length === 11 || digits.length === 12 || digits.length === 13;
    if (!isValidSize) {
      setOnboardingError("Telefone inválido! Insira um número com DDD (ex: 81 98570-2243).");
      setPhoneAuthLoading(false);
      return;
    }

    if (phonePassword.length < 6) {
      setOnboardingError("A senha deve conter no mínimo 6 caracteres.");
      setPhoneAuthLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput, name: phoneName, password: phonePassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Erro ao gerar código de verificação.");
      }

      setPhoneVerificationCodeSent(true);
      setMockSmsBannerValue(data.code);
    } catch (err: any) {
      setOnboardingError(err.message || "Erro no envio do código de verificação.");
    } finally {
      setPhoneAuthLoading(false);
    }
  };

  const handlePhoneAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError(null);
    setPhoneAuthLoading(true);

    if (!phoneInput || !phonePassword) {
      setOnboardingError("Por favor, preencha todos os campos.");
      setPhoneAuthLoading(false);
      return;
    }

    if (phoneAuthMode === "register" && !phoneName.trim()) {
      setOnboardingError("Por favor, informe seu nome.");
      setPhoneAuthLoading(false);
      return;
    }

    // Direct email validation on client-side before sending to server
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(phoneInput.trim())) {
      setOnboardingError("E-mail inválido! Por favor, insira um endereço de e-mail válido (ex: carlos@gmail.com).");
      setPhoneAuthLoading(false);
      return;
    }

    if (phonePassword.length < 6) {
      setOnboardingError("A senha deve conter no mínimo 6 caracteres.");
      setPhoneAuthLoading(false);
      return;
    }

    const endpoint = phoneAuthMode === "register"
      ? "/api/auth/email/register"
      : "/api/auth/email/login";

    const body = phoneAuthMode === "register"
      ? { email: phoneInput, password: phonePassword, name: phoneName }
      : { email: phoneInput, password: phonePassword };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "⚠️ O servidor Backend (Node.js/Express) não está respondendo como esperado (recebeu HTML em vez de JSON).\n\n" +
          "💡 Causas prováveis e como corrigir:\n" +
          "1. Se você exportou o site e hospedou em plataformas estáticas (como Vercel, Netlify ou GitHub Pages), estas plataformas NÃO executam o backend em Node.js. Para que o login e o banco de dados funcionem, você precisa hospedar o projeto inteiro em uma plataforma Full-Stack que execute Node.js (como Render.com, Railway, VPS, Cloud Run) ou adaptar para Serverless.\n" +
          "2. Se você estiver rodando localmente (na máquina), certifique-se de executar 'npm install' e depois iniciar o projeto com 'npm run dev' (que roda o arquivo server.ts integrado) em vez de usar apenas 'vite' ou 'npx vite'."
        );
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Erro na autenticação.");
      }

      // Success
      const user = data.user;
      localStorage.setItem("yt_boost_email", user.phone);
      setUserEmail(user.phone);
      setUserCredits(user.credits);
      localStorage.setItem("yt_boost_credits", user.credits.toString());
      localStorage.setItem("yt_boost_name", user.name);

      setOnboardingOpen(false);
      triggerCoinEarnedAnimation(150);
      fetchCampaigns();
    } catch (err: any) {
      setOnboardingError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setPhoneAuthLoading(false);
    }
  };

  const handleAdminFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError(null);

    const emailClean = adminEmail.trim().toLowerCase();
    const cleanDigits = emailClean.replace(/\D/g, "");
    if (emailClean !== "cpdatividades@gmail.com" && emailClean !== "admin@gmail.com" && cleanDigits !== "81985702243" && emailClean !== "81985702243") {
      setOnboardingError("Identificador do Administrador inválido. Apenas o e-mail cpdatividades@gmail.com ou celular do ADM Tiago Alves autorizados podem acessar.");
      return;
    }

    if (adminPassword.trim() !== "92752100") {
      setOnboardingError("Chave de Autenticação / Senha do Administrador incorreta.");
      return;
    }

    // Success! Log in as Administrator
    const finalAdminId = emailClean === "cpdatividades@gmail.com" ? "cpdatividades@gmail.com" : "81985702243";
    localStorage.setItem("yt_boost_email", finalAdminId);
    setUserEmail(finalAdminId);
    setUserCredits(999999999);
    localStorage.setItem("yt_boost_credits", "999999999");
    setOnboardingOpen(false);
    
    // Clear admin form states cleanly
    setAdminEmail("");
    setAdminPassword("");
    
    triggerCoinEarnedAnimation(150);
    fetchCampaigns();
  };

  // Fetch admin payments immediately when activeTab changes to admin or user logs in
  useEffect(() => {
    if (activeTab === "admin" && isUserAdmin(userEmail)) {
      fetchAdminPayments();
      fetchAdminReports();
    }
  }, [activeTab, userEmail]);

  // Retrieve user profile credits from the persistent backend database
  const syncUserFromDatabase = async (email: string) => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    
    if (isUserAdmin(cleanEmail)) {
      setUserCredits(999999999);
      localStorage.setItem("yt_boost_credits", "999999999");
      return;
    }

    try {
      const res = await fetch(`/api/user/profile?email=${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile) {
          const dbCredits = data.profile.credits;
          setUserCredits(dbCredits);
          localStorage.setItem("yt_boost_credits", dbCredits.toString());
          console.log(`[DB LOAD] Carregado saldo de ${dbCredits} moedas para ${cleanEmail} do banco de dados persistente.`);
        } else {
          // If no profile exists on server yet, register current local storage balance or default welcome credits (1500)
          const localCredits = parseInt(localStorage.getItem("yt_boost_credits") || "1500");
          setUserCredits(localCredits);
          localStorage.setItem("yt_boost_credits", localCredits.toString());
          
          // Seed the server database
          fetch("/api/user/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, credits: localCredits }),
          }).catch(err => console.error("Erro ao semear moedas no servidor:", err));
        }
      }
    } catch (err) {
      console.error("Erro ao obter perfil do banco de dados:", err);
      // Fallback to local storage if network fails
      const localCredits = parseInt(localStorage.getItem("yt_boost_credits") || "1500");
      setUserCredits(localCredits);
    }
  };

  // Update credits and save
  const handleUpdateCredits = (newCredits: number, currentEmail?: string) => {
    const activeEmail = currentEmail || userEmail;
    if (activeEmail && isUserAdmin(activeEmail)) {
      setUserCredits(999999999);
      localStorage.setItem("yt_boost_credits", "999999999");
      return;
    }
    setUserCredits(newCredits);
    localStorage.setItem("yt_boost_credits", newCredits.toString());

    if (newCredits <= 0 && activeEmail && !isUserAdmin(activeEmail)) {
      setIsOutOfCreditsModalOpen(true);
    }

    if (activeEmail) {
      fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail, credits: newCredits }),
      }).catch(err => console.error("Erro ao sincronizar moedas com o banco de dados:", err));
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError(null);
    if (!onboardingEmail.trim()) return;

    const emailClean = onboardingEmail.trim().toLowerCase();

    // Check Admin Password and login instantly
    if (isUserAdmin(emailClean)) {
      if (onboardingPassword.trim() !== "92752100") {
        setOnboardingError("Senha de administrador incorreta (92752100).");
        return;
      }
      localStorage.setItem("yt_boost_email", "81985702243");
      setUserEmail("81985702243");
      setUserCredits(999999999);
      localStorage.setItem("yt_boost_credits", "999999999");
      setOnboardingOpen(false);
      
      // Clear forms
      setOnboardingEmail("");
      setOnboardingPassword("");
      setOnboardingName("");

      triggerCoinEarnedAnimation(150);
      fetchCampaigns();
      return;
    }

    // Standard User Validation Flow (requires Name)
    if (!onboardingName.trim()) {
      setOnboardingError("Por favor, insira o seu nome ou apelido.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      setOnboardingError("Por favor, insira um formato de e-mail válido (exemplo: usuario@gmail.com).");
      return;
    }

    // Validate email provider (Google, Hotmail, Outlook)
    const domain = emailClean.split("@")[1] || "";
    const isValidProvider = 
      domain === "gmail.com" || 
      domain === "googlemail.com" || 
      domain === "hotmail.com" || 
      domain.startsWith("hotmail.com.") ||
      domain.startsWith("hotmail.co.") ||
      domain === "outlook.com" ||
      domain.startsWith("outlook.com.") ||
      domain.startsWith("outlook.co.");

    if (!isValidProvider) {
      setOnboardingError("Por razões de segurança, apenas aceitamos cadastros com e-mails do Google (Gmail), Hotmail ou Outlook.");
      return;
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    setIsVerifyingEmail(true);
    try {
      setVerificationMsg("Iniciando verificação de segurança...");
      await sleep(550);

      const username = emailClean.split("@")[0] || "";
      setVerificationMsg(`Analisando estrutura e sintaxe da conta '${username}' no provedor @${domain}...`);
      await sleep(650);

      setVerificationMsg(`Buscando e conectando com servidores MX DNS ativos para o domínio @${domain}...`);

      const res = await fetch("/api/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailClean })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Não foi possível validar o e-mail.");
      }

      setVerificationMsg(`Handshake realizado com êxito! Conectado aos servidores da ${data.provider}...`);
      await sleep(800);

      setVerificationMsg("Caixa postal ativa confirmada pelas diretrizes oficiais! Finalizando...");
      await sleep(500);

      localStorage.setItem("yt_boost_email", emailClean);
      setUserEmail(emailClean);
      setOnboardingOpen(false);

      const hasCompletedTour = localStorage.getItem("yt_tour_completed") === "true";
      if (!hasCompletedTour) {
        setTourOpen(true);
      }

      // Initial bonus trigger display
      triggerCoinEarnedAnimation(100);

      await syncUserFromDatabase(emailClean);

      fetchCampaigns();
    } catch (err: any) {
      setOnboardingError(err.message || "Erro de validação desconhecido. Por favor tente outro e-mail válido.");
    } finally {
      setIsVerifyingEmail(false);
      setVerificationMsg("");
    }
  };

  const triggerCoinEarnedAnimation = (amount: number, type: "earn" | "spend" = "earn") => {
    setEarnedNotification({ amount, type });
    setTimeout(() => {
      setEarnedNotification(null);
    }, 3500);
  };

  const handleActionCompleted = (creditsEarned: number) => {
    const prev = userCredits;
    handleUpdateCredits(prev + creditsEarned);
    triggerCoinEarnedAnimation(creditsEarned);
    setActiveTask(null);
    fetchCampaigns();
  };

  const handleDeductCredits = (cost: number) => {
    if (isUserAdmin(userEmail)) {
      // Admin is immune to deduction, keeping unlimited balance
      return;
    }
    const prev = userCredits;
    handleUpdateCredits(Math.max(0, prev - cost));
  };

  const logout = () => {
    localStorage.removeItem("yt_boost_email");
    setUserEmail("");
    setIsAdminFormActive(false);
    setAdminEmail("");
    setAdminPassword("");
    setOnboardingOpen(true);
  };

  // Filters search queries and tab filters
  const filteredCampaigns = React.useMemo(() => {
    let list: Campaign[] = [];
    campaigns.forEach((camp) => {
      // Regra de segurança/privacidade: vídeos de usuários comuns só aparecem para eles mesmos (no próprio painel)
      // e não no site geral para outros usuários. Os vídeos do administrador permanecem públicos para todos realizarem tarefas.
      const isCreator = userEmail && camp.userEmail && camp.userEmail.toLowerCase() === userEmail.toLowerCase();
      const isPinnedChan = pinnedChannels.some((pc) => {
        if (!pc) return false;
        const url_val = (pc as any).url || (pc as any);
        if (!url_val || typeof url_val !== "string") return false;
        const cleanPc = url_val.toLowerCase().trim();
        
        // Extract handle / username from URL (e.g., https://www.youtube.com/@CanalX -> canalx)
        let handle = "";
        if (cleanPc.includes("/@")) {
          const parts = cleanPc.split("/@");
          if (parts[1]) {
            handle = parts[1].split("/")[0].split("?")[0].trim();
          }
        }
        
        // Extract channel ID from URL (e.g., /channel/UCabc -> ucabc)
        let channelId = "";
        if (cleanPc.includes("/channel/")) {
          const parts = cleanPc.split("/channel/");
          if (parts[1]) {
            channelId = parts[1].split("/")[0].split("?")[0].trim();
          }
        } else if (cleanPc.includes("/c/")) {
          const parts = cleanPc.split("/c/");
          if (parts[1]) {
            channelId = parts[1].split("/")[0].split("?")[0].trim();
          }
        }

        const titleNoSpaces = camp.channelTitle ? camp.channelTitle.toLowerCase().replace(/\s+/g, "") : "";
        const titleWords = camp.channelTitle ? camp.channelTitle.toLowerCase().split(/\s+/) : [];
        const ytIdLower = camp.youtubeId ? camp.youtubeId.toLowerCase() : "";
        const emailLower = camp.userEmail ? camp.userEmail.toLowerCase() : "";

        if (handle) {
          if (titleNoSpaces.includes(handle) || handle.includes(titleNoSpaces) || ytIdLower.includes(handle) || emailLower.includes(handle)) {
            return true;
          }
          if (titleWords.some((w) => w && (w.includes(handle) || handle.includes(w)))) {
            return true;
          }
        }
        
        if (channelId) {
          if (ytIdLower === channelId || titleNoSpaces.includes(channelId) || emailLower.includes(channelId)) {
            return true;
          }
        }

        const campTitleLower = camp.channelTitle ? camp.channelTitle.toLowerCase() : "";
        if (campTitleLower && cleanPc.includes(campTitleLower)) {
          return true;
        }
        if (camp.youtubeId && cleanPc.includes(ytIdLower)) {
          return true;
        }
        if (camp.userEmail && cleanPc.includes(emailLower)) {
          return true;
        }

        return false;
      });

      const isAdminVideo = (camp.userEmail && isUserAdmin(camp.userEmail)) || 
                           (camp.channelTitle && camp.channelTitle.toLowerCase() === "pagamento fácil") ||
                           (camp.youtubeId && camp.youtubeId.toLowerCase() === "pagamentofacil") ||
                           camp.isPartnerChannel ||
                           camp.isPinned ||
                           isPinnedChan;
      
      const isCurrentUserAdmin = isUserAdmin(userEmail);

      // As campanhas cadastradas por usuários comuns ficam visíveis para todos, mas aparecem exclusivamente na aba de tarefas da comunidade ("tarefas").
      // Nas abas principais de ganhos ("all", "view", "like", "comment", "subscribe"), mostramos apenas os vídeos oficiais do administrador/parceiros.
      if (activeTab !== "tarefas" && !isAdminVideo) {
        return;
      }

      const isAdmVideo = isAdminVideo;

      // Regra de inscrição: tarefas de inscrição aparecem apenas na aba de inscrição "subscribe" e em nenhuma outra (como "all", "like" ou "comment")
      if (camp.type === "subscribe") {
        if (activeTab === "subscribe" || activeTab === "tarefas") {
          list.push(camp);
        }
        return;
      }

      if (activeTab === "all" || activeTab === "tarefas") {
        list.push(camp);
      } else if (activeTab === "view") {
        if (camp.type === "view") {
          list.push(camp);
        }
      } else if (activeTab === "like") {
        if (camp.type === "like") {
          list.push(camp);
        } else if (isAdmVideo) {
          list.push({ ...camp, type: "like" });
        }
      } else if (activeTab === "comment") {
        if (camp.type === "comment") {
          list.push(camp);
        } else if (isAdmVideo) {
          list.push({ ...camp, type: "comment" });
        }
      } else if (camp.type === activeTab) {
        list.push(camp);
      }
    });

    const filteredList = list.filter((camp) => {
      const queryMatches =
        camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.channelTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return queryMatches;
    });

    // Apply pinned items first, then boosted, then custom ordering indexes, then latest creation
    filteredList.sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;

      const boostA = a.isBoosted ? 1 : 0;
      const boostB = b.isBoosted ? 1 : 0;
      if (boostA !== boostB) return boostB - boostA;

      const posA = a.positionIndex !== undefined && a.positionIndex !== null ? a.positionIndex : Infinity;
      const posB = b.positionIndex !== undefined && b.positionIndex !== null ? b.positionIndex : Infinity;
      if (posA !== posB) return posA - posB;

      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return filteredList;
  }, [campaigns, activeTab, searchQuery, pinnedChannels]);

  // Premium Highlights filtering targeting only Admin/Pagamento Fácil channel videos
  const pfHighlightCampaigns = React.useMemo(() => {
    return campaigns
      .filter((camp) => {
        return (camp.userEmail && isUserAdmin(camp.userEmail)) || 
               (camp.channelTitle && camp.channelTitle.toLowerCase() === "pagamento fácil") || 
               camp.youtubeId === "COu8H06wckk" || 
               (camp.youtubeId && camp.youtubeId.toLowerCase() === "pagamentofacil");
      })
      .sort((a, b) => {
        const pinA = a.isPinned ? 1 : 0;
        const pinB = b.isPinned ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;

        const indexA = a.positionIndex !== undefined && a.positionIndex !== null ? a.positionIndex : Infinity;
        const indexB = b.positionIndex !== undefined && b.positionIndex !== null ? b.positionIndex : Infinity;
        if (indexA !== indexB) return indexA - indexB;

        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [campaigns]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-red-500 selection:text-white font-sans flex flex-col">
      
      {/* Background radial gradient glow representing professional dark mode */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-red-950/15 via-slate-950/0 to-slate-950 pointer-events-none" />

      {/* Header */}
      <header className="h-20 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight flex items-center gap-1.5 uppercase">
                VIRAL<span className="text-red-500 font-bold">TUBE</span>
                <span className="text-[9px] bg-red-600/10 text-red-500 border border-red-500/20 px-1.5 rounded-md font-mono font-bold tracking-wider">PRO</span>
              </h1>
              <p className="text-[10px] text-slate-400">Troca cooperativa de visualizações brasileiras reais</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live profile info */}
            {userEmail && (
              <div id="user-credits-badge" className="flex items-center gap-3 bg-slate-900 border border-slate-805 border-slate-800 rounded-full px-4 py-1.5 shadow-sm">
                <div className="flex items-center gap-1.5">
                  {isUserAdmin(userEmail) ? (
                    <>
                      <Sparkles className="w-4 h-4 text-red-500 animate-pulse fill-red-500" />
                      <span className="text-xs font-mono font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                        Moedas Ilimitadas <span className="text-amber-400">(∞)</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-slate-100 flex items-center gap-1.5">
                        {userCredits} <span className="text-[10px] text-slate-500">moedas</span>
                        <button
                          onClick={() => {
                            setActiveTab("buy-coins");
                            setActiveTask(null);
                          }}
                          className="ml-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border border-amber-500/20 hover:scale-105 active:scale-95 duration-150 transition-all cursor-pointer uppercase font-sans tracking-wide"
                          title="Comprar mais moedas via Pix"
                        >
                          + Comprar
                        </button>
                      </span>
                    </>
                  )}
                </div>

                {/* Daily task quota tracker badge */}
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-1.5" title="Seu limite diário de tarefas: Máximo de 20 por dia">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono font-black text-slate-300">
                    Hoje: <span className="text-emerald-400">{dailyCompletedCount}</span>/20
                  </span>
                </div>

                <div className="h-4 w-px bg-slate-800" />
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold font-mono text-slate-300 flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                    {isUserAdmin(userEmail) ? (
                      <>
                        <span className="bg-gradient-to-r from-red-650 to-red-800 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse shrink-0">
                          ADM SUPREMO
                        </span>
                        <a
                          href="https://www.youtube.com/@Pagamentofacil"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-red-150 text-red-450 text-red-400 font-extrabold flex items-center gap-1 shrink-0 bg-red-950/45 px-2 py-0.5 rounded-lg border border-red-900/40 hover:bg-red-900/30 transition-colors"
                          title="Acessar Canal YouTube @Pagamentofacil"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-505 bg-red-500" />
                          Pagamento Fácil 📺
                        </a>
                      </>
                    ) : (
                      `@${userEmail.split("@")[0]}`
                    )}
                  </p>
                </div>

                {/* Reset/Start general tour */}
                <button
                  type="button"
                  onClick={() => {
                    setTourOpen(true);
                    setActiveTab("all");
                    setActiveTask(null);
                  }}
                  title="Tutorial do Aplicativo"
                  className="px-2 py-1 text-[10px] font-bold rounded-xl text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/80 hover:bg-slate-800/80 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span>Como Funciona</span>
                </button>
                <button
                  onClick={logout}
                  title="Sair da Conta"
                  className="p-1 text-slate-550 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* + Add Video Campaign Button */}
            {userEmail && (
              <button
                id="btn-boost-channel"
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2 px-4 sm:px-5 rounded-2xl shadow-lg shadow-red-900/25 flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer uppercase tracking-tight"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Impulsionar Canal</span>
                <span className="sm:hidden">Impulsionar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative w-full flex-1">
        
        {/* Statistics Widgets */}
        <DashboardStats stats={globalStats} />

        {/* Voltar para a Página Inicial - Universal navigation button shown on all sub-pages or sub-tabs */}
        {(activeTab !== "all" || activeTask !== null) && (
          <div className="mb-6 flex justify-start items-center">
            <button
              onClick={() => {
                setActiveTab("all");
                setActiveTask(null);
                setSearchQuery("");
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-red-650 to-red-800 text-white hover:from-red-500 hover:to-red-600 rounded-2xl shadow-md border border-red-505 border-red-600/30 text-xs font-black uppercase tracking-tight flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <span>🏠</span>
              <span>Voltar para a Página Inicial</span>
            </button>
          </div>
        )}

        {/* Dynamic Task View Box */}
        <AnimatePresence mode="wait">
          {activeTask ? (
            <motion.div
              key="active-task-screen"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="mb-8"
            >
              <YouTubeTaskPlayer
                campaign={activeTask}
                userEmail={userEmail}
                onActionCompleted={handleActionCompleted}
                onCancel={() => setActiveTask(null)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-lists-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in"
            >
              
              {/* Left Column: Campaigns List & Filters (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Canal & Vídeos em Destaque (ADM - Pagamento Fácil) */}
                {pfHighlightCampaigns.length > 0 && (
                  <div id="highlighted-campaigns-section" className="bg-gradient-to-r from-red-950/20 via-slate-900/40 to-slate-900/40 border border-red-500/25 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-650 to-red-800 rounded-2xl flex items-center justify-center border border-red-500/35 shadow-md shrink-0">
                          <Tv className="w-5 h-5 text-red-100" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-black text-white tracking-wide uppercase">Canal Oficial em Destaque</h3>
                            <span className="bg-red-500/10 text-red-400 text-[8px] px-1.5 py-0.5 rounded-full border border-red-500/20 font-black tracking-widest uppercase">Canal ADM</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                            Participe das tarefas oficiais de <strong className="text-white hover:underline cursor-pointer" onClick={() => window.open("https://www.youtube.com/@Pagamentofacil", "_blank")}>@Pagamentofacil</strong> e acumule moedas de forma prioritária!
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => window.open("https://www.youtube.com/@Pagamentofacil", "_blank")}
                        className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        Acessar Canal
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pfHighlightCampaigns.slice(0, 4).map((camp) => {
                        const isCompletedByMe = camp.completedUsers.some(
                          (user) => user.toLowerCase() === userEmail.toLowerCase()
                        );
                        
                        return (
                          <div
                            key={`highlight-${camp.id}`}
                            className="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-900 hover:border-red-500/20 p-3 rounded-2xl transition-all duration-300 flex flex-col justify-between group"
                          >
                            <div className="flex items-start gap-3">
                              {/* Left Thumbnail with overlay */}
                              <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-850">
                                <img
                                  src={getThumbnailUrl(camp)}
                                  alt="Thumbnail"
                                  className="w-full h-full object-cover group-hover:scale-105 duration-300"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute top-1 right-1 px-1 py-0.5 bg-slate-950/80 rounded text-[7px] font-bold text-slate-300 uppercase">
                                  {camp.type === "view" ? "👀 View" :
                                   camp.type === "like" ? "👍 Like" :
                                   camp.type === "comment" ? "💬 Comentar" : "🔔 Inscrever"}
                                </div>
                              </div>

                              {/* Title / Info */}
                              <div className="space-y-1 overflow-hidden min-w-0">
                                <h4 className="text-[10px] font-bold text-slate-200 group-hover:text-white line-clamp-2 leading-tight transition-colors">
                                  {camp.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                  <span className="flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/10">
                                    +{camp.creditsReward}
                                  </span>
                                  <span>{camp.currentCount}/{camp.targetCount}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-900/60 pt-2 shrink-0">
                              {/* Simple mini progress bar */}
                              <div className="w-1/2 bg-slate-950 rounded-full h-1 overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(100, (camp.currentCount / camp.targetCount) * 100)}%` }}
                                  className="h-full bg-red-500 rounded-full"
                                />
                              </div>

                              <div>
                                {isCompletedByMe ? (
                                  <span className="text-[8px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/10">✓ Concluída</span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (!userEmail) {
                                        setOnboardingOpen(true);
                                      } else {
                                        setActiveTask(camp);
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-red-950 hover:bg-red-650 text-red-400 hover:text-white duration-200 text-[10px] font-bold uppercase rounded-lg border border-red-500/20 tracking-wider flex items-center gap-1 shrink-0 cursor-pointer"
                                  >
                                    <span>Ir</span>
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Destaque Promocional: Convide e Ganhe */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-rose-950/40 via-pink-900/10 to-slate-900/60 border border-pink-500/30 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 animate-pulse">
                      <Gift className="w-6 h-6 text-rose-400 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-rose-400 tracking-widest flex items-center gap-2 justify-center sm:justify-start">
                        <span>CAMPANHA DE INDICAÇÃO ATIVA</span>
                        <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-950 text-[8px] font-black px-1.5 py-0.5 rounded-full">+500 MOEDAS 🎁</span>
                      </h4>
                      <h3 className="text-sm font-bold text-white mt-1">
                        Ganhe <strong className="text-rose-400">500 moedas de graça</strong> conectando outros influenciadores
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Copie seu link exclusivo, divulgue em grupos e ganhe créditos automáticos no momento do cadastro deles!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("referral")}
                    className="py-2.5 px-5 bg-gradient-to-r from-rose-600 to-pink-650 hover:from-rose-500 hover:to-pink-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-900/35 border border-rose-500/30 uppercase tracking-tight transition-all hover:scale-[1.04] active:scale-95 cursor-pointer shrink-0"
                  >
                    Resgatar meu Bônus 🚀
                  </button>
                </motion.div>

                {/* Search & Tabs Panel */}
                <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Category tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                    {["all", "view", "like", "comment", "subscribe"].includes(activeTab) && (
                      <>
                        <button
                          onClick={() => setActiveTab("all")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === "all"
                              ? "bg-white text-slate-950 shadow-md"
                              : "bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setActiveTab("view")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "view"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-slate-950/80 text-slate-400 border border-transparent hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <Tv className="w-3.5 h-3.5" />
                          Views
                        </button>
                        <button
                          onClick={() => setActiveTab("like")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "like"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-slate-950/80 text-slate-400 border border-transparent hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          Likes
                        </button>
                        <button
                          onClick={() => setActiveTab("comment")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "comment"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-slate-950/80 text-slate-400 border border-transparent hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Comentários [IA]
                        </button>
                        <button
                          onClick={() => setActiveTab("subscribe")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "subscribe"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : "bg-slate-950/80 text-slate-400 border border-transparent hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          Inscrições (Canais Parceiros) 🤝
                        </button>
                      </>
                    )}

                    <button
                      id="btn-nav-tarefas"
                      onClick={() => setActiveTab("tarefas")}
                      className={`relative px-5 py-3 rounded-2xl text-base md:text-lg lg:text-xl font-black transition-all flex items-center gap-2.5 cursor-pointer border duration-300 transform scale-102 hover:scale-[1.06] active:scale-[0.97] shadow-xl ${
                        activeTab === "tarefas"
                          ? "bg-gradient-to-r from-red-500 via-red-600 via-rose-600 to-red-800 text-white border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.6)] ring-4 ring-red-500/30"
                          : "bg-gradient-to-r from-red-950/50 to-red-900/40 text-rose-300 border-red-500/60 hover:bg-gradient-to-r hover:from-red-900 hover:to-red-800 hover:text-white hover:border-red-400"
                      }`}
                    >
                      <Sparkles className="w-5.5 h-5.5 text-yellow-300 animate-pulse fill-yellow-400" />
                      <span className="font-black uppercase tracking-wide">Tarefas da Comunidade 🚀</span>
                      <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shadow animate-bounce">
                        VIP
                      </span>
                    </button>

                    <button
                      id="btn-nav-referral"
                      onClick={() => setActiveTab("referral")}
                      className={`relative px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border duration-300 ${
                        activeTab === "referral"
                          ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white border-rose-400 shadow-lg shadow-rose-500/30"
                          : "bg-rose-950/30 text-rose-300 border-rose-500/30 hover:bg-rose-900/45 hover:text-white hover:border-rose-400/50 shadow-md shadow-rose-950/40 hover:scale-[1.02] active:scale-[0.98]"
                      }`}
                    >
                      <div className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
                      </div>
                      <Gift className="w-3.5 h-3.5 animate-bounce text-rose-400" />
                      <span>Convide e Ganhe</span>
                      <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-950 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wider shadow-sm ml-0.5">
                        +500 moedas 🎁
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("progress")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "progress"
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                          : "bg-slate-950/80 text-slate-400 border border-transparent hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Progresso Real-Time 📊
                    </button>

                    <button
                      id="btn-nav-buy-coins"
                      onClick={() => setActiveTab("buy-coins")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                        activeTab === "buy-coins"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-md shadow-amber-950/20"
                          : "bg-amber-950/20 text-amber-400 border-amber-500/15 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>Comprar Moedas (Pix) 💰</span>
                    </button>

                    {isUserAdmin(userEmail) && (
                      <button
                        onClick={() => setActiveTab("admin")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                          activeTab === "admin"
                            ? "bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-950/20 border border-red-500/30 animate-pulse"
                            : "bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse fill-amber-400" />
                        <span>Painel ADM Canal 🔑</span>
                      </button>
                    )}
                  </div>

                  {/* Search bar input */}
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Pesquisar títulos ou canais..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-550 placeholder-slate-550 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {!["all", "view", "like", "comment", "subscribe"].includes(activeTab) && (
                  <div className="flex items-center justify-start py-1 pb-2 animate-fade-in">
                    <button
                      onClick={() => setActiveTab("all")}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-300 hover:text-white transition-all shadow-md cursor-pointer group"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-red-500 group-hover:-translate-x-1 transition-transform duration-200" />
                      <span>Voltar para o Painel Principal 📺</span>
                    </button>
                  </div>
                )}

                {activeTab === "progress" ? (
                  <ProgressDashboard
                    campaigns={campaigns}
                    userEmail={userEmail}
                    onBoost={handleAcelerarCampaign}
                    onRefresh={fetchCampaigns}
                  />
                ) : activeTab === "buy-coins" ? (
                  <BuyCoinsDashboard
                    userEmail={userEmail}
                    onCoinsAdded={(amount) => {
                      const newCreds = userCredits + amount;
                      handleUpdateCredits(newCreds);
                      triggerCoinEarnedAnimation(amount);
                    }}
                  />
                ) : activeTab === "referral" ? (
                  <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-6 md:p-8 space-y-6 min-h-[400px]">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-rose-950/40 via-purple-950/25 to-slate-950 border border-rose-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 right-0 w-44 h-44 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
                        <div className="space-y-2 text-center md:text-left">
                          <span className="bg-rose-500/15 border border-rose-500/30 text-rose-405 text-rose-400 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider animate-pulse inline-block">
                            CAMPANHA CONVIDE E GANHE 🎁
                          </span>
                          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                            Ganhe <strong className="text-rose-400 font-extrabold">+500 moedas</strong> por indicação!
                          </h2>
                          <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                            Convide seus amigos e criadores para o <strong>ViralTubePro</strong>. Você recebe <strong>+500 moedas</strong> assim que eles criarem a conta, e seu amigo também começa com <strong>500 moedas</strong> como bônus de boas-vindas!
                          </p>
                        </div>
                        <div className="bg-slate-950/80 border border-rose-500/30 rounded-2xl p-4.5 text-center shrink-0 w-full md:w-auto shadow-lg">
                          <span className="text-[9px] uppercase font-mono text-rose-400 font-bold tracking-wider">Seu Bônus Ativo</span>
                          <div className="flex items-center justify-center gap-1.5 mt-1">
                            <Gift className="w-5.5 h-5.5 text-rose-400" />
                            <span className="text-2xl font-black text-rose-400">500</span>
                          </div>
                          <span className="text-[8px] text-slate-500 font-mono block mt-1 uppercase">Moedas por Convidado</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Section: Referral Actions & Code */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: Share Box */}
                      <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>🔗 Seu Link de Indicação</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Copie o link exclusivo abaixo e envie nas suas redes sociais, grupos de WhatsApp, ou Telegram.
                          </p>
                          
                          {/* Input Link Display */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}/?ref=${encodeURIComponent(userEmail || "visitante")}`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                const refUrl = `${window.location.origin}/?ref=${encodeURIComponent(userEmail || "visitante")}`;
                                navigator.clipboard.writeText(refUrl);
                                alert("Link de indicação copiado com sucesso! 🚀 Envie para seus amigos.");
                              }}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all font-sans cursor-pointer shrink-0"
                            >
                              Copiar Link
                            </button>
                          </div>
                        </div>

                        {/* WhatsApp Broadcast */}
                        <div className="pt-4 border-t border-slate-900">
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                              `Olá! Estou usando o aplicativo ViralTubePro para turbinar meus vídeos do YouTube e ganhar inscritos novos de graça! Cadastre-se pelo meu link de convite e ganhe 500 moedas de bônus na hora para divulgar seu canal! Link: ${window.location.origin}/?ref=${encodeURIComponent(userEmail || "visitante")}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-extrabold text-xs text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-4 h-4 fill-white text-white" />
                            <span>Compartilhar no WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      {/* Right: Enter Referral Code */}
                      <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-2xl space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>🎁 Fui Convidado</span>
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Se você foi convidado por um criador, insira o e-mail dele abaixo para ativar o bônus mútuo de <strong>500 moedas</strong> instantâneas!
                        </p>

                        <div className="space-y-3 pt-1">
                          <input
                            type="email"
                            id="referrer-email-input"
                            placeholder="Exemplo: amigo@gmail.com"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-550"
                          />
                          <button
                            onClick={() => {
                              const inputEl = document.getElementById("referrer-email-input") as HTMLInputElement;
                              const referrerEmail = inputEl?.value?.trim()?.toLowerCase();
                              if (!referrerEmail) {
                                alert("Por favor, digite o e-mail do seu convidante.");
                                return;
                              }
                              if (referrerEmail === (userEmail || "").toLowerCase()) {
                                alert("Você não pode indicar seu próprio e-mail!");
                                return;
                              }
                              
                              const hasClaimedRef = localStorage.getItem("yt_claimed_ref") === "true";
                              if (hasClaimedRef) {
                                alert("Você já reivindicou seu bônus de boas-vindas para convites!");
                                return;
                              }

                              localStorage.setItem("yt_claimed_ref", "true");
                              handleUpdateCredits(userCredits + 500);
                              triggerCoinEarnedAnimation(500);

                              // Post audit event to server so we see it
                              fetch("/api/payments/create", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  userEmail: referrerEmail,
                                  buyerName: "Indicação Mútua Ativa",
                                  coins: 500,
                                  value: 0,
                                  packageName: `Indicação Realizada por ${userEmail}`,
                                  paymentMethod: "Convite e Ganhe"
                                })
                              }).catch(() => {});

                              alert("✨ Sensacional! Código de indicação ativado. Você e seu amigo receberam +500 moedas no saldo!");
                            }}
                            className="w-full py-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Resgatar Bônus Convidado (+500 moedas)
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* How it works info list */}
                    <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-mono font-bold text-slate-350 uppercase tracking-wider">Como funciona o convite cooperativo:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                          <strong className="text-white text-xs block">1. Envie seu link</strong>
                          <span className="text-[10px] text-slate-400">Copie o link acima ou compartilhe nas redes.</span>
                        </div>
                        <div className="space-y-1 border-t sm:border-t-0 sm:border-x border-slate-900 pt-3 sm:pt-0 sm:px-4">
                          <strong className="text-white text-xs block">2. Seu amigo se cadastra</strong>
                          <span className="text-[10px] text-slate-400">Ele cria a conta e digita seu e-mail como convidante.</span>
                        </div>
                        <div className="space-y-1 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <strong className="text-white text-xs block">3. Saldo creditado!</strong>
                          <span className="text-emerald-400 text-xs block font-bold">+500 moedas</span>
                          <span className="text-[10px] text-slate-400">O saldo sobe imediatamente na carteira de ambos.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === "tarefas" ? (
                  <div className="space-y-6">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-xl">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-red-650/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
                      
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
                        <div className="space-y-2 text-center md:text-left">
                          <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider animate-pulse inline-block">
                            TAREFAS DA COMUNIDADE COM COOPERAÇÃO REAL 🚀
                          </span>
                          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                            Cadastre e Realize Tarefas Coletivas
                          </h2>
                          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                            Aqui, qualquer usuário pode cadastrar suas próprias tarefas e vídeos do YouTube para receber engajamento real da comunidade. Ao realizar tarefas de outros membros nesta aba, você ganha moedas instantaneamente!
                          </p>
                        </div>
                        
                        <div className="bg-slate-950/85 border border-red-500/30 rounded-2xl p-4.5 text-center shrink-0 w-full md:w-auto shadow-lg">
                          <span className="text-[9px] uppercase font-mono text-red-400 font-bold tracking-wider">Moedas Recomendadas</span>
                          <div className="flex items-center justify-center gap-1.5 mt-1">
                            <Coins className="w-5.5 h-5.5 text-amber-400 animate-pulse" />
                            <span className="text-2xl font-black text-white">{userCredits}</span>
                          </div>
                          <span className="text-[8px] text-slate-500 font-mono block mt-1 uppercase">Seu Saldo Atual</span>
                        </div>
                      </div>
                    </div>

                    {/* Dual Column Layout: Left Column (Register form), Right Column (Dashboard feed) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left Column: Register Task Form */}
                      <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                          <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                          <h3 className="text-xs font-black text-white uppercase tracking-wider">
                            Nova Tarefa da Comunidade
                          </h3>
                        </div>

                        <form onSubmit={handleTaskFormSubmit} className="space-y-4 text-left">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">
                              Link do Vídeo ou Canal do YouTube *
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={taskFormUrl}
                                onChange={(e) => setTaskFormUrl(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-805 border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                              />
                              <button
                                type="button"
                                onClick={handleTaskFormCheckUrl}
                                disabled={taskFormCheckingUrl || !taskFormUrl.trim()}
                                className="px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 font-bold text-xs rounded-xl transition-all font-sans cursor-pointer shrink-0 text-white flex items-center justify-center gap-1.5"
                              >
                                {taskFormCheckingUrl ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  "Verificar"
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">
                                Tipo de Tarefa
                              </label>
                              <select
                                value={taskFormType}
                                onChange={(e) => setTaskFormType(e.target.value as any)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                              >
                                <option value="view">Visualização - Ganhar 30 Moedas (View)</option>
                                <option value="like">Curtida - Ganhar 10 Moedas (Like)</option>
                                <option value="comment">Comentário IA - Ganhar 20 Moedas (Comment)</option>
                                <option value="subscribe">Inscrição - Ganhar 25 Moedas (Sub)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">
                                Meta (Ações Desejadas)
                              </label>
                              <select
                                value={taskFormTarget}
                                onChange={(e) => setTaskFormTarget(parseInt(e.target.value, 10))}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                              >
                                <option value={10}>10 ações desejadas</option>
                                <option value={20}>20 ações desejadas</option>
                                <option value={30}>30 ações desejadas</option>
                                <option value={50}>50 ações desejadas</option>
                                <option value={100}>100 ações desejadas</option>
                                <option value={200}>200 ações desejadas</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">
                              Título do Vídeo / Nome do Recurso
                            </label>
                            <input
                              type="text"
                              placeholder="Exemplo: Como ganhar moedas no YouTube"
                              value={taskFormTitle}
                              onChange={(e) => setTaskFormTitle(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">
                              Nome do Canal do YouTube
                            </label>
                            <input
                              type="text"
                              placeholder="Exemplo: Canal Dinheiro Fácil"
                              value={taskFormChannelTitle}
                              onChange={(e) => setTaskFormChannelTitle(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                            />
                          </div>

                          {/* Live Dynamic Cost calculation display */}
                          <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl space-y-2">
                            <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">Tabela de Custos (Desconto no envio)</span>
                            <div className="flex items-center justify-between text-xs text-slate-350">
                              <span>Custo por ação ({taskFormType === "view" ? "Views" : taskFormType === "like" ? "Likes" : taskFormType === "comment" ? "Comentários" : "Inscrições"}):</span>
                              <strong className="text-white font-mono">
                                {taskFormType === "view" ? "30" : taskFormType === "like" ? "10" : taskFormType === "comment" ? "20" : "25"} moedas
                              </strong>
                            </div>
                            <div className="border-t border-slate-900 pt-2 flex items-center justify-between text-xs">
                              <span className="font-bold text-white">CUSTO TOTAL DA TAREFA:</span>
                              <strong className="text-red-400 font-black font-mono text-sm">
                                {((taskFormType === "view" ? 30 : taskFormType === "like" ? 10 : taskFormType === "comment" ? 20 : 25) * taskFormTarget)} moedas
                              </strong>
                            </div>
                          </div>

                          {taskFormError && (
                            <div className="p-3 bg-red-950/20 border border-red-500/40 text-red-400 text-xs rounded-xl font-bold font-sans">
                              ⚠️ {taskFormError}
                            </div>
                          )}

                          {taskFormSuccess && (
                            <div className="p-3 bg-emerald-950/20 border border-emerald-500/40 text-emerald-400 text-xs rounded-xl font-bold font-sans">
                              ✅ {taskFormSuccess}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={taskFormIsLoading}
                            className="w-full py-3 bg-gradient-to-r from-red-650 to-pink-650 hover:from-red-600 hover:to-pink-600 text-white font-black text-xs uppercase rounded-xl transition-all hover:scale-[1.02] shadow-md shadow-red-955 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                          >
                            {taskFormIsLoading ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Cadastrando...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                                <span>Publicar e Cadastrar Tarefa 🚀</span>
                              </>
                            )}
                          </button>
                        </form>
                      </div>

                      {/* Right Column: Community Tasks List Feed */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <span>📋 Tarefas da Comunidade ({filteredCampaigns.length})</span>
                          </h3>
                          <span className="bg-slate-950 border border-slate-850 text-slate-400 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-lg">
                            Dica: Execute e ganhe moedas na hora!
                          </span>
                        </div>

                        {filteredCampaigns.length === 0 ? (
                          <div className="py-16 text-center border border-dashed border-slate-800 bg-slate-950/20 rounded-3xl flex flex-col items-center justify-center p-6 space-y-3">
                            <Sparkles className="w-8 h-8 text-slate-700 animate-pulse" />
                            <h4 className="font-bold text-xs text-slate-350">Nenhuma tarefa pública no momento</h4>
                            <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed text-slate-450">
                              Seja o primeiro a cadastrar uma tarefa usando o formulário de cadastro à esquerda!
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-5">
                            {filteredCampaigns.map((camp) => {
                              const percentage = Math.min(100, Math.floor((camp.currentCount / camp.targetCount) * 100));
                              const currentReward = camp.creditsReward || (camp.type === "view" ? 15 : camp.type === "like" ? 10 : camp.type === "comment" ? 20 : 25);
                              
                              return (
                                <div
                                  key={camp.id}
                                  className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 transition-all rounded-3xl p-4.5 flex flex-col justify-between group relative overflow-hidden text-left"
                                >
                                  {camp.isBoosted && (
                                    <div className="absolute top-0 right-0 bg-red-600 text-white font-black text-[7px] uppercase tracking-wider px-2.5 py-1 rounded-bl-xl shadow-lg border-l border-b border-red-500/20 flex items-center gap-1 z-10">
                                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                                      ACELERADO 🔥
                                    </div>
                                  )}

                                  <div>
                                    <div className="flex items-center justify-between mb-3.2 flex-wrap gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-lg border border-opacity-30 ${
                                          camp.type === "view" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                                          camp.type === "like" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                          camp.type === "comment" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                                          "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                        }`}>
                                          {camp.type === "view" ? "View" :
                                           camp.type === "like" ? "Like" :
                                           camp.type === "comment" ? "Comentário" :
                                           "Inscrição"}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                          #{camp.youtubeId}
                                        </span>
                                      </div>
                                    </div>

                                    {/* YouTube Thumbnail Preview */}
                                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 border border-slate-850 bg-slate-950 shadow-inner">
                                      <img
                                        src={getThumbnailUrl(camp)}
                                        alt="YouTube Thumbnail"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2">
                                        <span className="text-[8px] uppercase tracking-wider font-mono bg-red-600/90 text-white px-1.5 py-0.5 rounded-md font-bold">
                                          Conexão Youtube Ativa
                                        </span>
                                      </div>
                                    </div>

                                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-2 max-w-full mt-2">
                                      {camp.title}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                                      {camp.channelTitle}
                                    </p>

                                    {/* Reward Badge */}
                                    <div className="mt-3 bg-slate-950/80 border border-slate-850 p-2.5 rounded-2xl flex items-center justify-between">
                                      <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">RECOMPENSA:</span>
                                      <div className="flex items-center gap-1">
                                        <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
                                        <strong className="text-xs font-mono font-black text-amber-400">+{currentReward} moedas</strong>
                                      </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="mt-4 space-y-1.5">
                                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                                        <span>Progresso Cooperativo</span>
                                        <span>{camp.currentCount} / {camp.targetCount} ({percentage}%)</span>
                                      </div>
                                      <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                                        <div
                                          className={`h-full duration-500 transition-all ${
                                            camp.type === "view" ? "bg-red-500" :
                                            camp.type === "like" ? "bg-amber-500" :
                                            camp.type === "comment" ? "bg-green-500" :
                                            "bg-indigo-500"
                                          }`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Start CTA Button */}
                                  <div className="mt-4 pt-3.5 border-t border-slate-950 flex flex-col gap-2">
                                    <button
                                      onClick={() => setActiveTask(camp)}
                                      className="py-2.5 bg-gradient-to-r from-red-650 to-red-800 hover:from-red-550 hover:to-red-700 text-white font-extrabold text-xs rounded-xl transition-all duration-200 hover:scale-[1.02] shadow shadow-red-955 cursor-pointer uppercase flex items-center justify-center gap-1.5"
                                    >
                                      <Play className="w-3.5 h-3.5 text-white fill-white" />
                                      <span>Iniciar Tarefa</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ) : (activeTab === "admin" && isUserAdmin(userEmail)) ? (
                  <div className="space-y-6">
                    {/* Live Linked YouTube Channel Status Profile Banner */}
                    <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-xl">
                      {/* Ambient background accent light glow */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-red-650/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => window.open("https://www.youtube.com/@Pagamentofacil", "_blank")}
                            className="w-16 h-16 bg-gradient-to-br from-red-650 to-red-800 rounded-2xl flex items-center justify-center border border-red-500/40 shadow-lg shadow-red-900/40 shrink-0 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            title="Acessar Canal Pagamento Fácil"
                          >
                            <Sparkles className="w-8 h-8 text-white animate-pulse" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <a
                                href="https://www.youtube.com/@Pagamentofacil"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg font-black font-sans text-white hover:text-red-400 transition-colors tracking-tight uppercase flex items-center gap-1 hover:underline"
                                title="Acessar Canal no YouTube"
                              >
                                <span>@Pagamentofacil</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              </a>
                              <span className="bg-red-500/20 text-red-400 text-[10px] font-mono px-2 py-0.5 rounded-md border border-red-500/30 font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                Vinculado ADM Supremo
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1.5">
                              Puxe todos os seus vídeos e gerencie o impulsionamento prioritário e cooperação real.
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 mt-2 font-mono">
                              <span>URL Oficial: <a href="https://www.youtube.com/@Pagamentofacil" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 transition-colors hover:underline">youtube.com/@Pagamentofacil</a></span>
                              <span>•</span>
                              <span>Tráfego Gratuito Ilimitado</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                          <a
                            href="https://www.youtube.com/@Pagamentofacil"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-3 px-5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1.5 uppercase tracking-tight transition-all hover:scale-105 cursor-pointer text-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-red-450 text-red-400" />
                            <span>Visitar Canal</span>
                          </a>

                          <button
                            onClick={handleAdminSyncChannel}
                            disabled={isAdminSyncing}
                            className="py-3 px-5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 uppercase tracking-tight disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer shadow-red-950/40"
                          >
                            {isAdminSyncing ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Sincronizando...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                <span>Sincronizar Canal</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {adminStatusMsg && (
                        <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-2xl font-bold font-sans animate-bounce">
                          💡 {adminStatusMsg}
                        </div>
                      )}
                    </div>

                    {/* PAINEL DE ATUALIZAÇÃO E SINCRONIZAÇÃO AUTOMÁTICA EM NUVEM */}
                    <div className="bg-slate-900/80 border-2 border-slate-700 rounded-3xl p-6 space-y-5 relative overflow-hidden backdrop-blur-md shadow-2xl">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl shrink-0">
                            <Cloud className="w-6 h-6 text-teal-400 animate-pulse" />
                          </div>
                          <div>
                            <span className="bg-teal-500/10 text-teal-400 text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded border border-teal-500/20 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                              Nuvem Ativa & Sincronizada
                            </span>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans mt-1">
                              Sincronização em Tempo Real (Evita Perdas ao Atualizar)
                            </h3>
                          </div>
                        </div>

                        <button
                          onClick={fetchSyncStatus}
                          disabled={loadingSync}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 uppercase tracking-tight cursor-pointer shrink-0"
                          title="Recarregar Status da Nuvem"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${loadingSync ? "animate-spin" : ""}`} />
                          <span>Status</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        O sistema possui um link bidirecional contínuo com o banco de dados principal <strong>Firestore</strong>. Toda atividade (tarefas concluídas, moedas, alteração de saldos, novas campanhas, homologações de logs) salva-se automaticamente de forma imutável em nuvem. No próximo deploy ou reinício do servidor de publicação, os dados permanecerão 100% preservados!
                      </p>

                      {/* Sync Metrics Blocks */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-2xl text-center">
                          <h4 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Campanhas Ativas</h4>
                          <span className="text-lg font-mono font-black text-white">
                            {syncStatus?.counts?.campaigns ?? "-"}
                          </span>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-2xl text-center">
                          <h4 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Perfis de Usuários</h4>
                          <span className="text-lg font-mono font-black text-teal-400">
                            {syncStatus?.counts?.userProfiles ?? "-"}
                          </span>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-2xl text-center">
                          <h4 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Depósitos & PIX</h4>
                          <span className="text-lg font-mono font-black text-amber-400">
                            {syncStatus?.counts?.payments ?? "-"}
                          </span>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-2xl text-center">
                          <h4 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Logs de Auditoria</h4>
                          <span className="text-lg font-mono font-black text-indigo-400">
                            {syncStatus?.counts?.auditLogs ?? "-"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                            <strong className="text-xs text-white uppercase tracking-wide">Aba de Gestão e Atualização Manual (Super ADM)</strong>
                          </div>
                          <p className="text-[10px] text-slate-405 text-slate-400 mt-1">
                            Use os controles abaixo apenas em caso de migrações pesadas ou auditoria manual pontual de backup.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handleForceSync}
                            disabled={loadingSync}
                            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-[11px] rounded-xl transition-all hover:scale-[1.02] flex items-center gap-1.5 uppercase tracking-tight disabled:bg-slate-850 disabled:text-slate-500 cursor-pointer"
                          >
                            <Cloud className="w-3.5 h-3.5" />
                            <span>Forçar Envio para Nuvem</span>
                          </button>

                          <button
                            onClick={handleForceRestore}
                            disabled={loadingSync}
                            className="px-4 py-2 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-300 hover:text-white border border-slate-850 font-extrabold text-[11px] rounded-xl transition-all hover:scale-[1.02] flex items-center gap-1.5 uppercase tracking-tight disabled:bg-slate-850 disabled:text-slate-500 cursor-pointer"
                          >
                            <Database className="w-3.5 h-3.5 text-teal-400" />
                            <span>Carregar/Restaurar da Nuvem</span>
                          </button>
                        </div>
                      </div>

                      {syncMsg.text && (
                        <div className={`p-3.5 rounded-2xl text-xs font-bold leading-relaxed border flex items-center gap-2 ${
                          syncMsg.type === "success" 
                            ? "bg-teal-500/10 border-teal-500/25 text-teal-400" 
                            : "bg-red-500/10 border-red-500/25 text-red-400"
                        }`}>
                          <span className="shrink-0">{syncMsg.type === "success" ? "✓" : "⚠️"}</span>
                          <span>{syncMsg.text}</span>
                        </div>
                      )}
                    </div>

                    {/* PAINEL DE CANAIS FIXADOS PELO ADM */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-850">
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shrink-0">
                          <Pin className="w-5 h-5 text-amber-400 fill-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
                            <span>REGRA DE HISTÓRIA: Canais Fixados no Sistema (ADM) ⭐</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">Fixe canais de outros criadores para que suas tarefas apareçam de forma pública para todos os usuários</p>
                        </div>
                      </div>

                      <form onSubmit={handleAdminAddPinnedChannel} className="space-y-3.5 bg-slate-950/45 p-4 rounded-2xl border border-slate-850">
                        <div className="flex flex-col md:flex-row gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">URL do Canal do YouTube *</label>
                            <input
                              type="text"
                              value={newPinnedChannelInput}
                              onChange={(e) => setNewPinnedChannelInput(e.target.value)}
                              placeholder="Ex: https://www.youtube.com/@CanalExemplo"
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                              required
                            />
                          </div>
                          
                          <div className="md:w-1/3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nome Manual (Opcional)</label>
                            <input
                              type="text"
                              value={pinnedChannelCustomName}
                              onChange={(e) => setPinnedChannelCustomName(e.target.value)}
                              placeholder="Nome visível do canal"
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-colors"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-900/60">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {pinnedChannelCustomAvatar ? (
                                <div className="relative group/avatar">
                                  <img 
                                    src={pinnedChannelCustomAvatar} 
                                    alt="Uploaded profile avatar" 
                                    className="w-10 h-10 rounded-full object-cover border border-amber-500/40 bg-slate-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPinnedChannelCustomAvatar("")}
                                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold border border-slate-950 cursor-pointer"
                                    title="Remover foto"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full border border-dashed border-slate-800 flex items-center justify-center text-slate-500 bg-slate-900/40 font-sans text-[9px] text-center px-1">
                                  Sem Foto
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Miniatura/Avatar Customizado (Opcional)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleCustomAvatarUpload}
                                className="text-[11px] text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer cursor-pointer"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={pinChannelLoading || !newPinnedChannelInput.trim()}
                            className="py-2.5 px-5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 disabled:from-slate-850 disabled:to-slate-850 disabled:text-slate-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all active:scale-95 shrink-0 cursor-pointer shadow-md shadow-amber-950/20"
                          >
                            {pinChannelLoading ? "Fixando..." : "Fixar Canal"}
                          </button>
                        </div>
                      </form>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Canais/URLs Atuais na Fixação Pública:</span>
                        {pinnedChannels.length === 0 ? (
                          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-[10.5px] text-slate-500 leading-normal">
                            Nenhum canal estrangeiro fixado de forma secundária no momento.
                            <br />
                            <span className="text-[9.5px] text-slate-600 font-mono mt-1 block">
                              *Nota de Privilégio: Por padrão de sistema, vídeos do canal "Pagamento Fácil" ou o ADM Tiago Alves ("81985702243") são mostrados publicamente para ganho de moedas a todos. Ao fixar outros perfis acima via URL, as campanhas dessas URLs estrangeiras serão liberadas mundialmente!
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3.5 pt-1">
                            {pinnedChannels.map((item, idx) => {
                              const chanUrl = typeof item === "string" ? item : item.url;
                              const chanName = typeof item === "string" ? item : item.name;
                              const avatarUrl = typeof item === "string" 
                                ? "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80" 
                                : item.avatarUrl;

                              let shortLabel = chanName;
                              if (typeof item === "string") {
                                if (chanUrl.includes("@")) {
                                  shortLabel = "@" + chanUrl.split("@")[1]?.split("/")[0]?.split("?")[0];
                                } else if (chanUrl.length > 35) {
                                  shortLabel = chanUrl.substring(0, 35) + "...";
                                }
                              }

                              const isEditingThis = editingChannelUrl === chanUrl;

                              if (isEditingThis) {
                                return (
                                  <div
                                    key={`pinned-chan-edit-${chanUrl}-${idx}`}
                                    className="flex flex-col gap-3 bg-slate-950 p-4 rounded-2xl border-2 border-amber-500 min-w-[280px] w-full max-w-sm font-sans shadow-xl"
                                  >
                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                                      Editar Canal Parceiro ⚙️
                                    </span>
                                    
                                    <div className="space-y-2">
                                      <div>
                                        <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Nome do Canal</label>
                                        <input
                                          type="text"
                                          value={editChannelName}
                                          onChange={(e) => setEditChannelName(e.target.value)}
                                          placeholder="Nome visível"
                                          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-650 focus:outline-none"
                                        />
                                      </div>

                                      <div className="flex items-center gap-2.5 pt-1">
                                        <div className="relative shrink-0">
                                          {editChannelAvatar ? (
                                            <div className="relative group/edit-avatar">
                                              <img 
                                                src={editChannelAvatar} 
                                                alt="Edit profile avatar" 
                                                className="w-10 h-10 rounded-full object-cover border border-amber-500/40 bg-slate-900"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => setEditChannelAvatar("")}
                                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold border border-slate-950 cursor-pointer"
                                                title="Remover foto"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="w-10 h-10 rounded-full border border-dashed border-slate-800 flex items-center justify-center text-slate-500 bg-slate-900/40 text-[9px] text-center px-1">
                                              Sem Foto
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="flex-1">
                                          <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Alterar Foto</label>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleEditAvatarUpload}
                                            className="text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:bg-amber-500/15 file:text-amber-400 hover:file:bg-amber-500/25 file:cursor-pointer cursor-pointer"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingChannelUrl(null);
                                          setEditChannelName("");
                                          setEditChannelAvatar("");
                                        }}
                                        className="py-1 px-3 bg-slate-900 hover:bg-slate-855 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="button"
                                        disabled={editChannelLoading}
                                        onClick={() => handleAdminEditPinnedChannel(chanUrl)}
                                        className="py-1.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-850 disabled:text-slate-600 text-slate-950 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow shadow-amber-950/20"
                                      >
                                        {editChannelLoading ? "Salvando..." : "Salvar"}
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={`pinned-chan-${chanUrl}-${idx}`}
                                  className="flex items-center gap-3 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border-2 border-amber-500/20 pl-2 pr-3.5 py-2 rounded-2xl text-xs text-slate-200 hover:border-amber-500/50 transition-all font-sans shadow-md"
                                >
                                  <img
                                    src={avatarUrl}
                                    alt={shortLabel}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/40 shrink-0 bg-slate-900 shadow"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80";
                                    }}
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <a
                                      href={chanUrl.startsWith("http") ? chanUrl : `https://www.youtube.com/${chanUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-sans font-extrabold text-sm text-amber-400 hover:text-amber-300 hover:underline capitalize max-w-[150px] truncate block"
                                    >
                                      {shortLabel}
                                    </a>
                                    <span className="text-[9px] text-slate-500 truncate block">Fixado Publicamente</span>
                                  </div>
                                  
                                  {userEmail && isUserAdmin(userEmail) && (
                                    <div className="flex items-center gap-1 ml-1.5 border-l border-slate-850 pl-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingChannelUrl(chanUrl);
                                          setEditChannelName(chanName);
                                          setEditChannelAvatar(avatarUrl);
                                        }}
                                        className="text-amber-400 hover:text-amber-300 hover:scale-125 duration-100 font-sans cursor-pointer bg-amber-500/10 hover:bg-amber-500/25 w-5.5 h-5.5 rounded-md flex items-center justify-center text-xs border border-amber-500/10"
                                        title="Editar Nome e Foto"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAdminRemovePinnedChannel(chanUrl)}
                                        className="text-red-400 hover:text-red-200 hover:scale-125 active:scale-95 font-sans cursor-pointer font-bold shrink-0 bg-red-500/10 hover:bg-red-500/30 w-5.5 h-5.5 rounded-md flex items-center justify-center text-xs border border-red-500/20 duration-100"
                                        title="Remover fixagem"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ADICIONAR VÍDEOS DOS CANAIS PARCEIROS PARA TAREFAS */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-550/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-850">
                        <div className="p-2.5 bg-red-600/10 border border-red-500/20 text-red-500 rounded-2xl shrink-0">
                          <PlusCircle className="w-5 h-5 text-red-400 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
                            <span>🤝 Adicionar Vídeos dos Canais Parceiros para Tarefas 🚀</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">Insira novos vídeos ou canais diretamente para as contas dos criadores parceiros realizarem as tarefas na home</p>
                        </div>
                      </div>

                      <form onSubmit={handleAddPartnerChannelVideoSubmit} className="space-y-4 bg-slate-950/45 p-5 rounded-2xl border border-slate-850">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Choose Partner Dropdown */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                              Canal Parceiro Relacionado *
                            </label>
                            <select
                              value={partnerVideoSelectedChannel}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPartnerVideoSelectedChannel(val);
                                const matched = pinnedChannels.find(pc => pc.url === val);
                                if (matched) {
                                  setPartnerVideoChannelTitle(matched.name);
                                  if (partnerVideoType === "subscribe") {
                                    setPartnerVideoUrl(matched.url);
                                  }
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-colors"
                              required
                            >
                              <option value="">-- Selecione o Canal Parceiro --</option>
                              {pinnedChannels.map((pc, idx) => (
                                <option key={`partner-select-task-${idx}`} value={pc.url}>
                                  {pc.name} ({pc.url.includes("@") ? "@" + pc.url.split("@")[1]?.split("/")[0] : "YouTube Canal"})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Task/Action Type Picker */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                              Tipo de Tarefa / Ação *
                            </label>
                            <select
                              value={partnerVideoType}
                              onChange={(e) => {
                                const newType = e.target.value as any;
                                setPartnerVideoType(newType);
                                if (newType === "subscribe" && partnerVideoSelectedChannel) {
                                  setPartnerVideoUrl(partnerVideoSelectedChannel);
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-colors"
                              required
                            >
                              <option value="view">Visualização 📺 (15 moedas)</option>
                              <option value="like">Like 👍 (10 moedas)</option>
                              <option value="comment">Comentário 💬 (20 moedas)</option>
                              <option value="subscribe">Inscrição de Canal 🔔 (25 moedas)</option>
                            </select>
                          </div>

                          {/* Video or Channel URL */}
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                              Link do Vídeo ou Canal no YouTube *
                            </label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={partnerVideoUrl}
                                  onChange={(e) => setPartnerVideoUrl(e.target.value)}
                                  placeholder={partnerVideoType === "subscribe" ? "Ex: https://www.youtube.com/@CanalParceiro" : "Ex: https://www.youtube.com/watch?v=VideoId"}
                                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                                  required
                                />
                              </div>
                              <button
                                type="button"
                                disabled={partnerVideoFetching || !partnerVideoUrl.trim()}
                                onClick={() => handleFetchPartnerVideoInfo(partnerVideoUrl)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl px-4 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 disabled:bg-slate-950 disabled:text-slate-600 disabled:border-slate-900 cursor-pointer"
                              >
                                {partnerVideoFetching ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                    <span>Buscando...</span>
                                  </>
                                ) : (
                                  <>
                                    <Search className="w-3.5 h-3.5" />
                                    <span>Buscar Dados</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <span className="text-[9.5px] text-slate-500 font-mono mt-1 block">
                              {partnerVideoType === "subscribe" 
                                ? "💡 Use o Link do Canal completo para a campanha de inscrição!" 
                                : "💡 Use a URL de vídeo tradicional do YouTube para curtidas, comentários ou visualizações."}
                            </span>
                          </div>

                          {/* Video Title */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                              Título da Tarefa / Vídeo *
                            </label>
                            <input
                              type="text"
                              value={partnerVideoTitle}
                              onChange={(e) => setPartnerVideoTitle(e.target.value)}
                              placeholder="Digite o título visível da tarefa"
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                              required
                            />
                          </div>

                          {/* Channel Title */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                              Nome do Canal Exibido *
                            </label>
                            <input
                              type="text"
                              value={partnerVideoChannelTitle}
                              onChange={(e) => setPartnerVideoChannelTitle(e.target.value)}
                              placeholder="Canal parceiro oficial"
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                              required
                            />
                          </div>

                          {/* Meta Target Count */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                              Meta de Cliques / Tarefas (Quantidade) *
                            </label>
                            <input
                              type="number"
                              min="10"
                              max="10000"
                              value={partnerVideoTarget}
                              onChange={(e) => setPartnerVideoTarget(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-colors"
                              required
                            />
                          </div>

                          {/* Position Ordering option */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                              Ordem de Exibição Prioritária (Opcional)
                            </label>
                            <input
                              type="text"
                              value={partnerVideoPositionIndex}
                              onChange={(e) => setPartnerVideoPositionIndex(e.target.value)}
                              placeholder="Filtro de índice. Ex: 1, 2, 3 (Deixe em branco para livre)"
                              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                            />
                          </div>

                        </div>

                        {partnerVideoError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-450 text-xs rounded-xl font-bold font-sans">
                            ⚠️ {partnerVideoError}
                          </div>
                        )}

                        {partnerVideoSuccess && (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl font-bold font-sans animate-bounce">
                            ✓ {partnerVideoSuccess}
                          </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-slate-900/60 font-sans">
                          <button
                            type="submit"
                            disabled={partnerVideoLoading}
                            className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-650 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-wider transition-all scale-100 active:scale-95 disabled:from-slate-850 disabled:to-slate-850 disabled:text-slate-600 cursor-pointer shadow-lg shadow-red-950/20"
                          >
                            {partnerVideoLoading ? "Carregando Tarefa..." : "Adicionar Vídeo do Parceiro 🚀"}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* CENTRAL DE NOTIFICAÇÕES EM TEMPO REAL */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
                      <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-850">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shrink-0">
                            <Bell className="w-5 h-5 text-amber-400 animate-swing" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
                              <span>Alertas &amp; Notificações de Moedas 🔔</span>
                              <span className="bg-amber-500/20 text-yellow-300 text-[9px] font-mono px-2 py-0.5 rounded-md border border-amber-500/30 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-550 bg-amber-500 animate-ping" />
                                Monitoramento Ativo
                              </span>
                            </h3>
                            <p className="text-[10px] text-slate-400">Sinais sonoros e pop-ups instantâneos no momento em que novos Pix forem emitidos</p>
                          </div>
                        </div>

                        {/* Sound Settings & Chime Test Button */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            onClick={() => {
                              playChimeSound();
                            }}
                            className="text-[10px] bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 text-slate-300 font-bold py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-center"
                            title="Testar sinal sonoro de novos pedidos"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Testar Som</span>
                          </button>

                          <button
                            onClick={() => {
                              const nextVal = !isAudioEnabled;
                              setIsAudioEnabled(nextVal);
                              localStorage.setItem("yt_admin_sound", String(nextVal));
                              if (nextVal) {
                                try {
                                  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                                  if (AudioContext) {
                                    const ctx = new AudioContext();
                                    const osc = ctx.createOscillator();
                                    const gain = ctx.createGain();
                                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                                    gain.gain.setValueAtTime(0.05, ctx.currentTime);
                                    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
                                    osc.connect(gain);
                                    gain.connect(ctx.destination);
                                    osc.start();
                                    osc.stop(ctx.currentTime + 0.2);
                                  }
                                } catch(e){}
                              }
                            }}
                            className={`text-[10px] font-bold py-1.5 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isAudioEnabled 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                : "bg-slate-950 border-slate-800 text-slate-500"
                            }`}
                          >
                            <span>Som:</span>
                            <strong className="uppercase">{isAudioEnabled ? "Sim" : "Não"}</strong>
                          </button>
                        </div>
                      </div>

                      {/* Notification list state indicator */}
                      {recentNotifications.length === 0 ? (
                        <div className="py-6 text-center bg-slate-950/20 border border-slate-850 rounded-2xl text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                          <div className="p-2 bg-slate-900 border border-slate-850 text-slate-400 rounded-full animate-pulse">
                            <Bell className="w-4.5 h-4.5 text-slate-400" />
                          </div>
                          <span>Pronto para capturar! Aguardando novos pagamentos na fila do servidor...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                            <span>Fila do Alerta: <strong>{recentNotifications.length}</strong> ativa(s) na sessão</span>
                            <button
                              onClick={() => setRecentNotifications([])}
                              className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                            >
                              Limpar Notificações
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {recentNotifications.map((notif) => (
                              <div 
                                key={`list-notif-${notif.id}`}
                                className="bg-slate-950 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 flex flex-col gap-2 transition-all relative"
                              >
                                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                <div className="flex items-start gap-2.5">
                                  <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-xl mt-0.5">
                                    <Coins className="w-4 h-4 text-amber-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-extrabold text-white truncate">{notif.buyerName}</span>
                                      <span className="text-[8px] bg-amber-500/15 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold font-mono">NOVO</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono truncate">{notif.userEmail}</div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between bg-slate-900/60 rounded-xl p-2.5 text-[10px] font-mono border border-slate-850">
                                  <span className="text-slate-300 text-[11px]">Pacote: <strong className="text-white">{notif.packageName}</strong></span>
                                  <span className="text-emerald-400 font-bold text-xs">R$ {notif.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="flex justify-end gap-1.5 text-[10px] mt-1">
                                  <button
                                    onClick={async () => {
                                      await handleAdminApprovePayment(notif.id);
                                      handleDismissNotification(notif.id);
                                    }}
                                    disabled={paymentActionLoadingId === notif.id}
                                    className="px-3.5 py-1.5 bg-green-500 hover:bg-green-400 text-slate-950 font-black uppercase rounded-lg transition-all cursor-pointer inline-flex items-center gap-0.5 active:scale-95 text-[9px]"
                                  >
                                    <span>✓ Liberar</span>
                                  </button>
                                  <button
                                    onClick={() => handleDismissNotification(notif.id)}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer text-[9px]"
                                  >
                                    Dispensar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RELATÓRIOS DO SISTEMA (ADM COOPERATIVO) */}
                    <AdminReports
                      reports={adminReports}
                      loading={loadingReports}
                      onRefresh={fetchAdminReports}
                      adminEmail={userEmail}
                    />

                    {/* HOMOLOGAÇÃO MANUAL DE DEPOSITOS (PIX WHATSAPP) */}
                    <div className="bg-slate-900/85 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/20 rounded-3xl p-6 space-y-4 ring-4 ring-amber-550/10 relative overflow-hidden animate-pulse-subtle">
                      {/* Top Glowing Ribbon */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-red-600 animate-pulse"></div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="bg-amber-500 text-slate-950 text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-2 border border-yellow-300">
                            <span className="inline-block w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                            ⭐ PAINEL DE LIBERAÇÃO DE MOEDAS (PIX MANUAL) ⭐
                          </span>
                          <h3 className="text-base font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
                            <Coins className="w-5 h-5 text-amber-400 animate-spin" />
                            <span>Controle de Ativação do Canal</span>
                            <span className="bg-amber-500/20 text-yellow-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40 animate-bounce">
                              {adminPayments.filter((p: any) => p.status === "pending").length} Pendentes
                            </span>
                          </h3>
                          <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed max-w-2xl">
                            Esta área monitora as solicitações que os usuários enviaram para o seu WhatsApp de suporte <strong>(81) 98533-9119</strong>. Quando o cliente transferir o valor para <strong>Tiago Alves</strong>, basta clicar no botão verde <strong>"✓ Liberar"</strong> abaixo para depositar as moedas na conta do usuário no mesmo segundo!
                          </p>
                        </div>
                      </div>

                      {adminPayments.length === 0 ? (
                        <div className="py-8 text-center bg-slate-950/20 border border-slate-850 rounded-2xl text-xs text-slate-500">
                          Nenhum pedido de Pix registrado no banco de dados ainda.
                        </div>
                      ) : (
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-850 text-slate-500 font-mono text-[10px] uppercase">
                                <th className="pb-3 pr-2">Comprador</th>
                                <th className="pb-3 pr-2">E-mail / ID</th>
                                <th className="pb-3 pr-2">Pacote / Valor</th>
                                <th className="pb-3 pr-2">Quant.</th>
                                <th className="pb-3 pr-2 text-center">Status</th>
                                <th className="pb-3 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850/60 font-sans">
                              {adminPayments.map((p: any) => (
                                <tr key={p.id} className="hover:bg-slate-900/20">
                                  <td className="py-3.5 pr-2 font-bold text-white">
                                    {p.buyerName}
                                  </td>
                                  <td className="py-3.5 pr-2">
                                    <div className="font-mono text-slate-300">{p.userEmail}</div>
                                    <div className="text-[9px] text-slate-500 font-mono">{p.id}</div>
                                  </td>
                                  <td className="py-3.5 pr-2">
                                    <div className="font-semibold text-slate-200">{p.packageName}</div>
                                    <div className="text-amber-400 font-mono text-[10px] font-bold">R$ {p.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                                  </td>
                                  <td className="py-3.5 pr-2">
                                    <span className="font-mono bg-slate-950 px-2 py-1 rounded border border-slate-850 text-white font-extrabold text-[10px]">
                                      +{p.coins.toLocaleString()} moedas
                                    </span>
                                  </td>
                                  <td className="py-3.5 pr-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase border ${
                                      p.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse" :
                                      p.status === "approved" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                      "bg-red-500/10 text-red-400 border-red-500/20"
                                    }`}>
                                      {p.status === "pending" ? "Pendente" : p.status === "approved" ? "Aprovado" : "Recusado"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 text-right space-x-2 whitespace-nowrap">
                                    {p.status === "pending" ? (
                                      <>
                                        <button
                                          onClick={() => handleAdminApprovePayment(p.id)}
                                          disabled={paymentActionLoadingId !== null}
                                          className="px-4 py-2 bg-green-500 hover:bg-green-400 text-slate-950 text-[11px] font-black uppercase rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-45 ring-2 ring-green-300"
                                        >
                                          {paymentActionLoadingId === p.id ? "Liberando..." : "✓ Liberar Moedas"}
                                        </button>
                                        <button
                                          onClick={() => handleAdminRejectPayment(p.id)}
                                          disabled={paymentActionLoadingId !== null}
                                          className="px-3 py-2 bg-slate-950 hover:bg-red-950 hover:text-white text-slate-400 text-[10px] font-bold uppercase rounded-xl border border-slate-800 hover:border-red-900 transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-45"
                                        >
                                          Recusar
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-[11px] text-green-400 font-black font-mono uppercase bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/20">
                                        Liberado ✨
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* AUDITORIA DE AÇÕES DO SISTEMA (LOGS REAL-TIME) */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-44 h-44 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
                            <Shield className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                            <span>Registro de Auditoria de Ações (Logs Real-Time) 🛡️</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">Rastreamento contínuo de cliques no botão de confirmação e ações do ADM</p>
                        </div>
                        <span className="text-[9px] font-mono bg-slate-950 px-2.5 py-1 rounded-lg text-slate-400 border border-slate-800 uppercase tracking-widest animate-pulse">
                          ● Live Monitoring
                        </span>
                      </div>

                      {adminAuditLogs.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500 font-mono">
                          Nenhum evento registrado na auditoria do servidor ainda.
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {adminAuditLogs.map((log) => {
                            const dateStr = new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            });
                            
                            return (
                              <div
                                key={log.id}
                                className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-mono hover:border-slate-800 transition-colors"
                              >
                                <div className="flex items-start sm:items-center gap-2 max-w-3xl">
                                  <span className="text-slate-500 shrink-0 select-none">[{dateStr}]</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase shrink-0 ${
                                    log.type === "payment_created" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                    log.type === "payment_approved" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                                    "bg-red-500/10 text-red-500 border border-red-500/20"
                                  }`}>
                                    {log.type === "payment_created" ? "CONFIRMADO" :
                                     log.type === "payment_approved" ? "APROVADO" : "RECUSADO"}
                                  </span>
                                  <p className="text-slate-300 leading-normal">{log.message}</p>
                                </div>
                                <div className="text-[9px] text-slate-500 text-right shrink-0">
                                  {log.userEmail}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Admin active videos feed */}
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
                            <span>Gerenciamento Geral de Vídeos / Campanhas Ativas</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">Controles de entrega ultra prioritária no ViralTubePro</p>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-slate-300 self-start sm:self-auto">
                          Total: {campaigns.length} ativos
                        </span>
                      </div>

                      {/* Sub tab switcher for Admin */}
                      <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-850 overflow-x-auto">
                        {(["all", "view", "like", "comment", "subscribe"] as const).map((tab) => {
                          const labels: Record<string, string> = {
                            all: "Todos",
                            view: "Views 📺",
                            like: "Likes 👍",
                            comment: "Comentários 💬",
                            subscribe: "Inscrição 🔔",
                          };
                          const count = campaigns.filter(c => tab === "all" || c.type === tab).length;
                          return (
                            <button
                              key={`admin-subtab-${tab}`}
                              onClick={() => setAdminActiveTab(tab)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                adminActiveTab === tab
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/10 scale-105"
                                  : "text-slate-400 hover:text-white hover:bg-slate-900"
                              }`}
                            >
                              <span>{labels[tab]}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold ${
                                adminActiveTab === tab ? "bg-slate-950/20 text-slate-950" : "bg-slate-900 text-slate-500"
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {campaigns.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-slate-850 bg-slate-950/40 rounded-3xl flex flex-col items-center justify-center p-6 space-y-3">
                          <Tv className="w-10 h-10 text-slate-700 animate-pulse" />
                          <h4 className="font-bold text-xs text-slate-300">Nenhuma tarefa no sistema</h4>
                          <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                            Comece criando um projeto de impulso direto de um dos botões ou painéis!
                          </p>
                        </div>
                      ) : (
                        <>
                          {campaigns.filter((c) => (adminActiveTab === "all" || c.type === adminActiveTab)).length === 0 ? (
                            <div className="py-12 text-center border border-dashed border-slate-850 bg-slate-950/20 rounded-3xl text-xs text-slate-500 font-sans">
                              Nenhuma tarefa ativa nesta aba/categoria de filtro no momento.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {campaigns
                                .filter((c) => (adminActiveTab === "all" || c.type === adminActiveTab))
                                .sort((a, b) => {
                                  // Pinned first
                                  const pinA = a.isPinned ? 1 : 0;
                                  const pinB = b.isPinned ? 1 : 0;
                                  if (pinA !== pinB) return pinB - pinA;

                                  // Position index ascending
                                  const indexA = a.positionIndex !== undefined && a.positionIndex !== null ? a.positionIndex : Infinity;
                                  const indexB = b.positionIndex !== undefined && b.positionIndex !== null ? b.positionIndex : Infinity;
                                  if (indexA !== indexB) return indexA - indexB;

                                  // Falls back to creation date
                                  const timeA = new Date(a.createdAt || 0).getTime();
                                  const timeB = new Date(b.createdAt || 0).getTime();
                                  return timeB - timeA;
                                })
                                .map((camp) => {
                                  const percentage = Math.floor((camp.currentCount / camp.targetCount) * 100);
                                  return (
                                    <div
                                      key={camp.id}
                                      className="bg-slate-900/40 border border-slate-800 hover:border-slate-750 transition-all rounded-3xl p-5 flex flex-col justify-between group relative overflow-hidden"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-lg border border-opacity-30 ${
                                              camp.type === "view" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                                              camp.type === "like" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                              camp.type === "comment" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                                              "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                            }`}>
                                              {camp.type === "view" ? "Visualizações" :
                                               camp.type === "like" ? "Likes" :
                                               camp.type === "comment" ? "Comentar" : "Inscrição"}
                                            </span>
                                            {camp.isPinned && (
                                              <span className="text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg flex items-center gap-0.5 animate-pulse-subtle">
                                                📌 Fixado
                                              </span>
                                            )}
                                            {camp.isPartnerChannel && (
                                              <span className="text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg flex items-center gap-0.5 animate-pulse shrink-0">
                                                🤝 Parceiro
                                              </span>
                                            )}
                                            {camp.positionIndex !== undefined && camp.positionIndex !== null && (
                                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 bg-slate-850 text-slate-350 border border-slate-800 rounded-lg">
                                                Ordem: #{camp.positionIndex}
                                              </span>
                                            )}
                                            {/* Order reordering fast-controls for ADM */}
                                            {isUserAdmin(userEmail) && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMoveCampaignOrder(camp.id, "up");
                                                  }}
                                                  className="p-1 px-2 bg-slate-950 hover:bg-slate-800 text-[9px] font-black text-amber-400 hover:text-amber-300 rounded border border-slate-850 cursor-pointer transition-all duration-150"
                                                  title="Mover para Cima (Subir)"
                                                >
                                                  ▲
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMoveCampaignOrder(camp.id, "down");
                                                  }}
                                                  className="p-1 px-2 bg-slate-950 hover:bg-slate-800 text-[9px] font-black text-amber-400 hover:text-amber-300 rounded border border-slate-850 cursor-pointer transition-all duration-150"
                                                  title="Mover para Baixo (Descer)"
                                                >
                                                  ▼
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 font-bold">
                                            +{camp.creditsReward} moedas
                                          </span>
                                        </div>

                                        {camp.type !== "subscribe" && (
                                          <div className="relative aspect-video rounded-2xl overflow-hidden mb-3.5 border border-slate-850 bg-slate-950">
                                            <img
                                              src={getThumbnailUrl(camp)}
                                              alt="YouTube Thumbnail"
                                              className="w-full h-full object-cover"
                                              referrerPolicy="no-referrer"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-2.5">
                                              <span className="text-[8px] uppercase tracking-wider font-mono bg-red-600 text-white font-black px-1.5 py-0.5 rounded-md">
                                                CONECTADO AO FLUXO
                                              </span>
                                            </div>
                                          </div>
                                        )}

                                        <h4 className="text-xs font-bold leading-relaxed text-slate-100 group-hover:text-amber-450 group-hover:text-amber-400 transition-colors line-clamp-2">
                                          {camp.title}
                                        </h4>
                                        {isUserAdmin(userEmail) && (
                                          <div className="flex items-center gap-1 mt-2 text-[9.5px] text-slate-500 font-mono">
                                            <span>Dono:</span>
                                            <span className="text-slate-400 truncate max-w-[200px]" title={camp.userEmail}>{camp.userEmail || "Sistema"}</span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="mt-4 pt-3.5 border-t border-slate-850 space-y-3">
                                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                          <span>Meta: {percentage}%</span>
                                          <span>{camp.currentCount} / {camp.targetCount} un</span>
                                        </div>
                                        <div className="w-full bg-slate-950 rounded-full h-1 text-slate-200">
                                          <div
                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                            className={`h-full rounded-full transition-all duration-300 ${
                                              camp.type === "view" ? "bg-red-500" :
                                              camp.type === "like" ? "bg-amber-400" :
                                              camp.type === "comment" ? "bg-green-500" : "bg-indigo-500"
                                            }`}
                                          />
                                        </div>

                                        <div className="grid grid-cols-3 gap-1.5 mt-2 pt-1.5">
                                          <button
                                            onClick={() => handleAdminBoostCampaign(camp.id)}
                                            className="py-1.5 bg-gradient-to-r from-red-600/10 to-red-800/15 hover:from-red-600 hover:to-red-700 hover:text-white text-red-400 text-[9px] font-black uppercase rounded-xl transition-all border border-red-500/20 flex items-center justify-center gap-0.5 cursor-pointer shadow-sm animate-pulse"
                                          >
                                            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                                            <span>Turbo</span>
                                          </button>
                                          
                                          <button
                                            onClick={() => setEditingCampaign(camp)}
                                            className="py-1.5 bg-gradient-to-r from-amber-500/10 to-amber-600/15 hover:from-amber-500 hover:to-amber-600 hover:text-slate-950 text-amber-400 text-[9px] font-black uppercase rounded-xl transition-all border border-amber-500/20 flex items-center justify-center gap-0.5 cursor-pointer shadow-sm"
                                          >
                                            <Edit3 className="w-3 h-3 text-amber-400" />
                                            <span>Alterar</span>
                                          </button>

                                          <button
                                            onClick={(e) => handleAdminDeleteCampaign(camp.id, e)}
                                            className={`py-1.5 text-[9px] font-black uppercase rounded-xl transition-all border flex items-center justify-center gap-0.5 cursor-pointer ${
                                              deletingId === camp.id
                                                ? "bg-red-900/60 hover:bg-red-800 text-white border-red-500 animate-pulse"
                                                : "bg-slate-950 hover:bg-neutral-900 text-slate-400 hover:text-red-400 hover:border-red-500/30 border-slate-850"
                                            }`}
                                          >
                                            <span>{deletingId === camp.id ? "Removendo..." : "Remover"}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* CANAIS PARCEIROS FIXADOS NO SISTEMA */}
                    <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-slate-900/40 to-amber-500/5 border border-amber-500/20 rounded-3xl p-5 relative overflow-hidden backdrop-blur-md shadow-lg shadow-amber-950/10 animate-fade-in">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center gap-3 pb-3 border-b border-amber-500/15">
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl shrink-0">
                          <Pin className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
                            <span>⭐ CANAIS PARCEIROS FIXADOS ⭐</span>
                            <span className="bg-amber-500 text-slate-950 text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse tracking-wide">
                              Verificados pelo ADM
                            </span>
                          </h3>
                          <p className="text-[10px] text-slate-400">Estes canais estrangeiros parceiros estão com suas tarefas públicas liberadas para todos os usuários ganharem moedas!</p>
                        </div>
                      </div>

                      {pinnedChannels && pinnedChannels.length > 0 ? (
                        <div className="flex flex-wrap gap-3.5 pt-3">
                          {pinnedChannels.map((item, idx) => {
                            const chanUrl = typeof item === "string" ? item : item.url;
                            const chanName = typeof item === "string" ? item : item.name;
                            const avatarUrl = typeof item === "string" 
                              ? "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80" 
                              : item.avatarUrl;

                            let displayLabel = chanName;
                            if (typeof item === "string") {
                              const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chanUrl.trim());
                              if (isEmail) {
                                displayLabel = chanUrl;
                              } else if (chanUrl.includes("@")) {
                                const parts = chanUrl.split("@");
                                const handlePart = parts[1] ? parts[1].split("/")[0].split("?")[0] : "";
                                displayLabel = "@" + handlePart;
                              } else if (chanUrl.includes("/channel/")) {
                                const parts = chanUrl.split("/channel/");
                                displayLabel = "Canal ID: " + (parts[1] ? parts[1].split("/")[0].slice(0, 10) + "..." : "");
                              } else if (chanUrl.startsWith("http")) {
                                displayLabel = "Acessar Canal 🌐";
                              } else if (chanUrl.length > 35) {
                                displayLabel = chanUrl.substring(0, 35) + "...";
                              }
                            }

                            return (
                              <div
                                key={`public-pinned-${chanUrl}-${idx}`}
                                className="flex items-center gap-3 bg-gradient-to-br from-slate-900/90 via-slate-950 to-amber-950/20 border-2 border-amber-500/30 hover:border-amber-400/70 pl-2.5 pr-4 py-2 rounded-2xl text-[11px] text-slate-200 transition-all shadow-md group font-medium min-h-[52px]"
                              >
                                <img
                                  src={avatarUrl}
                                  alt={displayLabel}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/40 shrink-0 bg-slate-900 shadow-md group-hover:border-amber-400/80 transition-all"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80";
                                  }}
                                />
                                <div className="flex flex-col min-w-0 max-w-[170px]">
                                  <a
                                    href={chanUrl.startsWith("http") ? chanUrl : `https://www.youtube.com/${chanUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-sans text-xs sm:text-[13px] font-black text-amber-300 hover:text-amber-200 truncate hover:underline tracking-wide transition-colors"
                                    title={displayLabel}
                                  >
                                    {displayLabel}
                                  </a>
                                  <span className="text-[9.5px] text-slate-300 font-bold tracking-wider uppercase opacity-95">Canal Parceiro 🤝</span>
                                </div>
                                
                                {userEmail && isUserAdmin(userEmail) ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAdminRemovePinnedChannel(chanUrl);
                                    }}
                                    className="text-red-400 hover:text-red-200 hover:scale-125 active:scale-95 duration-100 font-sans cursor-pointer font-bold ml-1.5 text-xs shrink-0 bg-red-500/10 hover:bg-red-500/30 w-5.5 h-5.5 rounded-md flex items-center justify-center align-middle border border-red-500/20"
                                    title="Remover canal fixado"
                                  >
                                    ✕
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-amber-500/60 font-mono scale-90 transition-transform group-hover:translate-x-0.5">➔</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="pt-4 pb-2 text-slate-400 font-sans text-xs leading-relaxed max-w-xl">
                          🤝 <strong className="text-amber-400 font-black">Nenhum canal parceiro fixado no momento.</strong>
                          <p className="text-slate-400 text-[10.5px] mt-1">
                            Como Administrador, você pode cadastrar e fixar canais parceiros diretamente na aba <strong className="text-amber-300 bg-amber-500/15 py-0.5 px-2 rounded-lg border border-amber-500/25">Painel ADM Canal 🔑</strong> no topo!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Campaigns Grid Display */}
                    {filteredCampaigns.length === 0 ? (
                      <div className="py-20 text-center border border-dashed border-slate-800 bg-slate-950/40 rounded-3xl flex flex-col items-center justify-center p-6 space-y-3">
                        <Tv className="w-12 h-12 text-slate-600 animate-pulse" />
                        <h3 className="font-bold text-sm text-slate-200">Nenhuma campanha neste filtro no momento</h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Seja o primeiro a carregar uma campanha clicando em "Impulsionar Canal" no topo da página!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredCampaigns.map((camp) => {
                          const percentage = Math.floor((camp.currentCount / camp.targetCount) * 100);
                          const isCompletedByMe = camp.completedUsers.includes(userEmail);

                          return (
                            <div
                              key={camp.id}
                              className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all duration-300 rounded-3xl p-5 flex flex-col justify-between group relative overflow-hidden shadow-sm"
                            >
                              {/* Inner glow */}
                              <div className={`absolute -right-12 -top-12 w-24 h-24 bg-gradient-to-br blur-2xl opacity-10 transition-opacity group-hover:opacity-20 ${
                                camp.type === "view" ? "from-red-500" :
                                camp.type === "like" ? "from-amber-500" :
                                camp.type === "comment" ? "from-green-500" : "from-indigo-500"
                              }`} />

                              <div>
                                {/* Card badge indicators */}
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                                    {camp.type === "view" ? (
                                      <>
                                        <Tv className="w-3.5 h-3.5 text-red-400" />
                                        <span>Visualizar</span>
                                      </>
                                    ) : camp.type === "like" ? (
                                      <>
                                        <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Curtir</span>
                                      </>
                                    ) : camp.type === "comment" ? (
                                      <>
                                        <MessageSquare className="w-3.5 h-3.5 text-green-400" />
                                        <span>Comentar</span>
                                      </>
                                    ) : (
                                      <>
                                        <Bell className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>Inscrever-se</span>
                                      </>
                                    )}
                                    {camp.isPartnerChannel && (
                                      <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white rounded text-[8px] font-sans font-black tracking-wider uppercase animate-pulse shrink-0">
                                        ⚡ PARCEIRO
                                      </span>
                                    )}
                                  </span>

                                  {/* Reward display */}
                                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    <Coins className="w-3 h-3 text-amber-400" />
                                    +{camp.creditsReward}
                                  </span>
                                </div>

                                {/* YouTube Thumbnail Preview */}
                                {camp.type !== "subscribe" && (
                                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-3.5 border border-slate-850 bg-slate-950 shadow-inner">
                                    <img
                                      src={getThumbnailUrl(camp)}
                                      alt="YouTube Thumbnail"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2">
                                      <span className="text-[8px] uppercase tracking-wider font-mono bg-red-600 text-white px-1.5 py-0.5 rounded-md font-bold">
                                        Conexão Youtube Ativa
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Title description */}
                                <h3 className="text-xs font-bold leading-relaxed text-white group-hover:text-red-400 line-clamp-2 transition-colors duration-200">
                                  {camp.title}
                                </h3>
                                <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                                  Canal: {camp.channelTitle}
                                </span>
                              </div>

                              {/* Progress slider bar */}
                              <div className="mt-5 pt-3 border-t border-slate-800">
                                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5">
                                  <span>Meta: {percentage}% completo</span>
                                  <span>
                                    {camp.currentCount}/{camp.targetCount}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    style={{ width: `${Math.min(100, percentage)}%` }}
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      camp.type === "view" ? "bg-red-500" :
                                      camp.type === "like" ? "bg-amber-400" :
                                      camp.type === "comment" ? "bg-green-500" : "bg-indigo-500"
                                    }`}
                                  />
                                </div>

                                {/* CTAs */}
                                <div className="mt-4">
                                  {isCompletedByMe ? (
                                    <div className="p-2 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-2xl text-center text-[10px] flex items-center justify-center gap-1.5 font-bold">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Moedas Coletadas
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (!userEmail) {
                                          setOnboardingOpen(true);
                                        } else {
                                          setActiveTask(camp);
                                        }
                                      }}
                                      className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 duration-205 border border-slate-850 group-hover:bg-red-650/10 group-hover:bg-red-950/20 group-hover:border-red-500/35 text-xs font-bold rounded-2xl border border-slate-800 text-slate-300 group-hover:text-red-450 group-hover:text-red-400 transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      <span>Iniciar Tarefa</span>
                                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400 transition-colors" />
                                    </button>
                                  )}
                                  {isUserAdmin(userEmail) && (
                                    <button
                                      onClick={(e) => handleAdminDeleteCampaign(camp.id, e)}
                                      className={`w-full mt-2 py-2 text-[10px] font-black uppercase rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                                        deletingId === camp.id
                                          ? "bg-red-800 text-white border-red-500 animate-pulse duration-75"
                                          : "bg-red-950/40 text-red-500 hover:bg-red-650/20 border-red-500/30"
                                      }`}
                                    >
                                      <span>{deletingId === camp.id ? "Removendo Tarefa..." : "Remover Tarefa (ADM)"}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right Column: Live Chat & How it works (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Daily Credits Renewal Widget */}
                <div id="daily-renewal-widget" className="bg-gradient-to-br from-indigo-950/20 to-slate-900/45 border border-indigo-500/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-sm shadow-xl">
                  {/* Glowing background circles for visual flair */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-indigo-400 animate-bounce" />
                      <h3 className="font-sans font-extrabold text-sm text-white tracking-tight">Renovação Diária</h3>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase">
                      24 Horas
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    Seus créditos voluntários acabaram? Resgate seu saldo diário premium de +500 moedas grátis a cada 24 horas!
                  </p>

                  {timeToNextRenewal === "Disponível" ? (
                    <button
                      onClick={claimDailyRenewal}
                      className="w-full py-3 bg-gradient-to-r from-indigo-650 from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 shadow-md shadow-indigo-950/20 font-bold text-xs rounded-2xl text-white transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Gift className="w-4 h-4 fill-white" />
                      Resgatar +500 Moedas Grátis!
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 text-center space-y-2">
                        <span className="text-[10px] text-slate-500 font-mono block uppercase">Próximo resgate liberado em</span>
                        <div className="font-mono text-sm font-extrabold text-indigo-400 tracking-wider">
                          {timeToNextRenewal}
                        </div>
                      </div>
                      
                      {/* Cooldown progress bar */}
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div 
                          style={{ width: `${renewalProgress}%` }}
                          className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Real-time chat integration */}
                {activeTab !== "tarefas" && <LiveChat userEmail={userEmail} />}

                {/* How it works card */}
                {activeTab !== "tarefas" && (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur-sm shadow-md">
                    <div className="flex items-center gap-2 mb-3.5">
                      <HelpCircle className="w-5 h-5 text-red-500" />
                      <h3 className="font-sans font-bold text-sm text-slate-100">Como funciona o Viral Tube Pro?</h3>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-mono font-bold text-red-400">1</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          <strong>Assista ou Interaja:</strong> Escolha tarefas brasileiras ativas, assista por 30s ou realize curtidas/inscrições para ganhar moedas de recompensa.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-mono font-bold text-amber-400">2</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          <strong>Ganhe Moedas:</strong> Acumule moedas em sua carteira com cada verificação bem sucedida de gesto orgânico concluído.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-mono font-bold text-indigo-400">3</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          <strong>Cadastre seu Canal:</strong> Use as moedas acumuladas para impulsionar seus próprios vídeos e obter visualizações e likes reais de outros brasileiros!
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                      ⚠️ <strong>Segurança Algorítmica:</strong> Não use bots programados. Nosso sistema cooperativo garante tráfego humano legítimo que ajuda a posicionar melhor seu vídeo na busca do YouTube.
                    </div>
                  </div>
                )}

              </div>
              
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Onboarding Modal Wrapper (Prompt for Nickname) */}
      <AnimatePresence>
        {onboardingOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

              {!isAdminFormActive ? (
                <>
                  <div className="text-center space-y-4 mb-6 pt-3">
                    <div className="inline-flex p-3 bg-red-500/10 text-red-500 rounded-2xl">
                      <Sparkles className="w-6 h-6 animate-pulse text-red-400" />
                    </div>
                    <h2 className="text-lg font-black font-sans text-white tracking-tight text-center w-full">
                      Bem-vindo ao ViralTubePro!
                    </h2>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Para começar a ganhar visualizações reais brasileiras e impulsionar seu canal do YouTube, crie ou acesse seu perfil em instantes!
                    </p>
                  </div>

                  <div className="space-y-4">
                    {isUserAdmin(onboardingEmail) ? (
                      /* Admin Password verification flow ONLY after identified via Google signup/simulate login */
                      <form onSubmit={handleOnboardingSubmit} className="space-y-4 animate-fade-in">
                        <div className="p-4 bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/30 rounded-2xl space-y-2 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-red-600 to-amber-600 text-[9px] font-black text-white rounded-lg uppercase tracking-wider animate-pulse shadow-sm font-sans">
                            ⭐ ADMINISTRADOR DETECTADO
                          </span>
                          <div className="text-[11px] text-white font-mono font-medium">
                            {onboardingEmail}
                          </div>
                          <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                            Por razões de segurança, digite a sua senha de 8 dígitos de administrador abaixo para acessar controles ultra prioritários do painel.
                          </p>
                        </div>

                        <div className="text-left space-y-1.5 font-sans">
                          <label className="text-[10px] text-red-400 font-black uppercase tracking-wider block flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            Chave de Autenticação ADM
                          </label>
                          <input
                            type="password"
                            required
                            autoFocus
                            value={onboardingPassword}
                            onChange={(e) => {
                              setOnboardingPassword(e.target.value);
                              setOnboardingError(null);
                            }}
                            placeholder="Insira a senha de 8 dígitos do ADM"
                            className="w-full bg-slate-950 border border-red-500/50 hover:border-red-400 focus:border-red-400 rounded-xl px-3.5 py-3 text-[11px] font-mono text-white focus:outline-none transition-colors"
                          />
                        </div>

                        {onboardingError && (
                          <div className="p-3 bg-red-900/15 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium font-sans text-center">
                            ⚠️ {onboardingError}
                          </div>
                        )}

                        <div className="space-y-2.5 pt-2">
                          <button
                            type="submit"
                            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-650 font-black text-[11px] rounded-2xl text-white transition-all uppercase tracking-wider cursor-pointer shadow-lg shadow-red-950/20 active:scale-[0.98] font-sans flex items-center justify-center gap-2"
                          >
                            <span>🔓 Acessar Painel ADM</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOnboardingEmail("");
                              setOnboardingPassword("");
                              setOnboardingError(null);
                            }}
                            className="w-full text-center text-[10px] text-slate-400 hover:text-slate-200 font-extrabold uppercase tracking-wide py-1 transition-colors cursor-pointer block font-sans"
                          >
                            ← Cancelar e Voltar pro Login
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Phone Number Forms (Login or registration with client side validation checks) */
                      <div className="space-y-4">
                        <form 
                          onSubmit={handlePhoneAuthSubmit} 
                          className="space-y-4"
                        >
                          {/* Inner Toggle: Login vs Register */}
                          <div className="flex border border-slate-800/80 p-0.5 bg-slate-950/40 rounded-xl font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setPhoneAuthMode("login");
                                setOnboardingError(null);
                                setPhoneVerificationCodeSent(false);
                                setPhoneVerificationCodeInput("");
                                setMockSmsBannerValue(null);
                              }}
                              className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                phoneAuthMode === "login"
                                  ? "bg-slate-800 text-white shadow-sm"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Fazer Login
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPhoneAuthMode("register");
                                setOnboardingError(null);
                                setPhoneVerificationCodeSent(false);
                                setPhoneVerificationCodeInput("");
                                setMockSmsBannerValue(null);
                              }}
                              className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                phoneAuthMode === "register"
                                  ? "bg-slate-800 text-white shadow-sm"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Criar Nova Conta
                            </button>
                          </div>

                          {/* General Credentials Inputs for clean register/login directly */}
                          <div className="space-y-4">
                            {phoneAuthMode === "register" && (
                              <div className="font-sans text-left space-y-1 animate-fade-in">
                                <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                                  Seu Nome ou Apelido
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                                    <User className="w-3.5 h-3.5" />
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Ex: Carlos Albuquerque"
                                    required
                                    value={phoneName}
                                    onChange={(e) => {
                                      setPhoneName(e.target.value);
                                      setOnboardingError(null);
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 font-bold text-xs focus:outline-none focus:border-red-500 transition-colors"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="font-sans text-left space-y-1">
                              <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                                Endereço de E-mail
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                                  <Mail className="w-3.5 h-3.5" />
                                </span>
                                <input
                                  type="email"
                                  placeholder="Ex: carlos@gmail.com"
                                  required
                                  value={phoneInput}
                                  onChange={(e) => {
                                    setPhoneInput(e.target.value);
                                    setOnboardingError(null);
                                  }}
                                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 font-bold text-xs focus:outline-none focus:border-red-500 transition-colors"
                                />
                              </div>
                            </div>

                            <div className="font-sans text-left space-y-1">
                              <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                                Sua Senha
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                                <input
                                  type="password"
                                  placeholder="Mínimo 6 caracteres"
                                  required
                                  value={phonePassword}
                                  onChange={(e) => {
                                    setPhonePassword(e.target.value);
                                    setOnboardingError(null);
                                  }}
                                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 font-bold text-xs focus:outline-none focus:border-red-500 transition-colors"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={phoneAuthLoading}
                              className="w-full py-3 bg-gradient-to-r from-red-650 to-red-800 hover:from-red-500 hover:to-red-700 shadow-md shadow-red-950/20 font-sans font-black text-[11px] rounded-xl text-white transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                            >
                              {phoneAuthLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : phoneAuthMode === "register" ? (
                                "Criar Conta e Acessar"
                              ) : (
                                "Acessar Plataforma"
                              )}
                            </button>
                          </div>
                        </form>

                        {onboardingError && (
                          <div className="p-3 bg-red-900/15 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium font-sans text-center">
                            ⚠️ {onboardingError}
                          </div>
                        )}

                        {/* Gift Callout */}
                        <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl flex items-center gap-3">
                          <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl leading-none select-none shrink-0 border border-amber-500/10 animate-bounce">
                            <Coins className="w-5 h-5" />
                          </div>
                          <div className="text-left font-sans">
                            <h4 className="text-[11px] font-bold text-amber-300">Presente de Boas-vindas!</h4>
                            <p className="text-[9.5px] text-amber-400/80 leading-relaxed mt-0.5">
                              Você receberá instantaneamente <strong className="text-amber-200">1500 moedas grátis</strong> para impulsionar seu canal do YouTube ao entrar com sua nova conta teleoperacional!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleAdminFormSubmit} className="space-y-4">
                  <div className="text-center space-y-3 mb-6 pt-3">
                    <span className="inline-block px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[9px] font-bold rounded-xl uppercase tracking-wider">
                      Painel Administrativo
                    </span>
                    <h2 className="text-lg font-black font-sans text-white tracking-tight w-full text-center">
                      Acesso Restrito ao ADM
                    </h2>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                     Efetue o login preenchendo o e-mail autorizado do administrador (Ex: cpdatividades@gmail.com) e sua Chave de Autenticação de 8 dígitos.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="font-sans text-left">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1.5 uppercase tracking-wide">
                        E-mail do Administrador
                      </label>
                      <input
                        type="text"
                        required
                        value={adminEmail}
                        onChange={(e) => {
                          setAdminEmail(e.target.value);
                          setOnboardingError(null);
                        }}
                        placeholder="Ex: cpdatividades@gmail.com"
                        className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-3 py-2.5 text-[11px] text-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="font-sans text-left">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1.5 uppercase tracking-wide">
                        Chave de Autenticação ADM
                      </label>
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          setOnboardingError(null);
                        }}
                        placeholder="Insira a chave numérica"
                        className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl px-3 py-2.5 text-[11px] text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {onboardingError && (
                      <div className="p-3 bg-red-900/15 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium font-sans text-center">
                        ⚠️ {onboardingError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-red-600 hover:bg-red-500 font-black text-[11px] rounded-2xl text-white transition-all uppercase tracking-wider cursor-pointer shadow-lg shadow-red-950/20 active:scale-[0.98] font-sans"
                    >
                      Entrar no Sistema ADM
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminFormActive(false);
                        setAdminEmail("");
                        setAdminPassword("");
                        setOnboardingError(null);
                      }}
                      className="w-full text-center text-[10px] text-slate-400 hover:text-slate-200 font-extrabold uppercase tracking-wide mt-2 transition-colors cursor-pointer block font-sans"
                    >
                      ← Retornar ao Login por E-mail
                    </button>
                  </div>
                </form>
              )}

              {/* Developer Configuration Overlay Instructions Guide and Simulator popup wrapper */}
              {showGoogleCredentialsHelp && (
                <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-0 text-left relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Dual Tabs Headers */}
                    <div className="grid grid-cols-2 border-b border-slate-800/80 bg-slate-950/60 font-sans">
                      <button
                        onClick={() => {
                          setActiveSimulationTab("sandbox");
                          setSandboxLoginStep("idle");
                        }}
                        className={`py-3.5 text-center text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                          activeSimulationTab === "sandbox"
                            ? "text-red-500 border-b-2 border-red-500 bg-slate-900/40"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        🗝️ Sandbox de Teste
                      </button>
                      <button
                        onClick={() => setActiveSimulationTab("production")}
                        className={`py-3.5 text-center text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                          activeSimulationTab === "production"
                            ? "text-red-500 border-b-2 border-red-500 bg-slate-900/40"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        ⚙️ Produção (Teclas Reais)
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      {activeSimulationTab === "sandbox" ? (
                        <div className="space-y-4">
                          {sandboxLoginStep === "idle" ? (
                            <div className="space-y-4">
                              <div className="text-center space-y-1">
                                <div className="flex items-center justify-center gap-1.5 mb-1 select-none">
                                  <span className="text-blue-500 font-black text-lg font-sans">G</span>
                                  <span className="text-red-500 font-black text-lg font-sans">o</span>
                                  <span className="text-yellow-500 font-black text-lg font-sans">o</span>
                                  <span className="text-blue-500 font-black text-lg font-sans">g</span>
                                  <span className="text-green-500 font-black text-lg font-sans">l</span>
                                  <span className="text-red-500 font-black text-lg font-sans">e</span>
                                </div>
                                <h3 className="text-xs font-black text-white uppercase tracking-wider">Simulador de Login Seguro</h3>
                                <p className="text-[10.5px] text-slate-400 max-w-xs mx-auto leading-relaxed font-sans">
                                  Como este é um ambiente seguro do AI Studio sandbox, escolha ou digite uma conta abaixo para testar o fluxo de autenticação do Google instantaneamente:
                                </p>
                              </div>

                              {/* Google accounts chooser lists */}
                              <div className="space-y-2 pt-1 font-sans">
                                {/* Partner Channel */}
                                <button
                                  onClick={() => handleSandboxAccountClick("usuario.google@gmail.com")}
                                  className="w-full p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-red-500/20 rounded-2xl flex items-center justify-between text-left transition-all group active:scale-[0.99] cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-blue-950/30">
                                      PF
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-extrabold text-white group-hover:text-blue-400 transition-colors">Pagamento Fácil Oficial</div>
                                      <div className="text-[9.5px] text-slate-400 font-mono">usuario.google@gmail.com</div>
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-[8.5px] font-bold rounded-lg leading-none">
                                    ⚡ PARCEIRO
                                  </span>
                                </button>

                                {/* User account 2 */}
                                <button
                                  onClick={() => handleSandboxAccountClick("criador.vlogs@gmail.com")}
                                  className="w-full p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-red-500/20 rounded-2xl flex items-center justify-between text-left transition-all group active:scale-[0.99] cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-amber-950/30 font-sans">
                                      MV
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-extrabold text-white group-hover:text-amber-400 transition-colors">Mariana Vlogs</div>
                                      <div className="text-[9.5px] text-slate-400 font-mono">criador.vlogs@gmail.com</div>
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[8.5px] font-bold rounded-lg leading-none">
                                    🔥 INFLUENCER
                                  </span>
                                </button>

                                {/* Custom simulation interactive input */}
                                <div className="p-3 bg-slate-950/30 border border-slate-850/60 rounded-2xl space-y-2">
                                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono text-left">
                                    Ou digite seu próprio e-mail do Google:
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="email"
                                      value={simulationEmailInput}
                                      onChange={(e) => setSimulationEmailInput(e.target.value)}
                                      placeholder="Ex: seu-canal@gmail.com"
                                      className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500/60 rounded-xl px-3 py-2 text-[10.5px] text-white focus:outline-none transition-colors font-sans"
                                    />
                                    <button
                                      disabled={!simulationEmailInput.trim().includes("@")}
                                      onClick={() => handleSandboxAccountClick(simulationEmailInput)}
                                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-[10px] font-extrabold rounded-xl transition-colors uppercase tracking-wider cursor-pointer font-sans"
                                    >
                                      Entrar
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="text-[9.5px] text-slate-500 leading-relaxed font-sans bg-slate-950/20 p-2.5 rounded-xl border border-slate-850/30 text-left">
                                💡 <strong>Aviso Importante:</strong> Esta simulação realiza o login seguro de teste. Qualquer e-mail inserido gerará uma conta válida no sistema com o presente de <strong>1500 moedas de boas-vindas</strong>!
                              </div>
                            </div>
                          ) : (
                            <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                              {/* Glowing colorful authentic spinner */}
                              <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-950" />
                                <div className={`absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-red-500 border-b-yellow-500 border-l-green-500 animate-spin transition-all duration-300 ${
                                  sandboxLoginStep === "success" ? "scale-90 border-emerald-500" : ""
                                }`} />
                              </div>

                              <div className="space-y-2 max-w-xs">
                                <h4 className="text-white text-xs font-black uppercase tracking-wider font-mono">
                                  Autenticação em Andamento
                                </h4>
                                <p className="text-[11px] text-red-400 font-sans font-medium h-8 flex items-center justify-center animate-pulse">
                                  {sandboxLoginStep === "connecting" && "🔄 Conectando aos Serviços Google Identity IDP..."}
                                  {sandboxLoginStep === "authorizing" && "🔐 Solicitando escopos e efetuando Handshake OIDC..."}
                                  {sandboxLoginStep === "success" && "✅ Autenticado com êxito! Sincronizando com o YouTube..."}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center space-y-1">
                            <div className="inline-flex p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                              <svg className="w-5 h-5 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">Habilitar Google Sign-In REAL</h3>
                            <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed font-sans">
                              Para colocar logins autenticados reais em produção na nuvem, você deve obter e anexar suas credenciais oficiais do Google Cloud:
                            </p>
                          </div>

                          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3.5 text-[10.5px] leading-relaxed text-slate-300 font-sans">
                            <div>
                              <strong className="text-amber-400">1. Obtenha as Credenciais:</strong>
                              <p className="text-slate-400 text-[10px] mt-0.5">Acesse o <strong>Google Cloud Console</strong> &gt; APIs &amp; Services &gt; Credentials, crie um <strong>ID do cliente OAuth 2.0 (Aplicativo Web)</strong>.</p>
                            </div>
                            <div>
                              <strong className="text-amber-400">2. Insira as Secrets do Applet:</strong>
                              <p className="text-slate-400 text-[10px] mt-0.5">Abra a aba de <strong>Settings (Configurações)</strong> no menu esquerdo e adicione as seguintes Secrets:</p>
                              <div className="mt-1.5 p-2 bg-slate-900 border border-slate-800 rounded-xl space-y-1 font-mono text-[9px] text-amber-200">
                                <div>• GOOGLE_CLIENT_ID = <span className="text-slate-500">seu_client_id.apps.googleusercontent.com</span></div>
                                <div>• GOOGLE_CLIENT_SECRET = <span className="text-slate-500">sua_chave_secreta_google</span></div>
                              </div>
                            </div>
                            <div>
                              <strong className="text-amber-400">3. Redirect URI (URI de Redirecionamento):</strong>
                              <p className="text-slate-400 text-[10px] mt-0.5">Cadastre a seguinte URL autorizada no console Google Cloud:</p>
                              <div className="text-red-400 select-all font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-[9px] inline-block mt-1 w-full break-all">
                                {`${window.location.origin}/auth/callback/google`}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800/60 flex flex-col gap-2">
                        <button
                          onClick={() => setShowGoogleCredentialsHelp(false)}
                          className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-[10.5px] rounded-xl transition-all uppercase tracking-wider cursor-pointer text-center font-sans"
                        >
                          Retornar ao Login Google
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Tour Guide */}
      <InteractiveTour
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        userCredits={userCredits}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveTask(null);
        }}
      />

      {/* Create Campaign Modal */}
      {isCreateModalOpen && (
        <CreateCampaignModal
          onClose={() => setIsCreateModalOpen(false)}
          userCredits={isUserAdmin(userEmail) ? 999999999 : userCredits}
          deductCredits={handleDeductCredits}
          onCampaignCreated={(newCamp) => {
            setCampaigns((prev) => [newCamp, ...prev]);
            fetchCampaigns();
            triggerCoinEarnedAnimation(10);
          }}
          userEmail={userEmail}
          onOutOfCredits={() => {
            setIsCreateModalOpen(false);
            setActiveTab("buy-coins");
            setActiveTask(null);
            setIsOutOfCreditsModalOpen(true);
          }}
        />
      )}

      {/* Out of Credits Modal Pop-up */}
      <AnimatePresence>
        {isOutOfCreditsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOutOfCreditsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 25 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl z-10 text-center font-sans"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
              
              <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mb-4">
                <Coins className="w-8 h-8 text-amber-400 animate-bounce fill-amber-400" />
              </div>

              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Saldo de Moedas Esgotado! 💰
              </h3>
              
              <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                Seu saldo de moedas acabou! Para continuar criando incríveis campanhas de impulsionamento e ganhar visualizações, curtidas, comentários ou inscritos rápidos, você pode comprar mais moedas via Pix de forma imediata!
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOutOfCreditsModalOpen(false);
                    setActiveTab("buy-coins");
                    setActiveTask(null);
                  }}
                  className="w-full py-3 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
                >
                  🛒 Ir para Comprar Moedas (Pix)
                </button>
                <button
                  type="button"
                  onClick={() => setIsOutOfCreditsModalOpen(false)}
                  className="w-full py-2.5 text-slate-400 hover:text-white text-xs font-bold font-sans hover:underline transition-colors cursor-pointer"
                >
                  Voltar e ganhar moedas grátis fazendo tarefas
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <EditCampaignModal
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onCampaignUpdated={(updatedCamp) => {
            setCampaigns((prev) => prev.map((c) => c.id === updatedCamp.id ? updatedCamp : c));
            fetchCampaigns();
          }}
        />
      )}

      {/* Dynamic Pop-up Modal for Coins Received (Gifts or Deposit approvals) */}
      <AnimatePresence>
        {coinsReceivedModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop wrapper */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCoinsReceivedModal(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Glass Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden z-10"
            >
              {/* Decorative light bars */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-rose-500" />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Glowing Animated Icon */}
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-500/10 to-yellow-500/20 border-2 border-amber-500/30 flex items-center justify-center mb-5 relative">
                <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 animate-bounce fill-amber-500/20" />
                <Sparkles className="w-5 h-5 text-yellow-300 absolute -top-1 -right-1 animate-spin" />
              </div>

              {/* Title / Celebration */}
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight font-sans">
                {coinsReceivedModal.isGift ? "🎁 PRESENTE DO ADMINISTRADOR!" : "⚡ DEPÓSITO CONFIRMADO!"}
              </h3>
              
              <p className="text-[11px] sm:text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                {coinsReceivedModal.isGift 
                  ? "Parabéns! O administrador do aplicativo enviou moedas adicionais diretamente como presente especial para você!"
                  : "Seu pagamento foi confirmado pelo ADM do ViralTubePro e as moedas já foram creditadas!"}
              </p>

              {/* Highlighting Card */}
              <div className="my-5 sm:my-6 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider">SALDO REABASTECIDO</span>
                
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-500 tracking-tight font-sans">
                    +{coinsReceivedModal.coins.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-xs font-bold text-amber-400">moedas</span>
                </div>

                <div className="mt-1.5 text-[9px] text-slate-500 font-mono">
                  Campanha: {coinsReceivedModal.packageName}
                </div>
              </div>

              {/* Indicator of real-time credit status */}
              <p className="text-[10px] sm:text-[11px] text-emerald-400 font-bold mb-6 flex items-center gap-1.5 justify-center">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Disponível imediatamente no seu saldo!
              </p>

              {/* Confirm Action Button */}
              <button
                onClick={() => {
                  setCoinsReceivedModal(null);
                  playChimeSound();
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-950/20 border border-amber-400/20 uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                Divulgar Meus Vídeos Agora! 🚀
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Animated Coin Earned Notice toast */}
      <AnimatePresence>
        {earnedNotification !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className={`fixed bottom-24 right-5 sm:right-6 z-50 bg-gradient-to-r ${
              earnedNotification.type === "spend"
                ? "from-rose-600 to-red-700 border-rose-500 text-white"
                : "from-amber-500 to-yellow-600 border-amber-400 text-neutral-950"
            } border rounded-2xl p-4 px-5 shadow-2xl flex items-center gap-3`}
          >
            <div className="p-2 bg-white/20 rounded-xl">
              <Coins className="w-6 h-6 animate-pulse text-white" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">
                {earnedNotification.type === "spend" ? "Campanha Acelerada!" : "Moedas Creditadas!"}
              </h4>
              <p className={`text-[11px] font-sans font-medium ${
                earnedNotification.type === "spend" ? "text-rose-100" : "text-amber-950"
              }`}>
                {earnedNotification.type === "spend" ? (
                  <>Você gastou <strong className="font-extrabold">{earnedNotification.amount}</strong> moedas para impulsionar.</>
                ) : (
                  <>Parabéns! Você ganhou <strong className="font-extrabold">+{earnedNotification.amount}</strong> moedas de recompensa cooperativa.</>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Real-Time Transaction Popups */}
      {isUserAdmin(userEmail) && (
        <div className="fixed top-24 right-5 sm:right-6 z-50 flex flex-col gap-3 max-w-sm w-full md:w-[380px] pointer-events-none">
          <AnimatePresence>
            {recentNotifications.map((notif) => (
              <motion.div
                key={`popup-notif-${notif.id}`}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                className="pointer-events-auto bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 relative overflow-hidden backdrop-blur-md ring-4 ring-amber-500/10"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 animate-pulse" />
                
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl shrink-0 animate-bounce">
                      <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                        <span>⚡ Comprei Moedas!</span>
                        <span className="bg-red-500/20 text-red-400 text-[8px] px-1.5 py-0.5 rounded-md border border-red-500/30 animate-pulse font-mono">LIVE</span>
                      </h4>
                      <p className="text-xs text-slate-100 font-bold mt-1">
                        {notif.buyerName}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate max-w-[200px]">
                        {notif.userEmail}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDismissNotification(notif.id)}
                    className="p-1 hover:bg-slate-850 text-slate-500 hover:text-slate-300 rounded-lg shrink-0 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-850 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Moedas</span>
                    <strong className="text-white text-sm">+{notif.coins.toLocaleString()}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Valor</span>
                    <strong className="text-emerald-400 text-sm">R$ {notif.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  <button
                    onClick={async () => {
                      await handleAdminApprovePayment(notif.id);
                      handleDismissNotification(notif.id);
                    }}
                    disabled={paymentActionLoadingId === notif.id}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-lg transition-all text-center flex items-center justify-center gap-1 active:scale-95 text-[10px] cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>✓ Liberar</span>
                  </button>
                  <button
                    onClick={() => handleDismissNotification(notif.id)}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all text-center text-[10px] cursor-pointer"
                  >
                    Dispensar
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Floating WhatsApp Support button on the bottom right */}
      {userEmail && (
        <motion.a
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          href="https://api.whatsapp.com/send?phone=5581985339119&text=Olá! Preciso de ajuda ou suporte técnico no aplicativo ViralTubePro."
          target="_blank"
          rel="noopener noreferrer"
          title="Falar com Suporte WhatsApp"
          className="fixed bottom-6 right-5 sm:right-6 z-50 p-2.5 px-4 rounded-full shadow-2xl flex items-center gap-2 border cursor-pointer transition-all duration-300 bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 text-white font-sans font-bold text-xs shadow-emerald-950/45"
        >
          <MessageCircle className="w-4 h-4 text-white" />
          <span>WhatsApp Suporte</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
          </span>
        </motion.a>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-8 mt-16 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 ViralTubePro • Rede Livre de Crescimento e Impulso de Canais.</p>
          <p className="text-[10px] text-slate-600 max-w-md mx-auto leading-relaxed">
            Nossa plataforma conecta criadores independentes em uma rede voluntária e privada de troca de visualizações reais. O YouTube proíbe fazendas de clique e bots; por isso fornecemos automação de fluxo de sugestões cooperadas humanas para incentivar crescimento ético.
          </p>
        </div>
      </footer>

    </div>
  );
}
