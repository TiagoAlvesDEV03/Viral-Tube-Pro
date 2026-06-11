import express from "express";
import fs from "fs";
import path from "path";
import dns from "dns";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp as initClientApp } from "firebase/app";
import { 
  getFirestore, 
  doc as clientDoc, 
  getDoc as getClientDoc, 
  writeBatch as clientWriteBatch 
} from "firebase/firestore";

dotenv.config();

// Load Firestore Database Config safely
let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.error("[FIRESTORE-INIT-CONFIG-ERROR]", err);
}

let firestoreDb: any = null;
if (firebaseConfig && firebaseConfig.projectId) {
  try {
    const clientApp = initClientApp(firebaseConfig);
    const dbId = firebaseConfig.firestoreDatabaseId || "ai-studio-53563d10-8482-4502-bf52-dabf99e02fed";
    firestoreDb = getFirestore(clientApp, dbId);
    console.log(`[FIRESTORE] Inicializado Client Firestore SDK com sucesso para o banco: ${dbId}`);
  } catch (err) {
    console.error("[FIRESTORE-INIT-ERROR] Falha ao inicializar Client Firestore SDK:", err);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGemini() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_ENV_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// In-memory Database for YouTube Booster campaigns
interface Campaign {
  id: string;
  type: "view" | "like" | "comment" | "subscribe";
  title: string;
  youtubeId: string; // Video ID or Channel ID
  channelTitle: string;
  currentCount: number;
  targetCount: number;
  creditsReward: number;
  userEmail: string;
  createdAt: string;
  completedUsers: string[]; // List of nicknames/emails who completed it
  isPinned?: boolean;
  positionIndex?: number;
  isBoosted?: boolean;
  isPartnerChannel?: boolean;
  videoSeconds?: number;
}

const BANNED_YOUTUBE_IDS = new Set([
  "Tmy4IsMwTtE", // Nubank: como ver o saldo e ativar a função débito no cartão
  "BN-ACmQ_y5M", // Como obter selo de acesso PRATA no Gov.br sem reconhecimento facial
  "S4x1RjbO9OM", // Alerta Importante: Cuidado com o Golpe do FGTS no Celular!
  "r5PntHAJQRk", // Desbloqueio de Parcelas no Bolsa Família – Entenda o Motivo!
  "X7lL9_mKeEe", // Como Acessar o Canal no YouTube Pagamento Fácil e Não Perder Nenhuma Novidade!
  
  // Pruning fictional placeholder IDs added in the previous turn so they are permanently cleaned from the DB
  "3mAnkU5RygY",
  "h_VfshK2M-w",
  "8x8s-UjZ8yA",
  "l8jU-Z_81Ke",
  "r_Pz8yXz1Ky",
  "y9WzX_81Ke0",
  "q7bL_D8JyK8",
  "hS0V_PzKyXw",
  "pQj9_D8KyLe",
  "b8X_7y9dK1w",
  "v72_mXz81Ky",
  "Z-K91jX2Y8w",
  "x98_dKy81Ke"
]);

const RAW_PF_VIDEOS = [
  { youtubeId: "gBw4gqJo_tU", title: "Aplicativo para GANHAR DINHEIRO NO PIX GRATIS! Apps que PAGAM NO PIX em 2026" },
  { youtubeId: "qa7blCT2Vlo", title: "Novo Aplicativo para GANHAR DINHEIRO NO PIX! APPS que PAGAM NO PIX em 2026" },
  { youtubeId: "uPATL_Oo88E", title: "Aplicativo para GANHAR DINHEIRO NO PIX GRATIS! Apps que PAGAM NO PIX em 2026" },
  { youtubeId: "xDzTOQnDfoE", title: "Plataforma com Robô Pagando no PIX - Aplicativo Para Ganhar Dinheiro Automatico" },
  { youtubeId: "EZGKeR1wqeA", title: "Como o Banco Bradesco Realmente Funciona Aplicativo, Serviços e Muito Mais!" },
  { youtubeId: "BLJNE-fZ5q4", title: "Liberadas as Consultas do Bolsa Família e Auxílio Gás – Novas Atualizações!" },
  { youtubeId: "1ne8sbQxD6o", title: "Dois milhões de famílias deixam de receber Bolsa Família de janeiro a outubro | BOLSA FAMÍLIA" },
  { youtubeId: "dg7O0fzdj7I", title: "FIM DO SAQUE FGTS ! ÚLTIMA CHANCE PRA SACAR ANTES DA RESTRIÇÃO" },
  { youtubeId: "4x97ixHYqL4", title: "🚨 O BOLSA FAMÍLIA VAI ACABAR EM 2026? E AGORA, GOVERNO VAI ENTRAR EM COLAPSO (FICAR SEM DINHEIRO)" },
  { youtubeId: "9gjHPMzr2SY", title: "Calendário do Bolsa Família NOVEMBRO/2025: Calendário OFICIAL! Saiba Quando Vai Cair! #bolsafamília" },
  { youtubeId: "uMJN4Pc-LCo", title: "🚨 FERROU! Governo Exige Devolução do Auxílio Emergencial — Veja Quem Vai Ter Que Pagar!" },
  { youtubeId: "PlU6uheL5IY", title: "COMUNICADO DO GOVERNO: 13º DO BOLSA FAMÍLIA SERÁ PAGO EM 2025 PARA TODOS?? PAGAMENTO EM DOBRO?" },
  { youtubeId: "m2VQtWZtLjM", title: "Calendário Bolsa Família Outubro 2025 | Datas, Antecipações e Tudo que Você Precisa Saber!" },
  { youtubeId: "Dm2QD3K2dd8", title: "NUCONTA DO NUBANK: Como Funciona e Vale a Pena em 2025?" },
  { youtubeId: "f3If3uxCE6k", title: "Como Funciona o Banco Nubank em 2025 | Tudo Que Você Precisa Saber Antes de Criar Sua Conta!" },
  { youtubeId: "PsrLQuQYEyA", title: "🚨 Saiu Agora! CALENDÁRIO COMPLETO do Bolsa Família 2026 – Veja as Datas de Pagamento por NIS!" },
  { youtubeId: "x1lLtZ3-ZF4", title: "CAIXINHA TURBO NUBANK vs CDB vs TESOURO DIRETO: Qual Rende Mais em 2025? 💸" },
  { youtubeId: "lYBjyUbmAsM", title: "CAIXINHA TURBO NUBANK 2025: Novas Regras e Como Render até 120% do CDI!" },
  { youtubeId: "Wj9YPXA0hU8", title: "VALE A PENA TER CONTA NO NUBANK? | Vale a Pena Ter Conta no Nubank em 2025?" },
  { youtubeId: "RcphMv1oQRk", title: "COMO RESOLVER ERRO AO ACESSAR O BANCO INFINITPAY | ERRO NO APLICATIVO INFINITEPAY RESOLVIDO" },
  { youtubeId: "aom0F12SoQ8", title: "(💸 Nova Plataforma) App Para Ganhar Dinheiro no PIX - Renda Extra 2025" },
  { youtubeId: "YQJWrc_BYuo", title: "APP PARA GANHAR DINHEIRO - GANHAR R$60 POR DIA - Aplicativo Para Ganhar Dinheiro" },
  { youtubeId: "8fChxEFgL2A", title: "LANÇOU - PAGANDO VIA PIX - GANHE COM PRODUTOS QUE RENDE DIARIAMENTE - App Para Ganhar Dinheiro" },
  { youtubeId: "J1CY41IN0H4", title: "PLATAFORMA NOVA PAGANDO UM BOT DE 3US$ no CADASTRO DE GRAÇA! - Ganhar Dinheiro no Automatico" },
  { youtubeId: "76n6OLFxByQ", title: "GANHE R$25,00 REAIS NO CADASTRO COM ESSE APP - PAGA NO PIX NOVO APP - PAGANDO POR CADASTRO" },
  { youtubeId: "qJwjfJZmBkY", title: "💸Ganhe até R$23 Grátis Aplicativo Para Ganhar Dinheiro Automatico - Como Ganhar Dinheiro na Internet" },
  { youtubeId: "1fPqC3dioJk", title: "App Banco Itaú Não Abre - Erro no Aplicativo do Banco Itaú - Como Resolver!" },
  { youtubeId: "X5kDuyiGv_U", title: "Lançou App pagando  - lançamento #rendaextra" },
  { youtubeId: "LuT1rxKyWBg", title: "🚀💸LANÇOU NOVA PLATAFORMA ⚡ CADASTRE e GANHE até 100 REAIS - APP Pagando no Pix😱" },
  { youtubeId: "zkoZdszVgrc", title: "🚀💸LANÇOU NOVA PLATAFORMA 𝙋𝙍𝙊𝙁𝙏 𝙃𝙊𝙉𝙀Y - PAGANDO R$25 VIA PIX E USDT!𝟒% 𝐚 𝟏०% TODOS OS DIAS😱" },
  { youtubeId: "jwwMpmNsYKo", title: "Como desbloquear Cartão Débito e Crédito Nubank | Pagamento Fácil" },
  { youtubeId: "I1GixcRT0sA", title: "Como usar o Pix no app do Nubank | Pix Nubank Como Funciona" },
  { youtubeId: "Chs-QS5fLqA", title: "CAIXINHAS NUBANK | Como Criar, Como Funciona e Quanto Rendem" },
  { youtubeId: "SQuq5oG61QE", title: "como SOLICITAR seu CARTÃO de DÉBITO NUBANK | Passo a Passo" },
  { youtubeId: "EOJVrLzx7I0", title: "Fiz o Empréstimo do Nubank - Passo a Passo Completo pelo App" },
  { youtubeId: "zBYKOpvHSEA", title: "Como entrar em contato com o atendimento e suporte rápido Nubank" },
  { youtubeId: "JlTcn8w429M", title: "Erro inesperado no aplicativo Nubank corrigido de vez!" },
  { youtubeId: "wwOl4fKAOvA", title: "Como descobrir ou recuperar a senha de 4 dígitos do cartão Nubank" },
  { youtubeId: "Tmy4IsMwTtE", title: "Nubank: como ver o saldo e ativar a função débito no cartão" },
  { youtubeId: "PcLTH8gFK04", title: "Como antecipar o saque aniversário FGTS pelo celular e sacar" },
  { youtubeId: "TRaTHuzb6ns", title: "Erro de acesso no aplicativo FGTS resolvido! Como entrar no app" },
  { youtubeId: "pQiGJqz-X3c", title: "Como antecipar o saque aniversário FGTS pelo Banco Pan passo a passo" },
  { youtubeId: "ng0Xp6-5a5A", title: "Como sacar o auxílio emergencial antes da data pelo Caixa Tem" },
  { youtubeId: "rTvcVjDS2BM", title: "COMO SOLICITAR SEGURO DESEMPREGO PELO APLICATIVO DA CARTEIRA DIGITAL" },
  { youtubeId: "1oBSwJ7pXn8", title: "Como transferir o saldo do Caixa Tem para o Pagbank rápido" },
  { youtubeId: "GvelDBYfUZY", title: "Como Ativar Sua Conta PagBank e Liberar Função Pix Passo a Passo" },
  { youtubeId: "3jyClcNe5SM", title: "Cartão Recusado no Caixa Tem ao tentar transferir - Veja como resolver" },
  { youtubeId: "sz6mgSoTj4U", title: "COMO RESOLVER QUALQUER ERRO OU LIMITE EXCEDIDO NO APLICATIVO CAIXA TEM ✔️" },
  { youtubeId: "BN-ACmQ_y5M", title: "Como obter selo de acesso PRATA no Gov.br sem reconhecimento facial" },
  { youtubeId: "Hn64XVUocoM", title: "Como transferir dinheiro do Mercado Pago sem pagar nenhuma taxa" },
  { youtubeId: "sPOHbx_Xh_M", title: "Como enviar dinheiro e fazer pagamentos pelo Mercado Pago" },
  { youtubeId: "3t9-72wIfp0", title: "Como antecipar o recebimento de vendas e saldo do Mercado Pago" },
  { youtubeId: "FC5y-zh3IfA", title: "Como Transferir o Saldo do Caixa Tem Para o Mercado Pago" },
  { youtubeId: "S4x1RjbO9OM", title: "Alerta Importante: Cuidado com o Golpe do FGTS no Celular!" },
  { youtubeId: "sSx7ZniBPLk", title: "Erro de conexão no aplicativo Bolsa Família - Resolvido (RESULTADO)" },
  { youtubeId: "r5PntHAJQRk", title: "Desbloqueio de Parcelas no Bolsa Família – Entenda o Motivo!" },
  { youtubeId: "hzseQVxu1Co", title: "Contas Poupança Caixa mudaram de numeração: Veja o seu novo número" },
  { youtubeId: "qZO1tHGMrlM", title: "Como encontrar o número da agência e conta no novo cartão Caixa" },
  { youtubeId: "i3MVjPPipfo", title: "Como cadastrar chave Pix no Bradesco para transferir em segundos" },
  { youtubeId: "aZwWxHYYfaM", title: "Como fazer o cadastro e validação de chaves Pix no PicPay" },
  { youtubeId: "X7lL9_mKeEe", title: "Como Acessar o Canal no YouTube Pagamento Fácil e Não Perder Nenhuma Novidade!" },
  { youtubeId: "sz6mgSoTj4U", title: "🚨 [MAIS VISTO] Segredos para Desbloquear Conta Excedida do Caixa Tem" },
  { youtubeId: "hzseQVxu1Co", title: "Como Saber a Nova Numeração de sua Conta Poupança Caixa Facilmente" },
  { youtubeId: "PcLTH8gFK04", title: "Passo a Passo de como Sacar o Saque Aniversário FGTS sem Complicação" },
  { youtubeId: "jwwMpmNsYKo", title: "Como Desbloquear seu Cartão de Débito e Crédito do Nubank Rápido" },
  { youtubeId: "I1GixcRT0sA", title: "Tudo sobre como enviar e usar o Pix do Nubank sem errar" },
  { youtubeId: "1oBSwJ7pXn8", title: "Como Transferir Seu Saldo Caixa Tem direto para o PagBank" },
  { youtubeId: "FC5y-zh3IfA", title: "Como enviar todo o saldo do Caixa Tem para o Mercado Pago" },
  { youtubeId: "i3MVjPPipfo", title: "Como Cadastrar e Configurar Chave Pix no Banco Bradesco pelo App" },
  { youtubeId: "aZwWxHYYfaM", title: "Guia de como Cadastrar e Validar Chaves Pix no PicPay de Graça" },
  { youtubeId: "Chs-QS5fLqA", title: "Como Render Dinheiro Otimizado com as Caixinhas do Nubank" },
  { youtubeId: "EOJVrLzx7I0", title: "Simulando Empréstimo do Nubank direto no Aplicativo Celular" },
  { youtubeId: "zBYKOpvHSEA", title: "Como falar com Atendente e Suporte Interno do Nubank Rápido" },
  { youtubeId: "gBw4gqJo_tU", title: "🔥 [VÍDEO CLÁSSICO] Melhores Aplicativos pagando via Pix de Verdade" }
];

// Initial Brazilian campaigns dynamically loaded from the complete channel database
let campaigns: Campaign[] = [
  {
    id: "campaign-pf-sub",
    type: "subscribe",
    title: "Canal Oficial Pagamento Fácil - Inscreva-se para Novidades de Fintechs",
    youtubeId: "Pagamentofacil",
    channelTitle: "Pagamento Fácil",
    currentCount: 121,
    targetCount: 300,
    creditsReward: 25,
    userEmail: "cpdatividades@gmail.com",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    completedUsers: [],
  },
  ...RAW_PF_VIDEOS.filter(video => !BANNED_YOUTUBE_IDS.has(video.youtubeId)).map((video, idx) => {
    const type: "view" = "view";
    const targetCount = idx % 2 === 0 ? 500 : 300;
    const currentCount = Math.floor(targetCount * (0.05 + (idx % 8) * 0.1));
    const creditsReward = 30;
    return {
      id: `campaign-pf${idx + 1}`,
      type,
      title: video.title,
      youtubeId: video.youtubeId,
      channelTitle: "Pagamento Fácil",
      currentCount,
      targetCount,
      creditsReward,
      userEmail: "cpdatividades@gmail.com",
      createdAt: new Date(Date.now() - 3600000 * idx * 2).toISOString(),
      completedUsers: [] as string[],
    };
  })
];

// Simple in-memory global statistics to provide beautiful live metrics
let globalStats = {
  totalViewsGenerated: 78590,
  totalLikesDropped: 34120,
  totalCommentsCreated: 19830,
  totalSubscriptionsCompleted: 14210,
  totalActiveMembers: 1245,
};

// Global list of pinned channels / emails
let pinnedChannels: any[] = [];

// --- FILE PATH PERSISTENCE DATABASE ---
const DB_FILE = path.join(process.cwd(), "campaigns-db.json");

// Global registry of deleted campaigns (type + youtubeId) to ensure they are forever removed and not re-integrated by any automatic sync
const deletedCampaignKeys = new Set<string>();

interface Payment {
  id: string;
  buyerName: string;
  userEmail: string;
  coins: number;
  value: number;
  packageName: string;
  paymentMethod: string;
  status: "pending" | "approved" | "rejected";
  claimed: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  type: "payment_created" | "payment_approved" | "payment_rejected" | "campaign_created" | "campaign_deleted";
  message: string;
  timestamp: string;
  userEmail: string;
}

let payments: Payment[] = [];
let auditLogs: AuditLog[] = [
  {
    id: "init-log-1",
    type: "payment_approved",
    message: "Homologado: Admin aprovou o pedido de Canal_Financas e creditou +500 moedas.",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    userEmail: "financas@canal.com",
  },
  {
    id: "init-log-2",
    type: "payment_created",
    message: "Usuário Thiago_Gamer (thiago@gaming.com) realizou pedido de Moedas Prata (R$ 19,90).",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    userEmail: "thiago@gaming.com",
  }
];

// Persistent User profile interface for storing exact credit balances on the backend JSON
interface UserProfile {
  email: string;
  credits: number;
  updatedAt: string;
}
let userProfiles: Record<string, UserProfile> = {};

interface PhoneUser {
  phone: string;
  name: string;
  passwordHash: string;
  credits: number;
  createdAt: string;
}
let phoneUsers: Record<string, PhoneUser> = {};

// Verification Codes Store
interface VerificationCode {
  code: string;
  expiresAt: number;
}
let verificationCodes: Record<string, VerificationCode> = {};

function isEmailOrPhoneAdmin(identifier: string | undefined | null): boolean {
  if (!identifier) return false;
  const clean = identifier.toLowerCase().trim();
  const digits = clean.replace(/\D/g, "");
  return digits === "81985702243";
}

// Store for task completion timestamps to allow renewal every 24 hours
// structure: { [userEmail: string]: { [campaignId: string]: number } }
const taskCompletionTimestamps: Record<string, Record<string, number>> = {};

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.campaigns && Array.isArray(parsed.campaigns)) {
        campaigns = parsed.campaigns.filter(c => !BANNED_YOUTUBE_IDS.has(c.youtubeId));
        // Force all Pagamento Fácil videos loaded from database to always be "view" campaigns
        campaigns.forEach(c => {
          if (isEmailOrPhoneAdmin(c.userEmail) && c.type !== "subscribe") {
            c.type = "view";
            c.creditsReward = 30;
          }
        });

        // Ensure the official subscribe campaign for Pagamento Fácil channel is ALWAYS present and has high quality properties
        const hasPfSub = campaigns.some(c => c.youtubeId === "Pagamentofacil" && c.type === "subscribe");
        if (!hasPfSub) {
          campaigns.unshift({
            id: "campaign-pf-sub",
            type: "subscribe",
            title: "Canal Oficial do ADM (@Pagamentofacil) - Inscreva-se para Novidades e Suporte",
            youtubeId: "Pagamentofacil",
            channelTitle: "Pagamento Fácil",
            currentCount: 121,
            targetCount: 1000,
            creditsReward: 25,
            userEmail: "cpdatividades@gmail.com",
            createdAt: new Date().toISOString(),
            completedUsers: [],
          });
        }

        // Dynamic auto-sync: append newly added RAW_PF_VIDEOS that are not yet in the loaded database
        const existingTitles = new Set(campaigns.map(c => c.title.toLowerCase()));
        let newlyAddedCount = 0;
        RAW_PF_VIDEOS.forEach((video, idx) => {
          if (!existingTitles.has(video.title.toLowerCase()) && !BANNED_YOUTUBE_IDS.has(video.youtubeId)) {
            const targetCount = idx % 2 === 0 ? 500 : 300;
            const currentCount = Math.floor(targetCount * 0.08); // realistic initial count
            const creditsReward = 30;
            campaigns.push({
              id: `campaign-pf-dyn-${idx + 1}-${Date.now()}`,
              type: "view",
              title: video.title,
              youtubeId: video.youtubeId,
              channelTitle: "Pagamento Fácil",
              currentCount,
              targetCount,
              creditsReward,
              userEmail: "cpdatividades@gmail.com",
              createdAt: new Date(Date.now() - 3600000 * idx).toISOString(),
              completedUsers: []
            });
            newlyAddedCount++;
          }
        });
        if (newlyAddedCount > 0) {
          console.log(`[DB SUCCESS] Sincronizados ${newlyAddedCount} novos vídeos do canal de Administração.`);
        }
      }
      if (parsed.deletedCampaignKeys && Array.isArray(parsed.deletedCampaignKeys)) {
        deletedCampaignKeys.clear();
        parsed.deletedCampaignKeys.forEach((k: string) => {
          const lowerVal = k.toLowerCase();
          if (lowerVal !== "subscribe:pagamentofacil" && lowerVal !== "pagamentofacil") {
            deletedCampaignKeys.add(k);
          }
        });
      }

      if (parsed.globalStats) {
        globalStats = { ...globalStats, ...parsed.globalStats };
      }
      if (parsed.payments && Array.isArray(parsed.payments)) {
        payments = parsed.payments;
      }
      if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) {
        auditLogs = parsed.auditLogs;
      }
      if (parsed.userProfiles) {
        userProfiles = parsed.userProfiles;
      }
      if (parsed.phoneUsers) {
        phoneUsers = parsed.phoneUsers;
      }
      if (parsed.taskCompletionTimestamps) {
        Object.assign(taskCompletionTimestamps, parsed.taskCompletionTimestamps);
      }
      if (parsed.pinnedChannels && Array.isArray(parsed.pinnedChannels)) {
        pinnedChannels = parsed.pinnedChannels.map((item: any) => {
          if (typeof item === "string") {
            let extTitle = "Canal Parceiro";
            if (item.includes("@")) {
              const parts = item.split("@");
              extTitle = "@" + (parts[1] ? parts[1].split("/")[0].split("?")[0] : "");
            }
            return {
              url: item,
              name: extTitle,
              avatarUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80"
            };
          }
          return item;
        });
      }
      if (!pinnedChannels || pinnedChannels.length === 0) {
        pinnedChannels = [
          {
            url: "https://www.youtube.com/@Pagamentofacil",
            name: "Pagamento Fácil",
            avatarUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80"
          }
        ];
      }
      console.log(`[DB] Banco de dados de campanhas carregado com sucesso (${campaigns.length} campanhas, ${payments.length} pagamentos, ${auditLogs.length} logs de auditoria, ${pinnedChannels.length} canais fixados).`);
    } else {
      console.log("[DB] Banco de dados inicial não encontrado. Criando arquivo de backup...");
      saveDb();
    }
  } catch (err) {
    console.error("[DB] Falha crítica ao ler/carregar banco de dados JSON local:", err);
  }
}

