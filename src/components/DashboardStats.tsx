import { motion } from "motion/react";
import { Tv, ThumbsUp, MessageSquare, Users, Bell } from "lucide-react";
import { GlobalStats } from "../types";

interface DashboardStatsProps {
  stats: GlobalStats;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
    >
      {/* Views Card */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-5 relative overflow-hidden group shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all duration-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider uppercase">
            Visualizações
          </span>
          <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
            <Tv className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-sans text-white tracking-tight">
          {stats.totalViewsGenerated.toLocaleString("pt-BR")}
        </h3>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Volume Real de Tráfego
        </p>
      </motion.div>

      {/* Likes Card */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-5 relative overflow-hidden group shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider uppercase">
            Curtidas (Likes)
          </span>
          <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
            <ThumbsUp className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-sans text-white tracking-tight">
          {stats.totalLikesDropped.toLocaleString("pt-BR")}
        </h3>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Engajamento Estático
        </p>
      </motion.div>

      {/* Comments Card */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-5 relative overflow-hidden group shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all duration-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider uppercase">
            Comentários IA
          </span>
          <div className="p-2 bg-green-500/10 rounded-xl text-green-500">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-sans text-white tracking-tight">
          {stats.totalCommentsCreated.toLocaleString("pt-BR")}
        </h3>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Ideias Orgânicas Geradas
        </p>
      </motion.div>

      {/* Subscriptions Card */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-5 relative overflow-hidden group shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider uppercase">
            Inscrições BR
          </span>
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
            <Bell className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-sans text-white tracking-tight">
          {stats.totalSubscriptionsCompleted.toLocaleString("pt-BR")}
        </h3>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Inscritos Orgânicos Ativos
        </p>
      </motion.div>

      {/* Active Users Card */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-5 relative overflow-hidden group shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full blur-2xl group-hover:bg-slate-500/20 transition-all duration-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider uppercase">
            Criadores Ativos
          </span>
          <div className="p-2 bg-slate-800 rounded-xl text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-sans text-white tracking-tight">
          {stats.totalActiveMembers.toLocaleString("pt-BR")}
        </h3>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
          Nível de Comunidade Ativa
        </p>
      </motion.div>
    </motion.div>
  );
}
