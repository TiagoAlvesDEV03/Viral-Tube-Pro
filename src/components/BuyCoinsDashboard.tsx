import React, { useState } from "react";
import { Coins, Check, Copy, CreditCard, RefreshCw, Sparkles, TrendingUp, Wallet, CheckCircle, Smartphone } from "lucide-react";

interface BuyCoinsDashboardProps {
  userEmail: string;
  onCoinsAdded: (amount: number) => void;
}

interface PackageTier {
  id: string;
  name: string;
  coins: number;
  price: number;
  popular: boolean;
  bonusText?: string;
  badgeColor: string;
  gradient: string;
}

export default function BuyCoinsDashboard({ userEmail, onCoinsAdded }: BuyCoinsDashboardProps) {
  const [selectedTier, setSelectedTier] = useState<PackageTier | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedCpf, setCopiedCpf] = useState(false);
  const [copiedCopiaCola, setCopiedCopiaCola] = useState(false);
  const [activePaymentTab, setActivePaymentTab] = useState<"cpf" | "copia_cola" | "qrcode">("qrcode");
  const [step, setStep] = useState<"select" | "checkout" | "pending_approval" | "success">("select");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const packages: PackageTier[] = [
    {
      id: "bronze",
      name: "Pacote Bronze",
      coins: 1500,
      price: 9.90,
      popular: false,
      bonusText: "Perfeito para testar",
      badgeColor: "bg-amber-900/40 text-amber-300 border-amber-800/30",
      gradient: "from-amber-600/10 to-amber-900/10 hover:border-amber-500/30",
    },
    {
      id: "prata",
      name: "Pacote Prata",
      coins: 4500, // 4000 + 500 bonus
      price: 19.90,
      popular: true,
      bonusText: "+500 Moedas de Bônus inclusas",
      badgeColor: "bg-slate-700/40 text-slate-250 border-slate-600/30",
      gradient: "from-slate-500/15 to-slate-800/10 hover:border-red-500/30",
    },
    {
      id: "ouro",
      name: "Pacote Ouro CP",
      coins: 11000, // 10000 + 1000 bonus
      price: 39.90,
      popular: false,
      bonusText: "+1.000 Moedas de Bônus inclusas",
      badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse",
      gradient: "from-yellow-600/15 via-slate-900/10 to-yellow-900/10 hover:border-yellow-500/40",
    },
    {
      id: "diamante",
      name: "Impulso Supremo",
      coins: 30000, // 25000 + 5000 bonus
      price: 79.90,
      popular: false,
      bonusText: "Super Turbina (+5.000 de Bônus)",
      badgeColor: "bg-red-500/20 text-red-400 border-red-500/30 font-black",
      gradient: "from-red-600/20 via-slate-900/10 to-purple-950/20 hover:border-red-500/50",
    },
  ];

  // Poll for approvals when payment is pending
  React.useEffect(() => {
    if (step !== "pending_approval") return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/check-approved?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.payments && data.payments.length > 0) {
            // Found a payment approved and unclaimed!
            for (const payment of data.payments) {
              await fetch("/api/payments/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: payment.id }),
              });
              onCoinsAdded(payment.coins);
            }
            setStep("success");
          }
        }
      } catch (err) {
        console.error("Erro ao verificar pagamentos aprovados:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [step, userEmail, onCoinsAdded]);

  const handleSelectTier = (tier: PackageTier) => {
    setSelectedTier(tier);
    setStep("checkout");
  };

  const getPixPayload = (tier: PackageTier) => {
    const amountStr = tier.price.toFixed(2).replace(".", "");
    return `00020101021226830014br.gov.bcb.pix2561pix.pagamentofacil.com/v1/cpd/6009SAO_PAULO62210515viraltubepro${tier.id}${amountStr}`;
  };

  const handleCopyPix = (payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleCopyCpf = () => {
    navigator.clipboard.writeText("021cff91-b818-4455-9bef-7e76de1816d1");
    setCopiedCpf(true);
    setTimeout(() => setCopiedCpf(false), 2000);
  };

  const handleCopyCopiaCola = () => {
    navigator.clipboard.writeText("00020126560014br.gov.bcb.pix0124ultragrafica@outlook.com0206Moedas5204000053039865802BR5911Tiago Alves6009Sao Paulo62160512ViralTubePro6304A702");
    setCopiedCopiaCola(true);
    setTimeout(() => setCopiedCopiaCola(false), 2000);
  };

  const startSimulatePayment = async () => {
    if (!selectedTier) return;
    if (!buyerName.trim()) {
      setNameError("Por favor, digite seu nome completo para podermos registrar seu Pix.");
      return;
    }
    setNameError(null);

    setVerifyingPayment(true);
    setProgressLog(["Iniciando registro do seu pedido no servidor..."]);

    try {
      const pMethod = activePaymentTab === "cpf" ? "Chave Aleatória" : activePaymentTab === "copia_cola" ? "Copia e Cola" : "QR Code Pix";
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: userEmail || "anonimo@cooperado.com",
          buyerName: buyerName,
          coins: selectedTier.coins,
          value: selectedTier.price,
          packageName: selectedTier.name,
          paymentMethod: pMethod,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const createdPayment = data.payment;
        setPendingPaymentId(createdPayment.id);
        
        setProgressLog((prev) => [...prev, "✓ Pedido registrado com sucesso no banco de dados."]);
        setProgressLog((prev) => [...prev, "→ Redirecionando para o WhatsApp do Suporte (81) 98533-9119..."]);

        // Build WhatsApp message details
        const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const whatsappText = `Olá Tiago! Realizei o Pix para adquirir moedas no ViralTubePro. Seguem os detalhes do meu pagamento para liberação manual:

Nome Completo: ${buyerName}
E-mail da Conta: ${userEmail || "anonimo@cooperado.com"}
Pacote Selecionado: ${selectedTier.name}
Valor de Transferência: R$ ${selectedTier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
Crédito a Receber: +${selectedTier.coins.toLocaleString()} Moedas
Opção de Pagamento: ${pMethod}
Data e Hora: ${nowStr}
ID do Pedido: ${createdPayment.id}

Fiz a transferência do valor de R$ ${selectedTier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para Tiago Alves, por favor libere minhas moedas!`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=5581985339119&text=${encodeURIComponent(whatsappText)}`;
        
        // Wait briefly for feel of the flow
        await new Promise((r) => setTimeout(r, 600));
        
        // Open WhatsApp safely within sandbox constraints
        try {
          window.open(whatsappUrl, "_blank");
        } catch (openaiErr) {
          console.warn("Navegador bloqueou abertura automática do WhatsApp. Use o botão na próxima tela.", openaiErr);
        }

        // Transition to pending approval step
        setStep("pending_approval");
      } else {
        setProgressLog((prev) => [...prev, "❌ Erro ao registrar pedido no servidor de pagamentos."]);
      }
    } catch (err) {
      console.error(err);
      setProgressLog((prev) => [...prev, "❌ Falha crítica de conexão ao gateway manual de Pix."]);
    } finally {
      setVerifyingPayment(false);
    }
  };

  return (
    <div id="buy-coins-dashboard-root" className="bg-slate-950 border border-slate-850 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-xl">
      {/* Visual flair decoration */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      {step === "select" && (
        <div className="space-y-6">
          <div className="border-b border-slate-850 pb-4">
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
              Adquirir Moedas do Canal em Segundos
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Compre moedas virtuais do ViralTubePro para colocar seus vídeos no topo e obter curtidas, comentários e inscritos reais do Brasil de forma imediata.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((tier) => (
              <div
                key={tier.id}
                id={tier.id === "prata" ? "buy-coins-tier-prata" : undefined}
                onClick={() => handleSelectTier(tier)}
                className={`border rounded-3xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 relative group bg-slate-900/40 hover:scale-105 active:scale-95 text-left ${
                  tier.popular
                    ? "border-red-500/55 shadow-lg shadow-red-950/20 bg-red-950/5"
                    : "border-slate-850 hover:border-slate-700"
                } ${tier.gradient}`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-4 px-2.5 py-0.5 bg-red-600 border border-red-500 text-[8px] font-black uppercase text-white rounded-full tracking-widest shadow">
                    Mais Vendido 🔥
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border ${tier.badgeColor}`}>
                      {tier.name}
                    </span>
                    <TrendingUp className="w-4 h-4 text-slate-500 group-hover:text-amber-400 duration-200" />
                  </div>

                  <div>
                    <p className="text-2xl font-black font-mono text-white tracking-tight flex items-baseline gap-1 group-hover:text-amber-300 duration-200">
                      {tier.coins.toLocaleString()}
                      <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">moedas</span>
                    </p>
                    {tier.bonusText && (
                      <p className="text-[9px] text-green-400 font-sans mt-1 flex items-center gap-1 font-bold">
                        <Sparkles className="w-3 h-3 text-green-400 fill-green-400" />
                        {tier.bonusText}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Preço Único</span>
                    <span className="text-base font-black text-white font-mono">
                      R$ {tier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button className="w-full mt-3 py-2 bg-slate-950 hover:bg-white hover:text-slate-950 duration-200 border border-slate-800 text-[10px] font-bold uppercase rounded-xl tracking-wider cursor-pointer">
                    Selecionar Pacote
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* STATIC HIGH-FIDELITY VISUAL STEP-BY-STEP GUIDE (SIMULATING SCREENSHOTS/PRINTS) */}
          <div className="bg-slate-900/20 border border-slate-850 rounded-3xl p-6 space-y-6 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-4">
              <div>
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Guia de Compra Prático (Passo a Passo Visual) 📸
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Veja como funciona o processo de aquisição e liberação rápida de moedas na nossa rede.
                </p>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 rounded-lg">
                Procedimento 100% Seguro
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* STEP 1 SNAPSHOT PRINT */}
              <div className="bg-slate-950/85 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700/60 transition duration-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-widest text-red-400">PASSO 1</span>
                    <span className="text-[8.5px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded-md">Interativo</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-150 text-slate-200">Escolha o Pacote</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Selecione um dos nossos pacotes de moedas. O Pacote Prata é o mais popular com bônus extra.
                  </p>
                </div>

                {/* Simulated screenshot/mock of step 1 */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3 relative overflow-hidden">
                  <div className="border border-red-500/50 bg-red-950/10 rounded-lg p-2 text-center relative">
                    <span className="absolute -top-1.5 left-1 text-[7px] bg-red-600 text-white rounded px-1 scale-90">Prata</span>
                    <span className="text-[11px] font-black text-white block">4.500 Moedas</span>
                    <span className="text-[9px] text-amber-400 font-mono block">R$ 19,90</span>
                    <div className="mt-1.5 py-1 bg-red-600 rounded text-[7px] text-white font-bold uppercase tracking-wider scale-95 flex items-center justify-center gap-0.5">
                      <span>Selecionar</span>
                    </div>
                  </div>
                  {/* Decorative Cursor pointing */}
                  <div className="absolute bottom-2 right-4 w-4 h-4 text-white animate-bounce pointer-events-none">
                    👉
                  </div>
                </div>
              </div>

              {/* STEP 2 SNAPSHOT PRINT */}
              <div className="bg-slate-950/85 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700/60 transition duration-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-widest text-red-400">PASSO 2</span>
                    <span className="text-[8.5px] font-mono bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded-md font-bold">Pix Copiado</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-150 text-slate-200">Copie ou Leia o Pix</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Copie a chave Pix aleatória, use o código Copia e Cola ou faça a leitura do QR Code na tela.
                  </p>
                </div>

                {/* Simulated screenshot/mock of step 2 */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2 relative">
                  <div className="flex justify-center bg-slate-950 p-1 border border-slate-850 rounded-lg">
                    <div className="flex items-center w-full justify-between gap-1">
                      <div className="h-1.5 bg-slate-800 rounded w-2/3" />
                      <div className="bg-green-500/20 text-green-400 border border-green-500/30 text-[7px] font-bold px-1 rounded flex items-center gap-0.5">
                        <span>✓ Copiado</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1 bg-slate-950 p-1 rounded-md text-[7px] font-mono text-slate-500 truncate">
                      00020126560014br.gov.bcb.pix0124...
                    </div>
                  </div>
                  <p className="text-[7.5px] text-center text-slate-450 text-slate-400 font-mono">
                    Beneficiário: <strong className="text-white">Tiago Alves</strong>
                  </p>
                </div>
              </div>

              {/* STEP 3 SNAPSHOT PRINT */}
              <div className="bg-slate-950/85 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700/60 transition duration-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-widest text-red-100 text-red-400">PASSO 3</span>
                    <span className="text-[8.5px] font-mono bg-slate-900 text-slate-450 text-slate-400 px-1.5 py-0.5 rounded-md">Servidor</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-150 text-slate-200">Digite seu Nome</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Insira seu nome completo do Pix no campo indicado para registrar seu pedido pendente de liberação.
                  </p>
                </div>

                {/* Simulated screenshot/mock of step 3 */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="space-y-1">
                    <div className="h-2 bg-slate-800 rounded w-1/2" />
                    <div className="bg-slate-950 border border-slate-800 p-1 rounded text-[7.5px] font-sans text-slate-200 block truncate">
                      Seu Nome Completo do Pix...
                    </div>
                  </div>
                  <div className="w-full bg-red-650 py-1 rounded text-[7px] text-white font-bold text-center uppercase scale-95">
                    Confirmar Pagamento ⚡
                  </div>
                </div>
              </div>

              {/* STEP 4 SNAPSHOT PRINT */}
              <div className="bg-slate-950/85 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700/60 transition duration-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-widest text-red-400">PASSO 4</span>
                    <span className="text-[8.5px] font-mono bg-green-950/30 text-green-400 border border-green-900/30 px-1.5 py-0.5 rounded-md font-extrabold uppercase scale-95">WhatsApp</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-200">Envie o Comprovante</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Clique em "Enviar Comprovante" para encaminhar a mensagem automática para o WhatsApp do suporte.
                  </p>
                </div>

                {/* Simulated screenshot/mock of step 4 */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="bg-emerald-950/40 border border-emerald-900/30 p-1.5 rounded-lg space-y-1 text-[7px] text-emerald-300 leading-snug">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span>Mensagem Pronta no WhatsApp:</span>
                    </div>
                    <p className="italic font-sans opacity-85">"Olá Tiago, meu Pix foi enviado! Libera meu pacote..."</p>
                  </div>
                  <div className="w-full bg-emerald-600 py-1 rounded text-[7.5px] text-white font-extrabold text-center uppercase flex items-center justify-center gap-0.5">
                    <span>Enviar Comprovante 💬</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-10 h-10 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center text-red-400 shrink-0">
              <Smartphone className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-200">Por que investir na rede ViralTubePro?</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
                Ao invés de passar horas completando tarefas para ganhar moedas, a compra possibilita o impulsionamento de seus vídeos em minutos. Suas campanhas são entregues na aba prioritária dos membros reais brasileiros com validação e detecção automatizada contra trapaças.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === "checkout" && selectedTier && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-red-500" />
              Finalize Seu Pagamento Pix Inteligente
            </h2>
            <button
              onClick={() => setStep("select")}
              className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-400 py-1.5 px-3 rounded-xl border border-slate-800 hover:text-white transition-all cursor-pointer font-bold"
            >
              Voltar aos Pacotes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Box: Information & Tabs for the 3 payment options */}
            <div className="md:col-span-7 space-y-4 text-left">
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4.5 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Resumo da Compra</h4>
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-xs text-slate-400 font-sans">Moedas do Pacote:</span>
                  <span className="text-sm font-bold font-mono text-white flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    {selectedTier.coins.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs text-slate-400 font-sans">Valor total a pagar:</span>
                  <span className="text-lg font-black font-mono text-amber-400">
                    R$ {selectedTier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* TABS SELECTOR FOR THREE PIX PROCEDURES */}
              <div id="payment-method-tabs" className="grid grid-cols-3 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
                <button
                  type="button"
                  onClick={() => setActivePaymentTab("cpf")}
                  className={`py-2 px-1 text-center rounded-xl text-[10px] font-extrabold tracking-wide transition-all cursor-pointer ${
                    activePaymentTab === "cpf"
                      ? "bg-red-600 text-white shadow-md shadow-red-950/25"
                      : "text-slate-450 hover:text-white text-slate-400"
                  }`}
                >
                  1. Chave Aleatória
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentTab("copia_cola")}
                  className={`py-2 px-1 text-center rounded-xl text-[10px] font-extrabold tracking-wide transition-all cursor-pointer ${
                    activePaymentTab === "copia_cola"
                      ? "bg-red-600 text-white shadow-md shadow-red-950/25"
                      : "text-slate-450 hover:text-white text-slate-400"
                  }`}
                >
                  2. Copia e Cola
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentTab("qrcode")}
                  className={`py-2 px-1 text-center rounded-xl text-[10px] font-extrabold tracking-wide transition-all cursor-pointer ${
                    activePaymentTab === "qrcode"
                      ? "bg-red-600 text-white shadow-md shadow-red-950/25"
                      : "text-slate-450 hover:text-white text-slate-400"
                  }`}
                >
                  3. QR Code Pix
                </button>
              </div>

              {/* TAB 1: CPF CHAVE (Now mapped to Random Key) */}
              {activePaymentTab === "cpf" && (
                <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-2xl space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block tracking-wider">
                      OPÇÃO 1: Chave Pix Aleatória Destinatária
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="021cff91-b818-4455-9bef-7e76de1816d1"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white font-extrabold tracking-wider text-center focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyCpf}
                        className="p-2 py-2.5 bg-red-650 hover:bg-red-500 border border-red-600 rounded-xl text-white hover:scale-105 active:scale-95 transition-all text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        {copiedCpf ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCpf ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-slate-900/60 pt-3 space-y-1.5 leading-relaxed">
                    <p className="font-extrabold text-slate-300 text-[10.5px] uppercase tracking-wide font-mono flex items-center gap-1">
                      <span>📌</span> Como transferir via Chave Aleatória:
                    </p>
                    <p>1. Copie a Chave Aleatória <strong className="text-white font-mono text-[10px] sm:text-xs">021cff91-b818-4455-9bef-7e76de1816d1</strong> acima.</p>
                    <p>2. Acesse a área Pix em seu aplicativo de banco de escolha.</p>
                    <p>3. Escolha enviar ou pagar Pix e selecione a chave de tipo <strong className="text-white">Aleatória (Chave Aleatória)</strong>.</p>
                    <p>4. Insira o valor exato de <strong className="text-amber-400 font-mono text-xs">R$ {selectedTier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>.</p>
                    <p>5. Confirme que o nome do recebedor é <strong className="text-white font-semibold">Tiago Alves</strong> e envie.</p>
                    <p>6. Após pagar em seu aplicativo, clique no botão vermelho ao lado para validar instantaneamente!</p>
                  </div>
                </div>
              )}

              {/* TAB 2: COPIA E COLA */}
              {activePaymentTab === "copia_cola" && (
                <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-2xl space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block tracking-wider">
                      OPÇÃO 2: Código Pix Copia e Cola
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="00020126560014br.gov.bcb.pix0124ultragrafica@outlook.com0206Moedas5204000053039865802BR5911Tiago Alves6009Sao Paulo62160512ViralTubePro6304A702"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-350 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyCopiaCola}
                        className="p-2 py-2.5 bg-red-650 hover:bg-red-500 border border-red-600 rounded-xl text-white hover:scale-105 active:scale-95 transition-all text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        {copiedCopiaCola ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCopiaCola ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-450 border-t border-slate-900/60 pt-3 space-y-1.5 text-slate-400 leading-relaxed">
                    <p className="font-extrabold text-slate-300 text-[10.5px] uppercase tracking-wide font-mono flex items-center gap-1">
                      <span>🔗</span> Como usar o Copia e Cola:
                    </p>
                    <p>1. Copie o longo código de pagamento acima com o botão.</p>
                    <p>2. Toque em "Pix" em seu banco e selecione <strong className="text-white">Pix Copia e Cola</strong> (ou Pagar Código).</p>
                    <p>3. Cole este código longo, confira o valor de <strong className="text-amber-400 font-mono">R$ {selectedTier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>, e confirme para <strong className="text-white font-semibold">Tiago Alves</strong>.</p>
                    <p>4. Volte aqui e clique no botão de liberação ao lado!</p>
                  </div>
                </div>
              )}

              {/* TAB 3: QR CODE */}
              {activePaymentTab === "qrcode" && (
                <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-2xl space-y-4 animate-fade-in text-center relative overflow-hidden">
                  <div className="mx-auto p-4 bg-white rounded-3xl border border-slate-200 shadow-xl flex items-center justify-center max-w-[200px] w-full aspect-square relative hover:scale-105 duration-300 transition-all overflow-hidden">
                    {/* Glowing vertical laser scan line */}
                    <div className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_8px_#ef4444] z-10 animate-scan-glow pointer-events-none" />
                    
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("00020126560014br.gov.bcb.pix0124ultragrafica@outlook.com0206Moedas5204000053039865802BR5911Tiago Alves6009Sao Paulo62160512ViralTubePro6304A702")}`}
                      alt="Pix QR Code"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                    {/* User-provided profile photo overlay in the exact center of the QR code */}
                    <div className="absolute inset-0 m-auto w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-md bg-slate-100 flex items-center justify-center">
                      <img
                        src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
                        alt="Tiago Alves Avatar"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Copy helper shortcut for high convenience */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleCopyCopiaCola}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95"
                    >
                      {copiedCopiaCola ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                      <span>{copiedCopiaCola ? "Copiado!" : "Copiar Código Copia e Cola"}</span>
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-450 text-slate-400 leading-normal max-w-sm mx-auto text-left border-t border-slate-900/60 pt-3 space-y-1.5">
                    <p className="font-extrabold text-slate-300 text-[10.5px] uppercase tracking-wide font-mono flex items-center gap-1">
                      <span>📸</span> Como escanear o QR Code:
                    </p>
                    <p className="mt-1">Abra o aplicativo financeiro em seu outro dispositivo ou aponte a câmera com a função "Pix QR Code" para esta imagem. Certifique-se de que o beneficiário é <strong className="text-white">Tiago Alves</strong>.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Simulation trigger & logs of validation */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-4">
              <div className="text-center w-full space-y-4 bg-slate-900/10 border border-slate-850 p-5 rounded-2xl">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block mb-1">
                  🔒 Liberação via WhatsApp (Manual)
                </span>

                <div className="text-left space-y-1 bg-slate-950/80 p-3 rounded-xl border border-slate-900">
                  <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nome Completo do Pagador (Pix)
                  </label>
                  <input
                    id="payment-fullname-input"
                    type="text"
                    required
                    placeholder="Digite seu nome completo como aparece no Pix"
                    value={buyerName}
                    onChange={(e) => {
                      setBuyerName(e.target.value);
                      if (e.target.value.trim()) setNameError(null);
                    }}
                    className={`w-full bg-slate-900 border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 placeholder:text-slate-600 font-sans mt-1 ${
                      nameError ? "border-red-500" : "border-slate-800"
                    }`}
                  />
                  {nameError && (
                    <p className="text-red-550 font-semibold text-[10px] mt-1 flex items-center gap-1 animate-pulse">
                      ⚠️ {nameError}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Você escolheu pagar com <strong className="text-white uppercase font-black tracking-wider text-[10px]">{activePaymentTab === "cpf" ? "Chave CPF" : activePaymentTab === "copia_cola" ? "Copia e Cola" : "QR Code"}</strong>.
                  </p>
                  <p className="text-[9.5px] text-slate-450 text-slate-400 leading-relaxed">
                    Clique no botão abaixo para registrar o pedido no servidor. Você será redirecionado para o WhatsApp do administrador do canal <strong>(81) 98533-9119</strong> para enviar o comprovante.
                  </p>
                </div>

                {progressLog.length > 0 && (
                  <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-left space-y-1 max-h-32 overflow-y-auto font-mono text-[8.5px]">
                    {progressLog.map((log, i) => (
                      <p key={i} className={`${log.startsWith("❌") ? "text-red-400" : log.startsWith("✨") || log.startsWith("✓") ? "text-green-400 font-bold" : "text-slate-450 text-slate-400"}`}>
                        {log}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  id="btn-confirm-payment"
                  onClick={startSimulatePayment}
                  disabled={verifyingPayment}
                  className="w-full py-3 bg-gradient-to-r from-red-650 to-red-600 hover:from-white hover:to-white hover:text-slate-950 font-black text-xs text-white rounded-2xl tracking-wider uppercase transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-red-950/20 border border-red-500/20"
                >
                  {verifyingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Registrando Pedido...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>Confirmar Pagamento Realizado ⚡</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "pending_approval" && selectedTier && (
        <div className="py-8 flex flex-col items-center text-center space-y-6 animate-fade-in text-left">
          <div className="relative">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 animate-pulse">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-red-650 text-[9px] font-black uppercase text-white px-1.5 py-0.5 rounded-md border border-slate-900 tracking-wider">
              Pendente
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-black text-white uppercase tracking-wider font-sans">
              Aguardando Liberação Manual pelo Suporte
            </h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
              Seu pedido <strong className="text-slate-300 font-mono font-bold text-[11px]">{pendingPaymentId}</strong> no valor de <strong className="text-amber-400 font-mono">R$ {selectedTier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> foi registrado e está pronto para homologação.
            </p>
          </div>

          {/* Highlights of order */}
          <div className="w-full max-w-sm bg-slate-950 border border-slate-900 p-4 rounded-2xl space-y-3.5 text-left text-xs">
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500">Comprador (Nome):</span>
              <span className="text-white font-bold">{buyerName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500">E-mail Registrado:</span>
              <span className="text-white font-mono">{userEmail}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500">Moedas do Pacote:</span>
              <span className="text-amber-400 font-black flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 animate-pulse" />
                +{selectedTier.coins.toLocaleString()} Moedas
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status de Liberação:</span>
              <span className="text-amber-500 font-black animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                Aguardando PIX no WhatsApp
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
            ✨ Assim que o Administrador <strong>Tiago Alves</strong> confirmar o recebimento do Pix em sua conta bancária, esta tela se atualizará automaticamente e suas moedas aparecerão no topo!
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center max-w-xs">
            <button
              onClick={() => {
                const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                const pMethod = activePaymentTab === "cpf" ? "Chave Aleatória" : activePaymentTab === "copia_cola" ? "Copia e Cola" : "QR Code Pix";
                const whatsappText = `Olá Tiago! Tenho um Pix pendente para adquirir moedas no ViralTubePro. Seguem meus dados para liberação manual:

Nome Completo: ${buyerName}
E-mail da Conta: ${userEmail || "anonimo@cooperado.com"}
Pacote Selecionado: ${selectedTier.name}
Valor de Transferência: R$ ${selectedTier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
Crédito a Receber: +${selectedTier.coins.toLocaleString()} Moedas
Opção de Pagamento: ${pMethod}
Data e Hora: ${nowStr}
ID do Pedido: ${pendingPaymentId}

Fiz a transferência do valor de R$ ${selectedTier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para Tiago Alves, por favor libere minhas moedas!`;

                const whatsappUrl = `https://api.whatsapp.com/send?phone=5581985339119&text=${encodeURIComponent(whatsappText)}`;
                window.open(whatsappUrl, "_blank");
              }}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-black text-[11px] uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-green-950/20"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Enviar Comprovante
            </button>

            <button
              onClick={() => setStep("checkout")}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-[11px] uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-800"
            >
              Voltar e Ajustar
            </button>
          </div>
        </div>
      )}

      {step === "success" && selectedTier && (
        <div className="py-8 flex flex-col items-center text-center space-y-5 animate-fade-in text-left">
          <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-400">
            <CheckCircle className="w-8 h-8 text-green-400 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-black text-white uppercase tracking-wider font-sans">
              Pagamento Confirmado Instantaneamente!
            </h3>
            <p className="text-xs text-slate-350 max-w-sm leading-relaxed">
              Recebemos seu Pix no valor de <strong className="text-amber-400 font-mono">R$ {selectedTier.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> correspondente ao {selectedTier.name}.
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl inline-flex items-center gap-2 shadow-inner">
            <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="text-xs font-mono font-black text-white">
              +{selectedTier.coins.toLocaleString()} Moedas Adicionadas!
            </span>
          </div>

          <button
            onClick={() => setStep("select")}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-250 text-slate-950 hover:bg-white border border-transparent hover:scale-105 active:scale-95 duration-150 text-xs font-black uppercase rounded-2xl shadow transition-all cursor-pointer"
          >
            Adquirir Mais Moedas
          </button>
        </div>
      )}
    </div>
  );
}