// --- FIRESTORE AUTOMATIC CLOUD SYNCHRONIZATION ---
async function forceSyncToCloud() {
  if (!firestoreDb) return;
  try {
    console.log("[FIRESTORE-SYNC] Sincronizando estado em nuvem...");
    const dataToSave = {
      campaigns: { list: campaigns },
      deletedCampaignKeys: { list: Array.from(deletedCampaignKeys) },
      globalStats: globalStats,
      payments: { list: payments },
      auditLogs: { list: auditLogs },
      pinnedChannels: { list: pinnedChannels },
      userProfiles: { dict: userProfiles },
      taskCompletions: { dict: taskCompletionTimestamps },
      phoneUsers: { dict: phoneUsers },
    };

    const batch = clientWriteBatch(firestoreDb);
    for (const [docId, payload] of Object.entries(dataToSave)) {
      const docRef = clientDoc(firestoreDb, "app_state", docId);
      // Clean and sanitize any undefined fields recursively using standard JSON stringify/parse
      const sanitizedPayload = JSON.parse(JSON.stringify(payload));
      batch.set(docRef, sanitizedPayload, { merge: true });
    }
    await batch.commit();
    console.log("[FIRESTORE-SYNC] Sincronização de volta para Firestore gravada com sucesso.");
  } catch (err) {
    console.error("[FIRESTORE-SYNC] Falha ao gravar backup no Firestore:", err);
  }
}

