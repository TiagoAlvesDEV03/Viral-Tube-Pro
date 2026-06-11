import React, { useState, useEffect, useRef } from "react";
import { Send, Users, Sparkles, MessageSquare } from "lucide-react";
import { ChatMessage } from "../types";

interface LiveChatProps {
  userEmail: string;
}

export default function LiveChat({ userEmail }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const fetchChat = async () => {
    try {
      const res = await fetch("/api/chat");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data && data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.warn("Could not retrieve live community chat yet (server may be booting/updating):", err);
    }
  };

  useEffect(() => {
    fetchChat();
    // Poll chat messages every 4 seconds to view live Brazilian builder exchange active
    const interval = setInterval(fetchChat, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const senderNickname = userEmail.split("@")[0] || "Criador_BR";
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: senderNickname, text }),
      });
      const data = await res.json();
      if (data.success) {
        setText("");
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error("Failed to post message", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col h-[520px] shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/45 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h3 className="font-sans font-semibold text-sm text-slate-100 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-red-500" />
            Comunidade de Troca BR
          </h3>
        </div>
        <div className="text-[11px] font-mono text-slate-400 px-2 py-0.5 bg-slate-800 rounded-md flex items-center gap-1">
          <Users className="w-3 h-3 text-red-400" />
          <span>Chat Ao Vivo</span>
        </div>
      </div>

      {/* Info Notice about organic YouTube mechanics */}
      <div className="bg-gradient-to-r from-red-950/20 to-slate-950/40 p-2.5 px-3 border-b border-slate-800/80 text-[10px] text-red-300 flex items-start gap-2 leading-relaxed">
        <Sparkles className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
        <p>
          <strong>Dica do Algoritmo:</strong> Para obter as melhores visualizações, peça para as pessoas engajarem nos primeiros 30 segundos! Troque dicas com o chat abaixo.
        </p>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-950/15">
        {messages.map((msg, index) => {
          const isMe = msg.sender === (userEmail.split("@")[0] || "Criador_BR");
          return (
            <div
              key={index}
              className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`text-[11px] font-mono font-bold ${
                    isMe ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {msg.sender}
                </span>
                <span className="text-[9px] text-slate-500">{msg.time}</span>
              </div>
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed shadow ${
                  isMe
                    ? "bg-red-650/90 bg-red-600 text-white rounded-tr-none"
                    : "bg-slate-850 bg-slate-800 text-slate-100 border border-slate-700/50 rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/45 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={150}
          placeholder="Tire dúvidas ou divulgue seu nicho..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="p-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white rounded-xl transition-all duration-200 cursor-pointer shadow-md shadow-red-950/10"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