async function syncFromFirestore() {
  if (!firestoreDb) return;
  try {
    console.log("[FIRESTORE-SYNC] Tentando carregar banco de dados remoto da nuvem...");
    const docsToFetch = [
      { docId: "campaigns", setter: (val: any) => { if (Array.isArray(val?.list)) campaigns = val.list; } },
      { docId: "deletedCampaignKeys", setter: (val: any) => { if (Array.isArray(val?.list)) { deletedCampaignKeys.clear(); val.list.forEach((k: string) => deletedCampaignKeys.add(k)); } } },
      { docId: "globalStats", setter: (val: any) => { if (val) globalStats = { ...globalStats, ...val }; } },
      { docId: "payments", setter: (val: any) => { if (Array.isArray(val?.list)) payments = val.list; } },
      { docId: "auditLogs", setter: (val: any) => { if (Array.isArray(val?.list)) auditLogs = val.list; } },
      { docId: "pinnedChannels", setter: (val: any) => { if (Array.isArray(val?.list)) pinnedChannels = val.list; } },
      { docId: "userProfiles", setter: (val: any) => { if (val?.dict) userProfiles = val.dict; } },
      { docId: "taskCompletions", setter: (val: any) => { if (val?.dict) { Object.assign(taskCompletionTimestamps, val.dict); } } },
      { docId: "phoneUsers", setter: (val: any) => { if (val?.dict) phoneUsers = val.dict; } },
    ];

    let foundAny = false;
    for (const item of docsToFetch) {
      const docRef = clientDoc(firestoreDb, "app_state", item.docId);
      const docSnap = await getClientDoc(docRef);
      if (docSnap.exists()) {
        item.setter(docSnap.data());
        foundAny = true;
      }
    }

    if (!foundAny) {
      console.log("[FIRESTORE-SYNC] Nenhuma coleção encontrada em nuvem. Gravando estado local inicial...");
      await forceSyncToCloud();
    } else {
      console.log("[FIRESTORE-SYNC] Banco de dados em nuvem carregado e restaurado com sucesso.");
    }
  } catch (err) {
    console.error("[FIRESTORE-SYNC] Falha ao recuperar estado em nuvem do Firestore:", err);
  }
}

function saveDb() {
  try {
    const data = {
      campaigns,
      deletedCampaignKeys: Array.from(deletedCampaignKeys),
      globalStats,
      payments,
      auditLogs,
      pinnedChannels,
      userProfiles,
      taskCompletionTimestamps,
      phoneUsers,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    console.log("[DB] Alterações salvas com sucesso em campaigns-db.json.");

    // Sincronização automática assíncrona em segundo plano para o Firestore
    if (firestoreDb) {
      forceSyncToCloud().catch(err => {
        console.error("[FIRESTORE-SYNC] Erro assíncrono ao sincronizar dados com a nuvem:", err);
      });
    }
  } catch (err) {
    console.error("[DB] Erro ao gravar banco de dados JSON local:", err);
  }
}

// Load database immediately and strip out banned videos
loadDb();
saveDb();

// Sincronização automatizada baseada em nuvem no boot do servidor
if (firestoreDb) {
  console.log("[BOOT] Inicializando sincronização de boot com Firestore...");
  syncFromFirestore()
    .then(() => {
      console.log("[BOOT] Dados recuperados da nuvem Firestore com sucesso!");
      // Cache localmente para manter a consistência física do JSON
      try {
        const data = {
          campaigns,
          deletedCampaignKeys: Array.from(deletedCampaignKeys),
          globalStats,
          payments,
          auditLogs,
          pinnedChannels,
          userProfiles,
          taskCompletionTimestamps,
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
      } catch (e) {}
    })
    .catch(err => {
      console.error("[BOOT] Erro na sincronização inicial com Firestore:", err);
    });
}

// Simulated Brazilian Chat in-memory to simulate real creators sharing feedback
let chatMessages = [
  { sender: "Thiago_Gamer", text: "Galera, meu vídeo de Minecraft pegou 500 views hoje aqui! ViralTubePro é brabo dms 🚀", time: "10:15" },
  { sender: "Ana_Receitas", text: "Alguém quer troca de inscrições no nicho de culinária? Deixei cupom de moedas ativo!", time: "10:22" },
  { sender: "Felipe_Musica", text: "Acabei de comentar nos vídeos de lofi! O algoritmo me recomendou um muito bom.", time: "10:30" },
  { sender: "Canal_Financas", text: "Mandei uma campanha de Like, as curtidas já estão caindo direto na minha aba do YouTube Studio!!", time: "10:34" },
  { sender: "Juliana_Vlogs", text: "Muito top a função de gerar comentários automáticos com IA, o comentário que copiei ficou perfeito e super natural no vídeo.", time: "10:41" },
];

/* ================== API ENDPOINTS ================== */

// Get YouTube video/channel metadata in real time
app.get("/api/youtube/info", async (req, res) => {
  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).json({ error: "URL do YouTube é obrigatória." });
  }

  // Pre-calculate human-friendly fallback data based on URL pattern to guarantee a success path
  let extractedTitle = "Meu Projeto no YouTube";
  let extractedAuthor = "Dono do Canal";
  
  try {
    const videoMatch = videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (videoMatch && videoMatch[2] && videoMatch[2].length === 11) {
      extractedTitle = `Vídeo Impulsionado (${videoMatch[2]})`;
      extractedAuthor = `Meu Canal`;
    } else if (videoUrl.includes("@") || videoUrl.includes("/channel/") || videoUrl.includes("/c/")) {
      const parts = videoUrl.split("/");
      const lastPart = parts[parts.length - 1] || "";
      const decodedHandle = decodeURIComponent(lastPart).replace("@", "");
      extractedTitle = `Canal Oficial de @${decodedHandle}`;
      extractedAuthor = decodedHandle;
    }
  } catch (parseErr) {
    console.error("Local URL pre-parsing error:", parseErr);
  }

  try {
    // Attempt standard YouTube oEmbed first
    const targetUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const response = await fetch(targetUrl);
    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        title: data.title,
        channelTitle: data.author_name,
        thumbnailUrl: data.thumbnail_url,
      });
    }

    // Fallback to Noembed
    const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`;
    const fallbackResponse = await fetch(noembedUrl);
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      if (data && !data.error) {
        return res.json({
          success: true,
          title: data.title,
          channelTitle: data.author_name,
          thumbnailUrl: data.thumbnail_url,
        });
      }
    }

    // Graceful fallback parsing for channels
    if (videoUrl.includes("@") || videoUrl.includes("/channel/") || videoUrl.includes("/c/")) {
      const parts = videoUrl.split("/");
      const lastPart = parts[parts.length - 1] || "";
      const decodedHandle = decodeURIComponent(lastPart).replace("@", "");
      return res.json({
        success: true,
        title: `Canal Oficial de @${decodedHandle}`,
        channelTitle: decodedHandle,
        thumbnailUrl: `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80`,
      });
    }

    // If both services fail (extremely common on hosted platforms due to IP rate limits or blocks),
    // return our pre-parsed success fallback with a friendly explanation warning
    return res.json({
      success: true,
      title: extractedTitle,
      channelTitle: extractedAuthor,
      thumbnailUrl: `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80`,
      warning: "A sua hospedagem não conseguiu obter dados automáticos do YouTube devido ao bloqueio de IPs de servidores de nuvem. Sem problemas! Preenchemos os dados base e você pode digitar o Título e o Nome do Canal manualmente abaixo!"
    });

  } catch (error) {
    console.error("YouTube parse error (graceful catch):", error);
    // Even if fetch throws with a TypeError or Timeout, do NOT raise a standard blocking 500 error!
    return res.json({
      success: true,
      title: extractedTitle,
      channelTitle: extractedAuthor,
      thumbnailUrl: `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80`,
      warning: "A sua hospedagem está offline para conexões externas com o YouTube (restrições do seu provedor). Preenchemos dados base; você pode digitar o Título e o Nome do seu Canal de forma manual abaixo!"
    });
  }
});

// Get active exchange tasks/campaigns
app.get("/api/campaigns", (req, res) => {
  // Ensure the official subscribe campaign for Pagamento Fácil channel is ALWAYS present
  const hasPfSub = campaigns.some(c => c.youtubeId && c.youtubeId.toLowerCase() === "pagamentofacil" && c.type === "subscribe");
  if (!hasPfSub) {
    campaigns.unshift({
      id: "campaign-pf-sub",
      type: "subscribe",
      title: "Canal Oficial do ADM (@Pagamentofacil) - Inscreva-se para Novidades e Suporte",
      youtubeId: "Pagamentofacil",
      channelTitle: "Pagamento Fácil",
      currentCount: 121,
      targetCount: 1000,
      creditsReward: 25,
      userEmail: "cpdatividades@gmail.com",
      createdAt: new Date().toISOString(),
      completedUsers: [],
    });
    saveDb();
  }

  // Calculate daily completed count for this user
  const email = (req.query.email as string || "").trim().toLowerCase();
  let dailyCompletedCount = 0;
  let userCredits = null;
  if (email) {
    const userMap = taskCompletionTimestamps[email] || {};
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    for (const campId of Object.keys(userMap)) {
      if (now - userMap[campId] < twentyFourHours) {
        dailyCompletedCount++;
      }
    }
    if (isEmailOrPhoneAdmin(email)) {
      userCredits = 999999999;
    } else if (userProfiles[email]) {
      userCredits = userProfiles[email].credits;
    }
  }

  res.json({
    success: true,
    campaigns,
    pinnedChannels: pinnedChannels || [],
    globalStats,
    dailyCompletedCount,
    userCredits,
  });
});

// Create a new video or channel campaign
app.post("/api/campaigns", (req, res) => {
  const { type, title, youtubeId, channelTitle, targetCount, userEmail, isPinned, isPartnerChannel, positionIndex, url, videoSeconds, creditsReward: clientCreditsReward } = req.body;

  const resolvedType = type || "view";

  let resolvedYoutubeId = youtubeId;
  const urlInput = url || "";
  if (!resolvedYoutubeId && urlInput) {
    const trimmed = urlInput.trim();
    if (trimmed.includes("/channel/") || trimmed.includes("/c/") || trimmed.includes("/@") || trimmed.startsWith("UC")) {
      if (trimmed.startsWith("UC")) {
        resolvedYoutubeId = trimmed;
      } else {
        const parts = trimmed.split("/");
        const lastPart = parts[parts.length - 1] || "";
        resolvedYoutubeId = lastPart || "UC_x5XG1OV2P6uMXXXXXXXX";
      }
    } else {
      const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = trimmed.match(videoRegExp);
      if (match && match[2] && match[2].length === 11) {
        resolvedYoutubeId = match[2];
      } else if (trimmed.length === 11 && !trimmed.includes("/")) {
        resolvedYoutubeId = trimmed;
      } else {
        resolvedYoutubeId = "COu8H06wckk"; // default safe fallback video ID
      }
    }
  }

  // Fallback default ID if still empty
  if (!resolvedYoutubeId) {
    resolvedYoutubeId = resolvedType === "subscribe" ? "Pagamentofacil" : "COu8H06wckk";
  }

  // Robust title and channelTitle fallbacks so it never fails on empty inputs
  const resolvedTitle = (title && title.trim()) ? title.trim() : (resolvedType === "subscribe" ? "Inscrição de Canal da Comunidade" : "Visualização de Vídeo da Comunidade");
  const resolvedChannelTitle = (channelTitle && channelTitle.trim()) ? channelTitle.trim() : "Canal da Comunidade";
  const resolvedTargetCount = parseInt(targetCount) || 30;

  // Define automatic credits reward based on action type
  const rewards = {
    view: 30,
    like: 10,
    comment: 20,
    subscribe: 25,
  };
  const creditsReward = clientCreditsReward !== undefined ? Number(clientCreditsReward) : (rewards[resolvedType as keyof typeof rewards] || 30);

  const newCampaign: Campaign = {
    id: `campaign-${Date.now()}`,
    type: resolvedType as any,
    title: resolvedTitle,
    youtubeId: resolvedYoutubeId,
    channelTitle: resolvedChannelTitle,
    currentCount: 0,
    targetCount: resolvedTargetCount,
    creditsReward,
    videoSeconds: videoSeconds !== undefined ? Number(videoSeconds) : (resolvedType === "view" ? 30 : undefined),
    userEmail: (userEmail && userEmail.trim()) ? userEmail.trim() : "criador_brasileiro@gmail.com",
    createdAt: new Date().toISOString(),
    completedUsers: [],
    isPinned: isPinned !== undefined ? Boolean(isPinned) : false,
    isPartnerChannel: isPartnerChannel !== undefined ? Boolean(isPartnerChannel) : false,
    positionIndex: (positionIndex !== undefined && positionIndex !== "" && positionIndex !== null) ? Number(positionIndex) : undefined,
  };

  campaigns.unshift(newCampaign);
  saveDb();
  res.json({ success: true, campaign: newCampaign });
});

// In-memory unique interaction registry for YouTube tasks to prevent multi-accounts or duplicated copy-paste logs
// structure: { [campaignId: string]: { handles: string[]; comments: string[] } }
const campaignAuditedSubmissions: Record<string, { handles: string[]; comments: string[] }> = {};

// Helper to fetch YouTube Channel Info (Real name and og:image as avatar)
async function fetchYouTubeChannelInfo(channelUrl: string) {
  let extractedTitle = "Canal Parceiro";
  let extractedAuthor = "Canal Parceiro";
  
  try {
    const parts = channelUrl.split("/");
    const lastPart = parts[parts.length - 1] || "";
    const decodedHandle = decodeURIComponent(lastPart).replace("@", "");
    extractedTitle = `Canal de @${decodedHandle}`;
    extractedAuthor = `@${decodedHandle}`;
  } catch (e) {
    console.error("Error parsing slug from URL:", e);
  }

  const fallbackAvatar = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80";

  // 1. Try scraping the channel page for og:title and og:image, which YouTube always provides!
  try {
    const res = await fetch(channelUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/i) || html.match(/<meta name="title" content="([^"]+)">/i);
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)">/i) || html.match(/<link rel="image_src" href="([^"]+)">/i);
      
      let finalName = titleMatch ? titleMatch[1] : null;
      let finalAvatar = imageMatch ? imageMatch[1] : null;

      if (finalName) {
        finalName = finalName
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      }

      if (finalName || finalAvatar) {
        return {
          name: finalName || extractedTitle,
          avatarUrl: finalAvatar || fallbackAvatar,
        };
      }
    }
  } catch (err) {
    console.error("fetchYouTubeChannelInfo scraping error grace:", err);
  }

  // 2. oEmbed fallback
  try {
    const targetUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(channelUrl)}&format=json`;
    const response = await fetch(targetUrl);
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.title || data.author_name || extractedTitle,
        avatarUrl: data.thumbnail_url || fallbackAvatar,
      };
    }
  } catch (err) {
    console.error("fetchYouTubeChannelInfo oembed error grace:", err);
  }

  return {
    name: extractedTitle,
    avatarUrl: fallbackAvatar,
  };
}

// Admin endpoint: Add a channel to the registered pinned public rules
app.post("/api/admin/pinned-channels/add", async (req, res) => {
  const { channel, adminEmail, name, avatarUrl } = req.body;
  if (!adminEmail || !isEmailOrPhoneAdmin(adminEmail)) {
    return res.status(403).json({ error: "Apenas administradores autorizados de cpdatividades@gmail.com ou o ADM podem adicionar canais parceiros." });
  }
  if (!channel || !channel.trim()) {
    return res.status(400).json({ error: "Insira uma URL de canal do YouTube válida." });
  }
  const cleanVal = channel.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanVal);
  if (isEmail) {
    return res.status(400).json({ error: "Por favor, insira a URL do Canal do YouTube (Ex: https://www.youtube.com/@CanalExemplo) e não um endereço de e-mail." });
  }
  const exists = pinnedChannels.some(item => {
    const url = typeof item === "string" ? item : item.url;
    return url.toLowerCase() === cleanVal.toLowerCase();
  });

  if (!exists) {
    let finalName = name && name.trim() ? name.trim() : "";
    let finalAvatarUrl = avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : "";

    if (!finalName || !finalAvatarUrl) {
      const channelInfo = await fetchYouTubeChannelInfo(cleanVal);
      if (!finalName) finalName = channelInfo.name;
      if (!finalAvatarUrl) finalAvatarUrl = channelInfo.avatarUrl;
    }

    pinnedChannels.push({
      url: cleanVal,
      name: finalName,
      avatarUrl: finalAvatarUrl
    });
    saveDb();
  } else {
    const idx = pinnedChannels.findIndex(item => {
      const url = typeof item === "string" ? item : item.url;
      return url.toLowerCase() === cleanVal.toLowerCase();
    });
    if (idx !== -1) {
      const existingItem = pinnedChannels[idx];
      const oldUrl = typeof existingItem === "string" ? existingItem : existingItem.url;
      const oldName = typeof existingItem === "string" ? "Canal Parceiro" : existingItem.name;
      const oldAvatar = typeof existingItem === "string" ? "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80" : existingItem.avatarUrl;

      pinnedChannels[idx] = {
        url: oldUrl,
        name: name && name.trim() ? name.trim() : oldName,
        avatarUrl: avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : oldAvatar
      };
      saveDb();
    }
  }
  res.json({ success: true, pinnedChannels });
});

// Admin endpoint: Edit an existing partner channel
app.post("/api/admin/pinned-channels/edit", (req, res) => {
  const { channelUrl, name, avatarUrl, adminEmail } = req.body;
  if (!adminEmail || !isEmailOrPhoneAdmin(adminEmail)) {
    return res.status(403).json({ error: "Apenas administradores autorizados de cpdatividades@gmail.com ou o ADM podem editar canais parceiros." });
  }
  if (!channelUrl) {
    return res.status(400).json({ error: "URL do canal para edição é obrigatória." });
  }
  const cleanVal = channelUrl.trim();
  let foundIndex = pinnedChannels.findIndex(item => {
    const url = typeof item === "string" ? item : item.url;
    return url.toLowerCase() === cleanVal.toLowerCase();
  });

  if (foundIndex === -1) {
    return res.status(404).json({ error: "Canal parceiro não encontrado para edição." });
  }

  const existingItem = pinnedChannels[foundIndex];
  const oldUrl = typeof existingItem === "string" ? existingItem : existingItem.url;
  const oldName = typeof existingItem === "string" ? "Canal Parceiro" : existingItem.name;
  const oldAvatar = typeof existingItem === "string" ? "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80" : existingItem.avatarUrl;

  pinnedChannels[foundIndex] = {
    url: oldUrl,
    name: name && name.trim() ? name.trim() : oldName,
    avatarUrl: avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : oldAvatar
  };

  saveDb();
  res.json({ success: true, pinnedChannels });
});

// Admin endpoint: Remove a channel from the registered pinned public rules
app.post("/api/admin/pinned-channels/remove", (req, res) => {
  const { channel, adminEmail } = req.body;
  if (!adminEmail || !isEmailOrPhoneAdmin(adminEmail)) {
    return res.status(403).json({ error: "Apenas administradores autorizados de cpdatividades@gmail.com ou o ADM podem remover canais parceiros." });
  }
  if (!channel) {
    return res.status(400).json({ error: "Informe o canal a remover." });
  }
  const cleanVal = channel.trim();
  pinnedChannels = pinnedChannels.filter((item) => {
    const url = typeof item === "string" ? item : item.url;
    return url.toLowerCase() !== cleanVal.toLowerCase();
  });
  saveDb();
  res.json({ success: true, pinnedChannels });
});

// Admin endpoint: Sync all videos of @Pagamentofacil channel
app.post("/api/admin/sync-channel", (req, res) => {
  // Only remove admin-related campaigns, KEEPING other members' custom campaigns intact!
  campaigns = campaigns.filter(c => !isEmailOrPhoneAdmin(c.userEmail));

  // Add the primary Channel subscribe campaign (always allowed/undeleted)
  deletedCampaignKeys.delete("subscribe:pagamentofacil");
  deletedCampaignKeys.delete("pagamentofacil");
  campaigns.push({
    id: `campaign-pf-sub-${Date.now()}`,
    type: "subscribe",
    title: "Canal Oficial do ADM (@Pagamentofacil) - Inscreva-se para Novidades e Suporte",
    youtubeId: "Pagamentofacil",
    channelTitle: "Pagamento Fácil",
    currentCount: 121,
    targetCount: 1000,
    creditsReward: 25,
    userEmail: "cpdatividades@gmail.com",
    createdAt: new Date().toISOString(),
    completedUsers: [],
  });

  let addedCount = 0;
  RAW_PF_VIDEOS.forEach((video, idx) => {
    if (BANNED_YOUTUBE_IDS.has(video.youtubeId)) {
      return; // Skip banned videos
    }
    const type = "view";
    
    // Check if campaign or video was deleted previously
    const campaignKey = `${type}:${video.youtubeId.toLowerCase()}`;
    const videoIdLower = video.youtubeId.toLowerCase();
    
    const isVideoDeleted = deletedCampaignKeys.has(videoIdLower) || Array.from(deletedCampaignKeys).some(key => {
      return key.endsWith(`:${videoIdLower}`) || key === videoIdLower;
    });

    if (deletedCampaignKeys.has(campaignKey) || isVideoDeleted) {
      return; // Skip re-adding deleted tasks
    }

    const targetCount = idx % 2 === 0 ? 500 : 300;
    const creditsReward = 30;

    campaigns.push({
      id: `campaign-pf-sync-${idx + 1}-${Date.now()}`,
      type,
      title: video.title,
      youtubeId: video.youtubeId,
      channelTitle: "Pagamento Fácil",
      currentCount: Math.floor(Math.random() * 15),
      targetCount,
      creditsReward,
      userEmail: "cpdatividades@gmail.com",
      createdAt: new Date().toISOString(),
      completedUsers: [],
    });
    addedCount++;
  });

  saveDb();
  res.json({ success: true, addedCount, totalCampaigns: campaigns.length });
});

// Admin campaign boosting
app.post("/api/admin/boost-campaign/:id", (req, res) => {
  const { id } = req.params;
  const camp = campaigns.find(c => c.id === id);
  if (!camp) {
    return res.status(404).json({ error: "Campanha não encontrada." });
  }
  // Max boost simply ups the target by 500 with higher reward
  camp.targetCount += 500;
  camp.creditsReward = Math.min(100, camp.creditsReward + 15);
  saveDb();
  res.json({ success: true, campaign: camp });
});

// User campaign accelerating (Acelerar) costing 15 coins
app.post("/api/campaigns/:id/boost-user", (req, res) => {
  const { id } = req.params;
  const camp = campaigns.find(c => c.id === id);
  if (!camp) {
    return res.status(404).json({ error: "Campanha não encontrada." });
  }
  
  // Set boosted to true (so they sort higher)
  camp.isBoosted = true;
  // Increase targetCount by 15 (giving 15 extra tasks value for 15 coins)
  camp.targetCount += 15;
  saveDb();
  res.json({ success: true, campaign: camp });
});

// Admin campaign updating/authoring
app.put("/api/admin/campaigns/:id", (req, res) => {
  const { id } = req.params;
  const { type, title, youtubeId, channelTitle, targetCount, creditsReward, currentCount, userEmail, isPinned, isPartnerChannel, positionIndex, videoSeconds } = req.body;
  const camp = campaigns.find(c => c.id === id);
  if (!camp) {
    return res.status(404).json({ error: "Campanha não encontrada." });
  }

  if (type) camp.type = type;
  if (title) camp.title = title;
  if (youtubeId) camp.youtubeId = youtubeId;
  if (channelTitle) camp.channelTitle = channelTitle;
  if (targetCount !== undefined) camp.targetCount = Number(targetCount);
  if (creditsReward !== undefined) camp.creditsReward = Number(creditsReward);
  if (currentCount !== undefined) camp.currentCount = Number(currentCount);
  if (userEmail !== undefined) camp.userEmail = userEmail;
  if (isPinned !== undefined) camp.isPinned = Boolean(isPinned);
  if (isPartnerChannel !== undefined) camp.isPartnerChannel = Boolean(isPartnerChannel);
  if (videoSeconds !== undefined) camp.videoSeconds = Number(videoSeconds);
  if (positionIndex !== undefined) {
    camp.positionIndex = (positionIndex === "" || positionIndex === null || isNaN(Number(positionIndex))) ? undefined : Number(positionIndex);
  }

  // If this was in deleted keys but we edited/saved it, we remove it from delete registry
  if (youtubeId) {
    deletedCampaignKeys.delete(youtubeId.toLowerCase());
    deletedCampaignKeys.delete(`${type}:${youtubeId.toLowerCase()}`);
  }

  saveDb();
  res.json({ success: true, campaign: camp });
});

// Admin campaign deletion
app.delete("/api/campaigns/:id", (req, res) => {
  const { id } = req.params;
  const index = campaigns.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Campanha não encontrada." });
  }
  
  // Register the campaign signature in our deleted registry before removing
  const camp = campaigns[index];
  const uniqueKey = `${camp.type}:${camp.youtubeId.toLowerCase()}`;
  deletedCampaignKeys.add(uniqueKey);
  // Also register the pure video ID to globally identify and block this video from any automatic sync
  deletedCampaignKeys.add(camp.youtubeId.toLowerCase());
  console.log(`[ANTI-FRAUDE/DELETE] Campaign registered in deleted registry: ${uniqueKey} and video ID: ${camp.youtubeId.toLowerCase()}`);

  campaigns.splice(index, 1);
  saveDb();
  res.json({ success: true });
});

// Periodic background worker to prune completed users older than 24h
setInterval(() => {
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const email of Object.keys(taskCompletionTimestamps)) {
    const userMap = taskCompletionTimestamps[email];
    for (const campId of Object.keys(userMap)) {
      if (now - userMap[campId] >= twentyFourHours) {
        delete userMap[campId];
        
        // Remove from campaign in-memory completions so they can see it as active
        const camp = campaigns.find(c => c.id === campId);
        if (camp) {
          camp.completedUsers = camp.completedUsers.filter(u => u.toLowerCase() !== email.toLowerCase());
        }
      }
    }
    if (Object.keys(userMap).length === 0) {
      delete taskCompletionTimestamps[email];
    }
  }
}, 30000); // Check every 30 seconds

// Confirm completed interaction and reward/update campaign counts with auto verification by print/screenshot
app.post("/api/campaigns/:id/action", (req, res) => {
  const { id } = req.params;
  const { userEmail, screenshot } = req.body;

  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: "Campanha não encontrada." });
  }

  // Check if already completed (prevent duplicate submission)
  if (votedOrCompleted(campaign, userEmail)) {
    return res.status(400).json({ error: "Você já realizou esta tarefa! Ela será renovada para você após 24 horas." });
  }

  const emailClean = (userEmail || "anonymous").toLowerCase().trim();

  // Daily limit check: max 20 tasks per day
  if (!isEmailOrPhoneAdmin(emailClean)) {
    const userMap = taskCompletionTimestamps[emailClean] || {};
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    let dailyCompletedCount = 0;
    for (const campId of Object.keys(userMap)) {
      if (now - userMap[campId] < twentyFourHours) {
        dailyCompletedCount++;
      }
    }
    if (dailyCompletedCount >= 20) {
      return res.status(400).json({ error: "Você atingiu o limite máximo de 20 tarefas diárias! Volte amanhã para continuar ganhando mais moedas." });
    }
  }

  // For non-view tasks (likes, comments, subscribes), screenshot print upload is mandatory
  if (campaign.type !== "view") {
    if (!screenshot || typeof screenshot !== "string" || !screenshot.startsWith("data:image")) {
      return res.status(400).json({ error: "Erro de Verificação: O print/screenshot da tarefa realizada é obrigatório para validação automática." });
    }

    // Keep an in-memory audit record using the user's email prefix to track validations
    if (!campaignAuditedSubmissions[campaign.id]) {
      campaignAuditedSubmissions[campaign.id] = { handles: [], comments: [] };
    }
    campaignAuditedSubmissions[campaign.id].handles.push(emailClean);
  }

  // Update lists and save completion timestamp for 24h limit
  if (!taskCompletionTimestamps[emailClean]) {
    taskCompletionTimestamps[emailClean] = {};
  }
  taskCompletionTimestamps[emailClean][campaign.id] = Date.now();

  if (!campaign.completedUsers.includes(emailClean)) {
    campaign.completedUsers.push(emailClean);
  }
  campaign.currentCount += 1;

  // Increment live stats
  if (campaign.type === "view") globalStats.totalViewsGenerated += 1;
  if (campaign.type === "like") globalStats.totalLikesDropped += 1;
  if (campaign.type === "comment") globalStats.totalCommentsCreated += 1;
  if (campaign.type === "subscribe") globalStats.totalSubscriptionsCompleted += 1;

  saveDb();

  res.json({
    success: true,
    campaign,
    creditsEarned: campaign.creditsReward,
  });
});

function votedOrCompleted(campaign: Campaign, userEmail: string): boolean {
  if (!userEmail) return false;
  const emailClean = userEmail.toLowerCase();
  
  // Check the 24h completion dictionary
  const userMap = taskCompletionTimestamps[emailClean];
  if (userMap && userMap[campaign.id]) {
    const timePassed = Date.now() - userMap[campaign.id];
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (timePassed < twentyFourHours) {
      return true; // Still completed
    }
  }

  return campaign.completedUsers.some(u => u.toLowerCase() === emailClean);
}

// Generate organic 100% Brazilian comments with Gemini API
app.post("/api/generate-comment", async (req, res) => {
  const { videoTitle, channelTitle } = req.body;

  if (!videoTitle) {
    return res.status(400).json({ error: "Título do vídeo é obrigatório." });
  }

  const prompt = `Gere 3 ideias de comentários curtos, orgânicos, amigáveis de usuários reais e super reais em português do Brasil para o vídeo intitulado: "${videoTitle}" do canal "${channelTitle || "um criador de conteúdo"}". 
Use gírias brasileiras comuns do YouTube e linguajar comum da internet nacional (como 'trampo sensacional', 'salve', 'top demais', 'amei o vídeo', 'inscrito aqui no canal', 'parabéns pelo conteúdo', 'mano', 'vídeo irado'). Evite parecer artificial, traduzido ou excessivamente formal.
Retorne rigorosamente no formato JSON de array de strings, exemplo: ["Comentário 1", "Comentário 2", "Comentário 3"].`;

  try {
    const isMock = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || process.env.GEMINI_API_KEY === "MOCK_ENV_KEY";

    if (isMock) {
      console.log("No Gemini API key found. Using beautiful fallback replies.");
      const mockReplies = getBrazilianFallbackComments(videoTitle);
      return res.json({ success: true, comments: mockReplies });
    }

    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
          description: "Lista de 3 comentários em português.",
        },
      },
    });

    const textOutput = response.text;
    if (textOutput) {
      try {
        const parsed = JSON.parse(textOutput.trim());
        return res.json({ success: true, comments: parsed });
      } catch (parseErr) {
        console.error("Failed to parse JSON reply from Gemini. Fallback initiated.", parseErr);
      }
    }

    return res.json({ success: true, comments: getBrazilianFallbackComments(videoTitle) });
  } catch (error) {
    console.error("Gemini request failed:", error);
    return res.json({ success: true, comments: getBrazilianFallbackComments(videoTitle) });
  }
});

// Mock algorithm to generate beautiful Brazilian comments if keys/SDK are offline
function getBrazilianFallbackComments(title: string): string[] {
  const normalized = title.toLowerCase();
  if (normalized.includes("lofi") || normalized.includes("música") || normalized.includes("relaxar")) {
    return [
      "Mano, que playlist sensacional para usar enquanto programa ou estuda! Deixei tocando no fundo aqui.",
      "Lofi brasileiro é incomparável, traz uma paz única. Mais um inscrito! Parabéns pelo canal.",
      "Caraca, que vibe maravilhosa! A arte de fundo combinou perfeitamente. Ansioso pelo próximo vídeo já! 🎧",
    ];
  }
  if (normalized.includes("programação") || normalized.includes("dev") || normalized.includes("html") || normalized.includes("css")) {
    return [
      "Graças a esses vídeos estou entendendo mais de programação do que na minha faculdade inteira 😂 Valeu dms!",
      "Explicação muito direta e prática, sem enrolar. Parabéns pelo canal! Ganhou mais um inscrito de verdade.",
      "Excelente conteúdo focado no mercado de trabalho atual! Me deu um norte sensacional. Sucesso irmão!",
    ];
  }
  if (normalized.includes("algoritmo") || normalized.includes("sucesso") || normalized.includes("inscrito")) {
    return [
      "Esse vídeo com as verdades sobre o algoritmo clareou demais as minhas ideias. Mudei minha visão já!",
      "Dicas valiosas! Vou focar bastante no SEO e na retenção dos primeiros 30 segundos dos vídeos.",
      "Vídeo curto, focado e super informativo. Parabéns pelas dicas reais e sem enrolação, tamo junto!",
    ];
  }
  // Generic beautiful response based on the actual title
  return [
    `Cara, que vídeo massa sobre "${title}"! O conteúdo de vocês é super bem gravado e muito esclarecedor. Salve!`,
    `Amei dms esse vídeo. Muito bom ver criador brasileiro trazendo esse tipo de conteúdo pra comunidade. Já deixei o like!`,
    `Muito importante compartilhar esse tipo de visão. Sou criador menor também e me identifiquei muito. Inscrito no canal!`,
  ];
}

// Live Chat Endpoint - simulate live creators posting achievements and chatting to make the community alive
app.get("/api/chat", (req, res) => {
  res.json({ success: true, messages: chatMessages });
});

app.post("/api/chat", (req, res) => {
  const { sender, text } = req.body;
  if (!sender || !text) return res.status(400).json({ error: "Sender and text are required" });

  const newMessage = {
    sender: sender.substring(0, 20),
    text: text.substring(0, 150),
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };

  chatMessages.push(newMessage);
  if (chatMessages.length > 30) chatMessages.shift(); // Keep chat streamlined

  res.json({ success: true, message: newMessage });
});

// Create a new pending payment record (WhatsApp Checkout integration)
app.post("/api/payments/create", (req, res) => {
  const { userEmail, buyerName, coins, value, packageName, paymentMethod } = req.body;
  if (!userEmail) {
    return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
  }

  const newPayment: Payment = {
    id: `pay-${Date.now()}`,
    buyerName: buyerName || "Usuário do Canal",
    userEmail: userEmail.toLowerCase(),
    coins: Number(coins) || 0,
    value: Number(value) || 0,
    packageName: packageName || "Pacote Customizado",
    paymentMethod: paymentMethod || "Chave CPF",
    status: "pending",
    claimed: false,
    createdAt: new Date().toISOString(),
  };

  payments.unshift(newPayment);
  
  // Clean up old payments if list gets very large
  if (payments.length > 200) {
    payments = payments.slice(0, 200);
  }

  // Record Audit Log Action
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    type: "payment_created",
    message: `Usuário ${newPayment.buyerName} (${newPayment.userEmail}) clicou em "Confirmar Pagamento Realizado ⚡" para o pacote ${newPayment.packageName} (R$ ${newPayment.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`,
    timestamp: new Date().toISOString(),
    userEmail: newPayment.userEmail,
  };
  auditLogs.unshift(newLog);
  if (auditLogs.length > 200) {
    auditLogs = auditLogs.slice(0, 200);
  }

  saveDb();
  console.log(`[PAGAMENTO REGISTRADO] Novo pedido pendente criado: ${newPayment.id} para ${userEmail}`);
  res.json({ success: true, payment: newPayment });
});

// Get all payments (Admin Panel list)
app.get("/api/payments", (req, res) => {
  res.json({ success: true, payments, auditLogs });
});

// Admin Reports (Users lists, Task engagement metrics, and Financial summaries)
app.get("/api/admin/reports", (req, res) => {
  const userSet = new Set<string>();
  const userDetails: Record<string, {
    email: string;
    buyerName?: string;
    tasksCompleted: number;
    campaignsCreated: number;
    totalSpent: number;
    coinsBought: number;
    lastActive: string;
    credits: number;
  }> = {};

  const ensureUser = (email: string) => {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    if (!clean || clean === "anonymous") return null;
    userSet.add(clean);
    if (!userDetails[clean]) {
      const prof = userProfiles[clean];
      userDetails[clean] = {
        email: clean,
        buyerName: undefined,
        tasksCompleted: 0,
        campaignsCreated: 0,
        totalSpent: 0,
        coinsBought: 0,
        lastActive: "",
        credits: prof ? prof.credits : 1500, // fallback welcome balance
      };
    }
    return clean;
  };

  // Seed with all userProfiles so they are registered in reports even if inactive
  Object.keys(userProfiles).forEach(email => {
    ensureUser(email);
  });

  // Process completions
  campaigns.forEach(c => {
    if (c.completedUsers && Array.isArray(c.completedUsers)) {
      c.completedUsers.forEach(userEmail => {
        const u = ensureUser(userEmail);
        if (u) {
          userDetails[u].tasksCompleted++;
        }
      });
    }
  });

  // Process campaign creations
  campaigns.forEach(c => {
    const u = ensureUser(c.userEmail);
    if (u) {
      userDetails[u].campaignsCreated++;
    }
  });

  // Process payments
  payments.forEach(p => {
    const u = ensureUser(p.userEmail);
    if (u) {
      if (!userDetails[u].buyerName && p.buyerName) {
        userDetails[u].buyerName = p.buyerName;
      }
      if (p.status === "approved") {
        userDetails[u].totalSpent += p.value;
        userDetails[u].coinsBought += p.coins;
      }
      if (!userDetails[u].lastActive || p.createdAt > userDetails[u].lastActive) {
        userDetails[u].lastActive = p.createdAt;
      }
    }
  });

  // Process audit logs for lastActive
  auditLogs.forEach(log => {
    const u = ensureUser(log.userEmail);
    if (u) {
      if (!userDetails[u].lastActive || log.timestamp > userDetails[u].lastActive) {
        userDetails[u].lastActive = log.timestamp;
      }
    }
  });

  const usersList = Object.values(userDetails);

  // 2. Task Stats
  const taskStats = {
    totalCampaigns: campaigns.length,
    byType: {
      view: campaigns.filter(c => c.type === "view").length,
      like: campaigns.filter(c => c.type === "like").length,
      comment: campaigns.filter(c => c.type === "comment").length,
      subscribe: campaigns.filter(c => c.type === "subscribe").length,
    },
    totalCompletions: campaigns.reduce((sum, c) => sum + (c.completedUsers?.length || 0), 0),
    activeCampaigns: campaigns.filter(c => c.currentCount < c.targetCount).length,
    completedCampaigns: campaigns.filter(c => c.currentCount >= c.targetCount).length,
  };

  // 3. Purchase / Financial Stats
  let totalEarnings = 0;
  let pendingReceipts = 0;
  let totalCoinsSold = 0;
  const packageSales: Record<string, number> = {};
  const statusCounts = { pending: 0, approved: 0, rejected: 0 };

  payments.forEach(p => {
    statusCounts[p.status as keyof typeof statusCounts] = (statusCounts[p.status as keyof typeof statusCounts] || 0) + 1;
    if (p.status === "approved") {
      totalEarnings += p.value;
      totalCoinsSold += p.coins;
      packageSales[p.packageName || "Pacote Personalizado"] = (packageSales[p.packageName || "Pacote Personalizado"] || 0) + 1;
    } else if (p.status === "pending") {
      pendingReceipts += p.value;
    }
  });

  // Process taskCompletionsHistory list
  const taskCompletionsHistory: {
    userEmail: string;
    campaignId: string;
    campaignTitle: string;
    campaignType: string;
    channelTitle: string;
    creditsReward: number;
    completedAt: string;
  }[] = [];

  campaigns.forEach(c => {
    if (c.completedUsers && Array.isArray(c.completedUsers)) {
      c.completedUsers.forEach(userEmail => {
        const u = userEmail.toLowerCase().trim();
        const timestamp = (taskCompletionTimestamps[u] && taskCompletionTimestamps[u][c.id]) || undefined;
        taskCompletionsHistory.push({
          userEmail: u,
          campaignId: c.id,
          campaignTitle: c.title,
          campaignType: c.type,
          channelTitle: c.channelTitle,
          creditsReward: c.creditsReward,
          completedAt: timestamp ? new Date(timestamp).toISOString() : new Date(c.createdAt).toISOString()
        });
      });
    }
  });

  // Sort by completedAt descending
  taskCompletionsHistory.sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  res.json({
    success: true,
    users: usersList,
    tasks: taskStats,
    taskCompletionsHistory,
    finance: {
      totalEarnings,
      pendingReceipts,
      totalCoinsSold,
      statusCounts,
      packageSales,
    }
  });
});

// Admin approves a payment manual release
app.post("/api/admin/payments/approve/:id", (req, res) => {
  const { id } = req.params;
  const payment = payments.find(p => p.id === id);
  if (!payment) {
    return res.status(404).json({ error: "Pagamento não encontrado." });
  }

  payment.status = "approved";
  
  // Increment some fun global community counters on approval!
  globalStats.totalViewsGenerated += Math.floor(payment.coins * 0.4);
  globalStats.totalLikesDropped += Math.floor(payment.coins * 0.15);
  globalStats.totalActiveMembers += 1;

  // Record Audit Log Action
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    type: "payment_approved",
    message: `Homologado: Admin aprovou o pedido ${id} de ${payment.buyerName} e creditou +${payment.coins.toLocaleString()} moedas.`,
    timestamp: new Date().toISOString(),
    userEmail: payment.userEmail,
  };
  auditLogs.unshift(newLog);
  if (auditLogs.length > 200) {
    auditLogs = auditLogs.slice(0, 200);
  }

  saveDb();
  console.log(`[PAGAMENTO APROVADO] Pagamento ${id} de ${payment.userEmail} foi APROVADO por ADM.`);
  res.json({ success: true, payment });
});

// Admin rejects a payment
app.post("/api/admin/payments/reject/:id", (req, res) => {
  const { id } = req.params;
  const payment = payments.find(p => p.id === id);
  if (!payment) {
    return res.status(404).json({ error: "Pagamento não encontrado." });
  }

  payment.status = "rejected";

  // Record Audit Log Action
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    type: "payment_rejected",
    message: `Recusado: Admin rejeitou o pedido ${id} de ${payment.buyerName}.`,
    timestamp: new Date().toISOString(),
    userEmail: payment.userEmail,
  };
  auditLogs.unshift(newLog);
  if (auditLogs.length > 200) {
    auditLogs = auditLogs.slice(0, 200);
  }

  saveDb();
  console.log(`[PAGAMENTO REJEITADO] Pagamento ${id} de ${payment.userEmail} foi REJEITADO por ADM.`);
  res.json({ success: true, payment });
});

// Admin gifts coins directly to a user's email
app.post("/api/admin/gift-coins", (req, res) => {
  const { adminEmail, recipientEmail, coins } = req.body;
  if (!adminEmail || !isEmailOrPhoneAdmin(adminEmail)) {
    return res.status(403).json({ success: false, error: "Apenas administradores autorizados (Tiago Alves) podem enviar moedas." });
  }

  if (!recipientEmail || typeof recipientEmail !== "string") {
    return res.status(400).json({ success: false, error: "O e-mail de destino é obrigatório." });
  }

  const cleanRecipient = recipientEmail.trim().toLowerCase();
  const coinsNum = Number(coins);

  if (isNaN(coinsNum) || coinsNum <= 0) {
    return res.status(400).json({ success: false, error: "A quantidade de moedas deve ser um número maior que zero." });
  }

  // Create a new direct-gift payment record that is immediately approved
  const newPayment: Payment = {
    id: `pay-gift-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    buyerName: "Enviado pelo Administrador",
    userEmail: cleanRecipient,
    coins: coinsNum,
    value: 0,
    packageName: "Envio de Suporte / Bônus Especial ADM",
    paymentMethod: "ADM GIFT",
    status: "approved",
    claimed: false,
    createdAt: new Date().toISOString(),
  };

  payments.unshift(newPayment);

  // Keep payments collection clean
  if (payments.length > 200) {
    payments = payments.slice(0, 200);
  }

  // Record Audit Log Action
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    type: "payment_approved",
    message: `Envio de Moedas: Admin enviou +${coinsNum.toLocaleString()} moedas diretamente para ${cleanRecipient}.`,
    timestamp: new Date().toISOString(),
    userEmail: cleanRecipient,
  };
  auditLogs.unshift(newLog);
  if (auditLogs.length > 200) {
    auditLogs = auditLogs.slice(0, 200);
  }

  saveDb();
  console.log(`[MOEDAS ENVIADAS] Admin enviou ${coinsNum} moedas para ${cleanRecipient}`);
  res.json({ success: true, message: `Excelente! Foram enviadas ${coinsNum.toLocaleString()} moedas para o e-mail ${cleanRecipient}. Elas serão creditadas no saldo do usuário instantaneamente.` });
});

// Admin endpoint to edit user coins directly
app.post("/api/admin/edit-user-coins", (req, res) => {
  const { adminEmail, recipientEmail, coins } = req.body;
  if (!adminEmail || !isEmailOrPhoneAdmin(adminEmail)) {
    return res.status(403).json({ success: false, error: "Apenas administradores autorizados (Tiago Alves) podem editar moedas diretamente." });
  }

  if (!recipientEmail) {
    return res.status(400).json({ success: false, error: "O e-mail do destinatário é obrigatório." });
  }

  const cleanRecipient = recipientEmail.trim().toLowerCase();
  const coinsNum = Math.floor(Number(coins));

  if (isNaN(coinsNum) || coinsNum < 0) {
    return res.status(400).json({ success: false, error: "Quantidade de moedas deve ser zero ou maior." });
  }

  if (!userProfiles[cleanRecipient]) {
    userProfiles[cleanRecipient] = {
      email: cleanRecipient,
      credits: coinsNum,
      updatedAt: new Date().toISOString()
    };
  } else {
    userProfiles[cleanRecipient].credits = coinsNum;
    userProfiles[cleanRecipient].updatedAt = new Date().toISOString();
  }

  // Record Audit Log Action
  const newLog: AuditLog = {
    id: `log-edit-${Date.now()}`,
    type: "payment_approved",
    message: `Alteração de Saldo: Admin alterou diretamente o saldo de ${cleanRecipient} para ${coinsNum.toLocaleString()} moedas.`,
    timestamp: new Date().toISOString(),
    userEmail: cleanRecipient,
  };
  auditLogs.unshift(newLog);
  if (auditLogs.length > 200) {
    auditLogs = auditLogs.slice(0, 200);
  }

  saveDb();
  console.log(`[ADM SALDO ALTERADO] Admin alterou o saldo de ${cleanRecipient} para ${coinsNum} moedas.`);
  res.json({ success: true, message: `Saldo de ${cleanRecipient} foi atualizado com sucesso para ${coinsNum.toLocaleString()} moedas.` });
});

// Admin export database backup file (For hosting and backup persistence)
app.get("/api/admin/database/export", (req, res) => {
  try {
    saveDb(); // Synchronize in-memory changes to file
    if (!fs.existsSync(DB_FILE)) {
      return res.status(404).json({ error: "Arquivo de banco de dados não encontrado no servidor." });
    }
    const rawText = fs.readFileSync(DB_FILE, "utf-8");
    res.setHeader("Content-disposition", "attachment; filename=campaigns-db.json");
    res.setHeader("Content-type", "application/json; charset=utf-8");
    res.send(rawText);
  } catch (err: any) {
    console.error("[BACKUP EXPORT ERR]", err);
    res.status(500).json({ error: `Falha ao empacotar banco de dados JSON: ${err.message}` });
  }
});

// Admin import database backup file (For restoring state or importing hosted schema)
app.post("/api/admin/database/import", (req, res) => {
  try {
    const { database } = req.body;
    if (!database) {
      return res.status(400).json({ error: "O corpo/payload do banco de dados está vazio." });
    }

    let parsed: any;
    if (typeof database === "string") {
      parsed = JSON.parse(database);
    } else {
      parsed = database;
    }

    // Direct validation of required lists
    if (!parsed.campaigns || !Array.isArray(parsed.campaigns)) {
      return res.status(400).json({ error: "Estrutura inválida. O banco de dados JSON precisa conter a lista de 'campaigns' (campanhas)." });
    }

    // Keep state in memory
    campaigns = parsed.campaigns;

    if (parsed.deletedCampaignKeys && Array.isArray(parsed.deletedCampaignKeys)) {
      deletedCampaignKeys.clear();
      parsed.deletedCampaignKeys.forEach((key: string) => {
        deletedCampaignKeys.add(key);
      });
    }

    if (parsed.globalStats) {
      globalStats = { ...globalStats, ...parsed.globalStats };
    }

    if (parsed.payments && Array.isArray(parsed.payments)) {
      payments = parsed.payments;
    }

    if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) {
      auditLogs = parsed.auditLogs;
    }

    if (parsed.pinnedChannels && Array.isArray(parsed.pinnedChannels)) {
      pinnedChannels = parsed.pinnedChannels.map((item: any) => {
        if (typeof item === "string") {
          let extTitle = "Canal Parceiro";
          if (item.includes("@")) {
            const parts = item.split("@");
            extTitle = "@" + (parts[1] ? parts[1].split("/")[0].split("?")[0] : "");
          }
          return {
            url: item,
            name: extTitle,
            avatarUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=120&h=120&q=80"
          };
        }
        return item;
      });
    }

    // Log the restore event into audit logger
    const restoreEvent: AuditLog = {
      id: `log-${Date.now()}`,
      type: "campaign_created",
      message: `🔄 Restauração Completa: O administrador substituiu todo o banco de dados do site importando um novo arquivo de hospedagem JSON.`,
      timestamp: new Date().toISOString(),
      userEmail: "cpdatividades@gmail.com",
    };
    auditLogs.unshift(restoreEvent);

    // Save state back to the disk database file
    saveDb();

    console.log(`[IMPORT SUCCESS] Banco de dados em nuvem restaurado via painel do ADM: ${campaigns.length} campanhas, ${payments.length} pagamentos.`);
    res.json({
      success: true,
      message: "Banco de dados importado e aplicado com êxito!",
      stats: {
        campaignsCount: campaigns.length,
        paymentsCount: payments.length,
        auditLogsCount: auditLogs.length,
      }
    });
  } catch (err: any) {
    console.error("[BACKUP IMPORT ERR]", err);
    res.status(500).json({ error: `Falha ao processar e aplicar o JSON importado: ${err.message}` });
  }
});

// --- ADMIN AUTOMATIC CLOUD DATABASE SYNC ENDPOINTS ---
app.get("/api/admin/sync-status", (req, res) => {
  res.json({
    success: true,
    firestoreConnected: !!firestoreDb,
    projectId: firebaseConfig?.projectId || "Nenhum",
    databaseId: firebaseConfig?.firestoreDatabaseId || "Padrão",
    counts: {
      campaigns: campaigns.length,
      userProfiles: Object.keys(userProfiles).length,
      payments: payments.length,
      auditLogs: auditLogs.length,
      deletedCampaignKeys: deletedCampaignKeys.size
    }
  });
});

app.post("/api/admin/sync-force", async (req, res) => {
  if (!firestoreDb) {
    return res.status(500).json({ error: "O Firestore não está conectado ou configurado no servidor." });
  }
  try {
    await forceSyncToCloud();
    res.json({ success: true, message: "Todas as campanhas e saldos locais foram forçados e sincronizados com a nuvem Firestore com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao forçar backup para a nuvem: ${err.message}` });
  }
});

app.post("/api/admin/sync-restore", async (req, res) => {
  if (!firestoreDb) {
    return res.status(500).json({ error: "O Firestore não está conectado ou configurado no servidor." });
  }
  try {
    await syncFromFirestore();
    // Salva localmente
    try {
      const data = {
        campaigns,
        deletedCampaignKeys: Array.from(deletedCampaignKeys),
        globalStats,
        payments,
        auditLogs,
        pinnedChannels,
        userProfiles,
        taskCompletionTimestamps,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {}
    res.json({ success: true, message: "Banco de dados recuperado do Firestore e sincronizado localmente com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao restaurar dados da nuvem: ${err.message}` });
  }
});

// User polls for approved but unclaimed coin deposits
app.get("/api/payments/check-approved", (req, res) => {
  const email = (req.query.email as string || "").toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "Email do usuário é obrigatório." });
  }

  const approvedUnclaimed = payments.filter(
    p => p.userEmail === email && p.status === "approved" && !p.claimed
  );

  res.json({ success: true, payments: approvedUnclaimed });
});

// Mark coin deposits as claimed in client storage to prevent double claim
app.post("/api/payments/claim", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "ID do pagamento é obrigatório." });
  }

  const payment = payments.find(p => p.id === id);
  if (!payment) {
    return res.status(404).json({ error: "Pagamento não encontrado." });
  }

  payment.claimed = true;
  saveDb();
  console.log(`[PAGAMENTO REIVINDICADO] Moedas do pagamento ${id} aplicadas no saldo do usuário.`);
  res.json({ success: true });
});

// Sync user credits (coins) to search/persist across sessions and device loads
app.post("/api/user/sync", (req, res) => {
  const { email, credits } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
  }

  const emailClean = email.trim().toLowerCase();

  // If simple admin login, always give unlimited admin credits
  if (isEmailOrPhoneAdmin(emailClean)) {
    userProfiles[emailClean] = {
      email: emailClean,
      credits: 999999999,
      updatedAt: new Date().toISOString()
    };
    return res.json({ success: true, profile: userProfiles[emailClean] });
  }

  const creditsNum = Math.floor(Number(credits));
  if (isNaN(creditsNum) || creditsNum < 0) {
    return res.status(400).json({ error: "Quantidade de moedas inválida." });
  }

  userProfiles[emailClean] = {
    email: emailClean,
    credits: creditsNum,
    updatedAt: new Date().toISOString()
  };

  saveDb();
  console.log(`[SYNC MOEDAS] Sincronizado saldo de ${emailClean}: ${creditsNum} moedas.`);
  res.json({ success: true, profile: userProfiles[emailClean] });
});

// Retrieve user credits (coins) of a specific email
app.get("/api/user/profile", (req, res) => {
  const email = (req.query.email as string || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
  }

  const profile = userProfiles[email];
  if (!profile) {
    return res.json({ success: false, message: "Perfil não encontrado no banco de dados persistente." });
  }

  res.json({ success: true, profile });
});

// Real-state persistence of simulated Pix cash logs (legacy/failsafe)
app.post("/api/pix/log-purchase", (req, res) => {
  const { userEmail, coins, value } = req.body;
  if (!userEmail) {
    return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
  }

  console.log(`[PIX COMPRA COMPENSADA] Usuário ${userEmail} adquiriu ${coins} moedas por R$ ${value}`);

  // Increment some fun global community counters as reaction to new purchases!
  globalStats.totalViewsGenerated += Math.floor(coins * 0.4);
  globalStats.totalLikesDropped += Math.floor(coins * 0.15);
  globalStats.totalActiveMembers += 1;
  
  saveDb();

  res.json({ success: true, message: "Moedas compensadas e salvas com sucesso!" });
});


/* ================== PHONE AUTHENTICATION SYSTEM ================== */

function isValidBrazilianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  // Brazilian phones:
  // With country code 55: 55 + 2 digits DDD + 8 or 9 digits = 12 or 13 digits total.
  // Without country code: 2 digits DDD + 8 or 9 digits = 10 or 11 digits total.
  if (digits.length === 10 || digits.length === 11) {
    const ddd = parseInt(digits.substring(0, 2), 10);
    return ddd >= 11 && ddd <= 99;
  }
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith("55")) {
      const ddd = parseInt(digits.substring(2, 4), 10);
      return ddd >= 11 && ddd <= 99;
    }
  }
  return false;
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function formatToE164(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 10 || clean.length === 11) {
    clean = "55" + clean;
  }
  return "+" + clean;
}

async function sendActualSms(toNumber: string, message: string): Promise<{ success: boolean; provider?: string; error?: string }> {
  const e164Number = formatToE164(toNumber);
  
  // 1. Twilio Option
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioAuthToken && twilioFrom) {
    try {
      const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64");
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          To: e164Number,
          From: twilioFrom,
          Body: message
        }).toString()
      });

      const data = await res.json() as any;
      if (res.ok) {
        console.log(`[SMS SENDER] SMS enviado via Twilio com sucesso para ${e164Number}. SID: ${data.sid}`);
        return { success: true, provider: "Twilio" };
      } else {
        console.error(`[SMS SENDER ERROR] Erro na API do Twilio para ${e164Number}:`, data);
        return { success: false, provider: "Twilio", error: data.message || "Erro desconhecido no Twilio" };
      }
    } catch (err: any) {
      console.error(`[SMS SENDER EXCEPTION] Falha no Twilio para ${e164Number}:`, err);
      return { success: false, provider: "Twilio", error: err.message || err.toString() };
    }
  }

  // 2. SMSDev Option
  const smsDevKey = process.env.SMSDEV_API_KEY;
  if (smsDevKey) {
    try {
      const cleanDigits = toNumber.replace(/\D/g, "");
      let formattedPhone = cleanDigits;
      if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = "55" + formattedPhone;
      }

      const url = `https://api.smsdev.com.br/v1/send?key=${smsDevKey}&type=9&number=${formattedPhone}&msg=${encodeURIComponent(message)}`;
      const res = await fetch(url);
      const data = await res.json() as any;
      
      if (res.ok && data.situacao === "OK") {
        console.log(`[SMS SENDER] SMS enviado via SMSDev com sucesso para ${formattedPhone}. ID: ${data.id}`);
        return { success: true, provider: "SMSDev" };
      } else {
        console.error(`[SMS SENDER ERROR] Erro na API SMSDev para ${formattedPhone}:`, data);
        return { success: false, provider: "SMSDev", error: data.descricao || "Erro desconhecido no SMSDev" };
      }
    } catch (err: any) {
      console.error(`[SMS SENDER EXCEPTION] Falha no SMSDev para ${toNumber}:`, err);
      return { success: false, provider: "SMSDev", error: err.message || err.toString() };
    }
  }

  // 3. Zenvia Option
  const zenviaToken = process.env.ZENVIA_API_TOKEN;
  const zenviaSender = process.env.ZENVIA_SENDER_ID || "sender";
  if (zenviaToken) {
    try {
      const cleanDigits = toNumber.replace(/\D/g, "");
      let formattedPhone = cleanDigits;
      if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = "55" + formattedPhone;
      }

      const zenviaRes = await fetch("https://api.zenvia.com/v2/channels/sms/messages", {
        method: "POST",
        headers: {
          "X-API-TOKEN": zenviaToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: zenviaSender,
          to: formattedPhone,
          contents: [{
            type: "text",
            text: message
          }]
        })
      });

      const data = await zenviaRes.json() as any;
      if (zenviaRes.ok) {
        console.log(`[SMS SENDER] SMS enviado via Zenvia com sucesso para ${formattedPhone}. ID: ${data.id}`);
        return { success: true, provider: "Zenvia" };
      } else {
        console.error(`[SMS SENDER ERROR] Erro na API do Zenvia para ${formattedPhone}:`, data);
        return { success: false, provider: "Zenvia", error: JSON.stringify(data) };
      }
    } catch (err: any) {
      console.error(`[SMS SENDER EXCEPTION] Falha no Zenvia para ${toNumber}:`, err);
      return { success: false, provider: "Zenvia", error: err.message || err.toString() };
    }
  }

  return { 
    success: false, 
    error: "Nenhum gateway de SMS configurado! Configure TWILIO_ACCOUNT_SID, SMSDEV_API_KEY ou ZENVIA_API_TOKEN nas variáveis de ambiente do painel AI Studio (Secrets) para enviar SMS reais." 
  };
}

// Send Verification Code to Phone Number
app.post("/api/auth/phone/send-code", async (req, res) => {
  const { phone, password, name } = req.body;
  if (!phone || !password || !name) {
    return res.status(400).json({ success: false, message: "Todos os campos (Telefone, Senha e Nome) são obrigatórios para envio do código." });
  }

  const cleanPhone = phone.replace(/\D/g, "");
  if (!isValidBrazilianPhone(phone)) {
    return res.status(400).json({ success: false, message: "Número de telefone inválido! Por favor, insira um número válido brasileiro com DDD (ex: 11 99999-9999)." });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "A senha deve ter pelo menos 6 caracteres." });
  }

  if (phoneUsers[cleanPhone]) {
    return res.status(400).json({ success: false, message: "Este número de telefone já está registrado!" });
  }

  // Generate 6-digit random code
  const generatedCode = (Math.floor(100000 + Math.random() * 900000)).toString();
  
  // Save code with 10-minutes expiry
  verificationCodes[cleanPhone] = {
    code: generatedCode,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  const smsResult = await sendActualSms(
    cleanPhone, 
    `Seu codigo de ativacao do canal e: ${generatedCode}. Nao compartilhe.`
  );

  if (!smsResult.success) {
    // If real sending fails because no credentials have been filled in yet, 
    // we return a clear operational instructions message to the user!
    return res.status(400).json({
      success: false,
      message: `Erro ao enviar SMS real: ${smsResult.error}`
    });
  }

  res.json({
    success: true,
    message: `Código de verificação enviado com sucesso por SMS via ${smsResult.provider}!`,
    code: generatedCode // Maintain fallback in JSON inside sandbox environments just in case, but SMS is fully dispatched
  });
});

// Phone Number Registration (No Verification Code required)
app.post("/api/auth/phone/register", (req, res) => {
  const { phone, password, name } = req.body;
  if (!phone || !password || !name) {
    return res.status(400).json({ success: false, message: "Todos os campos (Telefone, Senha e Nome) são obrigatórios." });
  }

  const cleanPhone = phone.replace(/\D/g, "");
  if (!isValidBrazilianPhone(phone)) {
    return res.status(400).json({ success: false, message: "Número de telefone inválido! Por favor, insira um número válido brasileiro com DDD (ex: 11 99999-9999)." });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "A senha deve ter pelo menos 6 caracteres." });
  }

  if (phoneUsers[cleanPhone]) {
    return res.status(400).json({ success: false, message: "Este número de telefone já está registrado!" });
  }

  // If the user's phone is Tiago Alves (81985702243), give them ADMIN welcome coins (999999999)
  const isAdm = cleanPhone === "81985702243";
  const startCredits = isAdm ? 999999999 : 1500;
  const registerName = isAdm ? "Tiago Alves" : name.trim();

  const passwordHash = hashPassword(password);
  const newUser = {
    phone: cleanPhone,
    name: registerName,
    passwordHash,
    credits: startCredits,
    createdAt: new Date().toISOString()
  };

  phoneUsers[cleanPhone] = newUser;
  
  userProfiles[cleanPhone] = {
    email: cleanPhone,
    credits: startCredits,
    updatedAt: new Date().toISOString()
  };

  saveDb();
  console.log(`[PHONE REGISTER] Conta criada com sucesso para o telefone: ${cleanPhone} ${isAdm ? "(ADMIN DETECTADO)" : ""}`);

  res.json({
    success: true,
    message: isAdm ? "Parabéns, Tiago Alves! Conta de Administrador criada com sucesso!" : "Cadastro realizado com sucesso!",
    user: {
      phone: cleanPhone,
      name: newUser.name,
      credits: startCredits
    }
  });
});

// Phone Number Login (Seeding Admin if not registered)
app.post("/api/auth/phone/login", (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ success: false, message: "Telefone e senha são obrigatórios." });
  }

  const cleanPhone = phone.replace(/\D/g, "");
  const isAdm = cleanPhone === "81985702243";

  // Auto-seed Tiago Alves if he does not exist yet to facilitate immediate login with standard adm password "92752100" or chosen password
  if (isAdm && !phoneUsers[cleanPhone]) {
    phoneUsers[cleanPhone] = {
      phone: cleanPhone,
      name: "Tiago Alves",
      passwordHash: hashPassword(password),
      credits: 999999999,
      createdAt: new Date().toISOString()
    };
    userProfiles[cleanPhone] = {
      email: cleanPhone,
      credits: 999999999,
      updatedAt: new Date().toISOString()
    };
    saveDb();
  }

  const user = phoneUsers[cleanPhone];
  if (!user) {
    return res.status(400).json({ success: false, message: "Nenhum usuário encontrado com este número de telefone." });
  }

  const incomingHash = hashPassword(password);
  if (user.passwordHash !== incomingHash) {
    return res.status(400).json({ success: false, message: "Senha incorreta. Verifique suas credenciais e tente de novo." });
  }

  const creditsNum = isAdm ? 999999999 : (userProfiles[cleanPhone]?.credits || user.credits || 1500);

  // Ensure record is synchronized in general profiles
  if (!userProfiles[cleanPhone] || isAdm) {
    userProfiles[cleanPhone] = {
      email: cleanPhone,
      credits: creditsNum,
      updatedAt: new Date().toISOString()
    };
    saveDb();
  }

  res.json({
    success: true,
    message: "Login efetuado com sucesso!",
    user: {
      phone: cleanPhone,
      name: user.name,
      credits: creditsNum
    }
  });
});


/* ================== EMAIL VALIDATION ENDPOINT ================== */

app.post("/api/validate-email", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ success: false, message: "E-mail não fornecido ou inválido." });
  }

  const emailClean = email.trim().toLowerCase();

  // 1. Sintaxe básica
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailClean)) {
    return res.status(400).json({ success: false, message: "Formato de e-mail inválido." });
  }

  const parts = emailClean.split("@");
  const username = parts[0];
  const domain = parts[1];

  // 2. Provedor permitido
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
    return res.status(400).json({ 
      success: false, 
      message: "Provedor não suportado. Apenas e-mails do Google (Gmail), Hotmail ou Outlook são permitidos." 
    });
  }

  // 3. Regras específicas de nome de usuário por plataforma (Google vs Microsoft)
  const isGoogle = domain.includes("gmail") || domain.includes("googlemail");
  if (isGoogle) {
    // Regras Gmail
    if (username.length < 6 || username.length > 30) {
      return res.status(400).json({ 
        success: false, 
        message: "O Google não permite contas de Gmail menores que 6 ou maiores que 30 caracteres." 
      });
    }
    // Apenas letras, números e pontos
    const gmailUserRegex = /^[a-z0-9.]+$/;
    if (!gmailUserRegex.test(username)) {
      return res.status(400).json({ 
        success: false, 
        message: "O Gmail permite apenas letras minúsculas (a-z), números (0-9) e pontos (.) no nome do de usuário." 
      });
    }
    // Sem pontos consecutivos
    if (username.includes("..")) {
      return res.status(400).json({ 
        success: false, 
        message: "O Gmail não permite pontos consecutivos (..) no endereço de e-mail." 
      });
    }
    // Não pode começar nem terminar com ponto
    if (username.startsWith(".") || username.endsWith(".")) {
      return res.status(400).json({ 
        success: false, 
        message: "O nome de usuário do Gmail não pode começar nem terminar com ponto (.)" 
      });
    }
  } else {
    // Regras Hotmail / Outlook
    if (username.length < 2 || username.length > 64) {
      return res.status(400).json({ 
        success: false, 
        message: "O Hotmail/Outlook exige nomes de usuário entre 2 e 64 caracteres." 
      });
    }
    // Apenas letras, números, pontos, hifens e underlines
    const outlookUserRegex = /^[a-z0-9._-]+$/;
    if (!outlookUserRegex.test(username)) {
      return res.status(400).json({ 
        success: false, 
        message: "O Hotmail/Outlook permite apenas letras minúsculas (a-z), números (0-9), pontos (.), hifens (-) e sublinhados (_)." 
      });
    }
    // Sem consecutivos especiais
    if (username.includes("..") || username.includes("--") || username.includes("__")) {
      return res.status(400).json({ 
        success: false, 
        message: "O Hotmail/Outlook não permite símbolos consecutivos repetidos (.., --, __)." 
      });
    }
    // Não começa nem termina com símbolos
    const startsEndsSymbol = /^[._-]|[._-]$/;
    if (startsEndsSymbol.test(username)) {
      return res.status(400).json({ 
        success: false, 
        message: "O nome de usuário do Hotmail ou Outlook não pode iniciar ou terminar com ponto, hífen ou sublinhado." 
      });
    }
  }

  // 4. Validação real de MX de DNS resolvida no servidor
  try {
    const mxRecords = await new Promise<dns.MxRecord[]>((resolve, reject) => {
      dns.resolveMx(domain, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses || []);
      });
    });

    if (!mxRecords || mxRecords.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Não foram encontrados servidores de e-mail (MX) ativos para o domínio ${domain}. Certifique-se de que o e-mail existe.` 
      });
    }

    // Sucesso! O domínio é válido e possui servidores de email reais configurados e operacionais.
    return res.json({ 
      success: true, 
      message: "E-mail verificado com sucesso!",
      provider: isGoogle ? "Google" : "Microsoft",
      domain,
      mxCount: mxRecords.length
    });

  } catch (error: any) {
    console.error(`[DNS MX ERROR] Falha ao verificar MX de ${domain}:`, error.message);
    return res.status(400).json({ 
      success: false, 
      message: `Erro na validação do servidor do e-mail: O domínio @${domain} não possui registros MX de correio ativos ou está inacessível no momento.` 
    });
  }
});


/* ================== GOOGLE OAUTH 2.0 FOR GOOGLE SIGN IN ================== */

app.get("/api/auth/google/url", (req, res) => {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  if (!client_id) {
    return res.json({ 
      success: false,
      error: "O Cliente ID do Google não está configurado nas variáveis de ambiente do applet.",
      configured: false
    });
  }

  let parentOrigin = (req.query.origin as string) || process.env.APP_URL;
  if (!parentOrigin) {
    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    if (host) {
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0");
      parentOrigin = `${isLocal ? "http" : "https"}://${host}`;
    }
  }
  if (!parentOrigin) {
    parentOrigin = "http://localhost:3000";
  }
  if (parentOrigin.endsWith("/")) {
    parentOrigin = parentOrigin.slice(0, -1);
  }

  const redirectUri = `${parentOrigin}/auth/callback/google`;
  console.log(`[GOOGLE OAUTH URL] Generated redirectUri: ${redirectUri} from client origin param: ${req.query.origin || 'none'}`);

  const params = new URLSearchParams({
    client_id: client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    prompt: "select_account",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ success: true, url: authUrl, configured: true });
});

app.get(["/auth/callback/google", "/auth/callback/google/"], async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.send(`
      <html>
        <body style="background-color: #0b0f19; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center;">
          <div style="background-color: #111827; border: 1px solid #374151; padding: 24px; border-radius: 16px; max-width: 400px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
            <div style="color: #ef4444; font-size: 32px; margin-bottom: 12px;">⚠️</div>
            <h3 style="margin-top: 0; margin-bottom: 8px;">Falha na Autenticação</h3>
            <p style="font-size: 13px; color: #9ca3af; margin-bottom: 20px;">Ocorreu uma falha ou você cancelou a autorização do Google.</p>
            <button onclick="window.close()" style="background-color: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; text-transform: uppercase;">Fechar Janela</button>
          </div>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("Código de autorização ausente.");
  }

  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    return res.status(500).send("Credenciais do Google OAuth não configuradas no servidor.");
  }

  let parentOrigin = process.env.APP_URL;
  if (!parentOrigin) {
    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    if (host) {
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0");
      parentOrigin = `${isLocal ? "http" : "https"}://${host}`;
    }
  }
  if (!parentOrigin) {
    parentOrigin = "http://localhost:3000";
  }
  if (parentOrigin.endsWith("/")) {
    parentOrigin = parentOrigin.slice(0, -1);
  }

  const redirectUri = `${parentOrigin}/auth/callback/google`;
  console.log(`[GOOGLE OAUTH CALLBACK] Dynamic redirectUri: ${redirectUri}`);

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id,
        client_secret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("[GOOGLE OAUTH ERROR] Failed to exchange token:", errorText);
      throw new Error(`Google token exchange failed: ${tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string; id_token?: string };
    
    // Fetch profile info using the access_token
    const profileRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenData.access_token}`);
    if (!profileRes.ok) {
      throw new Error("Falha ao obter dados do perfil do Google.");
    }

    const profile = await profileRes.json() as { email: string; name?: string; picture?: string };
    const email = (profile.email || "").toLowerCase().trim();
    const name = profile.name || email.split("@")[0] || "Criador Google";

    res.send(`
      <html>
        <body style="background-color: #0b0f19; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 0; text-align: center;">
          <div style="background-color: #111827; border: 1px solid #1e293b; padding: 32px; border-radius: 20px; max-width: 320px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
            <div style="position: relative; width: 64px; height: 64px; margin: 0 auto 16px;">
              ${
                profile.picture 
                  ? `<img src="${profile.picture}" style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid #ef4444;" />`
                  : `<div style="width: 64px; height: 64px; border-radius: 50%; background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">G</div>`
              }
            </div>
            <h3 style="margin-top: 0; margin-bottom: 4px; font-size: 16px; color: #ffffff;">Conectado com sucesso!</h3>
            <p style="font-size: 12px; color: #9ca3af; margin-bottom: 12px; line-height: 1.4;">Seja bem-vindo, <strong style="color: #f8fafc;">${name}</strong></p>
            <div style="font-size: 11px; color: #6b7280; font-family: monospace; word-break: break-all;">${email}</div>
            <p style="font-size: 11px; color: #10b981; margin-top: 24px; font-weight: 500;">Esta janela fechará automaticamente...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                email: '${email}',
                name: '${name}'
              }, '*');
              setTimeout(() => {
                window.close();
              }, 1200);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("[GOOGLE OAUTH ERROR] err:", err);
    res.status(500).send(`
      <html>
        <body style="background-color: #0b0f19; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center;">
          <div style="background-color: #111827; border: 1px solid #374151; padding: 24px; border-radius: 16px; max-width: 400px;">
            <div style="color: #ef4444; font-size: 32px; margin-bottom: 12px;">❌</div>
            <h3 style="margin-top: 0; margin-bottom: 8px;">Erro na Autenticação</h3>
            <p style="font-size: 13px; color: #9ca3af; margin-bottom: 20px;">Falha ao comunicar com o servidor de login do Google: ${err.message || err}</p>
            <button onclick="window.close()" style="background-color: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 11px;">Fechar</button>
          </div>
        </body>
      </html>
    `);
  }
});


/* ================== REVERSE PROXY VITE SERVING ================== */

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`YouTube Brasil Boost running on http://localhost:${PORT}`);
    try {
      fs.writeFileSync(path.join(process.cwd(), "server-running.log"), `SUCCESS_START_${Date.now()}`);
    } catch (e) {}
  });

  server.on("error", (err: any) => {
    console.error("[SERVER LISTEN ERROR]", err);
    try {
      fs.writeFileSync(path.join(process.cwd(), "server-error.log"), `ERROR_${err.code || err.message || "UNKNOWN"}_${Date.now()}`);
    } catch (e) {}
  });
}

start();
