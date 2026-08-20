import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  Bot, 
  Send, 
  MessageSquare, 
  Sparkles, 
  ChevronRight, 
  Mail, 
  ShieldCheck, 
  Headphones, 
  Paperclip, 
  X, 
  UserCheck, 
  Loader2,
  ExternalLink,
  MessageCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  limit, 
  getDocs 
} from "firebase/firestore";
import { toast } from "sonner";

interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'admin' | 'system' | 'ai';
  text: string;
  attachmentUrl?: string;
  createdAt: any;
}

interface SupportTicket {
  id: string;
  ticketId?: string;
  ticket_id?: string;
  userId: string;
  userEmail: string;
  username: string;
  subject: string;
  status: 'open' | 'pending' | 'ai_answering' | 'assigned' | 'pending_user' | 'closed';
  assignedAgentId?: string | null;
  createdAt: any;
  lastActivityAt: any;
}

export function TabSupport({
  goBack,
  userData,
}: {
  goBack: () => void;
  userData?: any;
}) {
  const [activeTab, setActiveTab] = useState<'menu' | 'aethro' | 'livechat'>('menu');

  // Contact Config from Firestore
  const [telegramLink, setTelegramLink] = useState("https://t.me/AetherisSupport");
  const [whatsappNumber, setWhatsappNumber] = useState("+18038361167");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'support_config', 'settings'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.telegramLink) setTelegramLink(d.telegramLink);
        if (d.whatsappNumber) setWhatsappNumber(d.whatsappNumber);
      }
    }, (err) => console.warn("Support config snapshot error:", err));
    return () => unsub();
  }, []);

  // Format WhatsApp Link
  const getWhatsappUrl = () => {
    if (!whatsappNumber) return "https://wa.me/18038361167";
    if (whatsappNumber.startsWith("http://") || whatsappNumber.startsWith("https://")) {
      return whatsappNumber;
    }
    const cleanDigits = whatsappNumber.replace(/[^0-9]/g, "");
    return `https://wa.me/${cleanDigits || "18038361167"}`;
  };

  // ================= AETHRO AI CHATBOT STATES =================
  const [aethroMessages, setAethroMessages] = useState<Array<{ sender: 'user' | 'aethro'; text: string }>>([
    {
      sender: 'aethro',
      text: "Hello! I am Aethro AI, your automated wealth intelligence assistant. Ask me anything about our automated trading strategies, account activation, deposits, or withdrawal guidelines."
    }
  ]);
  const [aethroInput, setAethroInput] = useState('');
  const [isAethroLoading, setIsAethroLoading] = useState(false);
  const aethroEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'aethro') {
      aethroEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aethroMessages, activeTab]);

  const handleSendAethro = async (textOverride?: string) => {
    const queryText = textOverride || aethroInput;
    if (!queryText.trim() || isAethroLoading) return;

    if (!textOverride) setAethroInput('');
    setAethroMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    setIsAethroLoading(true);

    try {
      const response = await fetch('/api/support/ask-aethro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText, email: userData?.email })
      });
      const data = await response.json();
      setAethroMessages(prev => [
        ...prev,
        {
          sender: 'aethro',
          text: data.reply || "Aethro AI is currently updating neural modules. Please try again in a few moments."
        }
      ]);
    } catch (err) {
      console.error(err);
      setAethroMessages(prev => [
        ...prev,
        { sender: 'aethro', text: "Network communication latency detected. Please retry your inquiry." }
      ]);
    } finally {
      setIsAethroLoading(false);
    }
  };

  // ================= LIVE CHAT TERMINAL STATES =================
  const [liveChatTicket, setLiveChatTicket] = useState<SupportTicket | null>(null);
  const [liveChatMessages, setLiveChatMessages] = useState<SupportMessage[]>([]);
  const [liveChatInput, setLiveChatInput] = useState('');
  const [isLiveChatLoading, setIsLiveChatLoading] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'livechat') {
      liveChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveChatMessages, activeTab]);

  // Sync Live Chat messages from Firestore in real-time
  useEffect(() => {
    if (!userData?.uid || activeTab !== 'livechat' || !liveChatTicket) return;

    const q = query(
      collection(db, 'support_messages'),
      where('ticketId', '==', liveChatTicket.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: SupportMessage[] = [];
      snapshot.forEach(docSnap => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as SupportMessage);
      });
      setLiveChatMessages(msgs);
    }, (err) => console.warn("LiveChatMessages snapshot error:", err));

    return () => unsubscribe();
  }, [userData?.uid, activeTab, liveChatTicket]);

  // Load or Create active Live Chat Ticket
  const loadOrCreateLiveChatTicket = async () => {
    if (!userData?.uid) return;
    setIsLiveChatLoading(true);

    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('userId', '==', userData.uid),
        where('status', 'in', ['open', 'assigned', 'ai_answering', 'pending_user', 'pending']),
        limit(1)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const ticketDoc = snap.docs[0];
        setLiveChatTicket({ id: ticketDoc.id, ...ticketDoc.data() } as SupportTicket);
      } else {
        const numericTicketId = Math.floor(10000000 + Math.random() * 90000000).toString();
        const ticketData = {
          ticketId: numericTicketId,
          ticket_id: numericTicketId,
          userId: userData.uid,
          userEmail: userData.email || 'investor@aetheris.online',
          username: userData.displayName || userData.username || 'Aetheris Investor',
          subject: 'Live Support Inquiry',
          status: 'ai_answering',
          assignedAgentId: null,
          createdAt: serverTimestamp(),
          lastActivityAt: serverTimestamp()
        };

        await setDoc(doc(db, 'support_tickets', numericTicketId), ticketData);
        setLiveChatTicket({ id: numericTicketId, ...ticketData } as any);

        await addDoc(collection(db, 'support_messages'), {
          ticketId: numericTicketId,
          senderId: 'system_ai',
          senderType: 'ai',
          text: "Welcome to Live Chat. I am Aethro AI, monitoring your session. Type your question below, or tap 'Speak to Human Agent' to queue for a technical officer.",
          createdAt: serverTimestamp()
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Unable to initialize support session.");
    } finally {
      setIsLiveChatLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'livechat' && userData?.uid && !liveChatTicket) {
      loadOrCreateLiveChatTicket();
    }
  }, [activeTab, userData?.uid]);

  // Send message in Live Chat
  const handleSendLiveChatMessage = async () => {
    if ((!liveChatInput.trim() && !attachment) || !liveChatTicket || isLiveChatLoading) return;

    const textToSend = liveChatInput;
    const currentAttachment = attachment;

    setLiveChatInput('');
    setAttachment(null);

    try {
      await addDoc(collection(db, 'support_messages'), {
        ticketId: liveChatTicket.id,
        senderId: userData?.uid || 'user',
        senderType: 'user',
        text: textToSend,
        attachmentUrl: currentAttachment || null,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'support_tickets', liveChatTicket.id), {
        lastActivityAt: serverTimestamp()
      });

      // Trigger AI assistant response if ticket status is ai_answering
      if (liveChatTicket.status === 'ai_answering') {
        fetch('/api/support/live-chat-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: liveChatTicket.id,
            message: textToSend,
            email: userData?.email
          })
        });
      }
    } catch (e: any) {
      toast.error("Failed to send message.");
    }
  };

  // Escalate ticket to Human Technical Agent
  const handleEscalateToHuman = async () => {
    if (!liveChatTicket) return;
    try {
      await updateDoc(doc(db, 'support_tickets', liveChatTicket.id), {
        status: 'open',
        assignedAgentId: null,
        lastActivityAt: serverTimestamp()
      });

      setLiveChatTicket(prev => prev ? { ...prev, status: 'open' } : null);

      await addDoc(collection(db, 'support_messages'), {
        ticketId: liveChatTicket.id,
        senderId: 'system',
        senderType: 'admin',
        text: "🔄 Request transferred. Your chat has been placed in priority queue for a human technical officer. Replies will appear here in real-time and dispatch to your email.",
        createdAt: serverTimestamp()
      });

      toast.success("Queued for live human agent.");
    } catch (e: any) {
      toast.error("Failed to update status.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ================= RENDER: AETHRO AI CHATBOT VIEW =================
  if (activeTab === 'aethro') {
    return (
      <div className="p-4 flex flex-col animate-in fade-in duration-200 pb-28 max-w-2xl mx-auto w-full font-sans">
        {/* Unified WhatsApp-Style Messaging Window */}
        <div className="h-[calc(100vh-220px)] min-h-[500px] max-h-[720px] bg-[#070b13] border border-[#182344] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Header Bar */}
          <div className="shrink-0 flex items-center justify-between bg-[#0c142b] border-b border-[#182344] p-3">
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors text-foreground flex items-center gap-1"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs font-bold text-slate-300">Channels</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Aethro AI Chatbot
                  <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                </h2>
                <p className="text-[10px] text-emerald-400 font-mono">Aethro Neural Core Active</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('livechat')}
              className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
            >
              Human Desk
            </button>
          </div>

          {/* Scrollable Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {aethroMessages.map((msg, index) => (
              <React.Fragment key={index}>
                <div
                  className={`flex items-start gap-2.5 max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {msg.sender === 'aethro' ? (
                    <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-400">You</span>
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-primary text-white font-medium rounded-tr-none shadow-md'
                        : 'bg-[#0c142b] border border-[#182344] text-slate-200 rounded-tl-none shadow'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Interactive prompt options inside the chat right after initial welcome message */}
                {index === 0 && (
                  <div className="ml-9 my-1 flex flex-col gap-1.5 max-w-[90%] animate-in fade-in duration-300">
                    <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase tracking-wider">Suggested Inquiries:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "How do automated deposits work?",
                        "Explain trading plan yields",
                        "How to withdraw profit?",
                        "Account security rules"
                      ].map((promptText, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendAethro(promptText)}
                          className="px-3 py-1.5 rounded-xl bg-[#0c142b] border border-[#182344] hover:border-primary/50 text-slate-300 hover:text-white text-[11px] transition-all text-left flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{promptText}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            {isAethroLoading && (
              <div className="flex items-center gap-2.5 mr-auto animate-in fade-in duration-200">
                <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-[#0c142b] border border-[#182344] px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-md flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium font-mono">Aethro AI is typing</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.32s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.16s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={aethroEndRef} />
          </div>

          {/* Fixed Chat Input Bar pinned at bottom */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAethro();
            }}
            className="shrink-0 flex items-center gap-2 bg-[#0c142b] border-t border-[#182344] p-2.5"
          >
            <input
              type="text"
              value={aethroInput}
              onChange={(e) => setAethroInput(e.target.value)}
              placeholder="Ask Aethro AI anything..."
              className="flex-1 bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none px-3"
            />
            <Button
              type="submit"
              disabled={!aethroInput.trim() || isAethroLoading}
              size="sm"
              className="rounded-xl px-4 bg-primary hover:bg-primary/90 text-white font-bold h-9 shrink-0"
            >
              {isAethroLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ================= RENDER: LIVE CHAT TERMINAL VIEW =================
  if (activeTab === 'livechat') {
    return (
      <div className="p-4 flex flex-col animate-in fade-in duration-200 pb-28 max-w-2xl mx-auto w-full font-sans">
        {/* Unified WhatsApp-Style Live Chat Window */}
        <div className="h-[calc(100vh-220px)] min-h-[500px] max-h-[720px] bg-[#070b13] border border-[#182344] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Header Bar */}
          <div className="shrink-0 flex items-center justify-between bg-[#0c142b] border-b border-[#182344] p-3">
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors text-foreground flex items-center gap-1"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs font-bold text-slate-300">Channels</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-white truncate">
                  Live Chat Terminal
                </h2>
                {liveChatTicket && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    Ticket #{liveChatTicket.ticketId || liveChatTicket.id}
                  </p>
                )}
              </div>
            </div>

            {liveChatTicket?.status === 'ai_answering' ? (
              <button
                type="button"
                onClick={handleEscalateToHuman}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold hover:bg-amber-500/30 transition-colors flex items-center gap-1"
              >
                <UserCheck className="w-3 h-3" />
                Speak to Human
              </button>
            ) : (
              <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
                HUMAN QUEUE
              </div>
            )}
          </div>

          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {liveChatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full my-auto py-12 text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-xs">Initializing secure support channel...</p>
              </div>
            ) : (
              liveChatMessages.map((msg) => {
                const isUser = msg.senderType === 'user';
                const isAi = msg.senderType === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 max-w-[85%] ${
                      isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <span className="text-[9px] text-slate-400 font-mono px-1">
                      {isUser ? 'You' : isAi ? 'Aethro AI' : 'Technical Officer'}
                    </span>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-primary text-white rounded-tr-none shadow-md'
                          : isAi
                          ? 'bg-[#0c142b] border border-primary/30 text-slate-200 rounded-tl-none shadow'
                          : 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-100 rounded-tl-none shadow'
                      }`}
                    >
                      {msg.attachmentUrl && (
                        <img
                          src={msg.attachmentUrl}
                          alt="Attachment"
                          className="max-w-full rounded-lg mb-2 max-h-40 object-cover border border-white/10"
                        />
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={liveChatEndRef} />
          </div>

          {/* Attachment Preview (if attached) */}
          {attachment && (
            <div className="shrink-0 relative inline-block self-start mx-4 my-1 bg-[#0c142b] border border-[#182344] p-2 rounded-xl">
              <img src={attachment} alt="Upload preview" className="w-16 h-16 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Fixed Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendLiveChatMessage();
            }}
            className="shrink-0 flex items-center gap-2 bg-[#0c142b] border-t border-[#182344] p-2.5"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={liveChatInput}
              onChange={(e) => setLiveChatInput(e.target.value)}
              placeholder="Type your message to support..."
              className="flex-1 bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none px-2"
            />

            <Button
              type="submit"
              disabled={(!liveChatInput.trim() && !attachment) || isLiveChatLoading}
              size="sm"
              className="rounded-xl px-4 bg-primary hover:bg-primary/90 text-white font-bold h-9 shrink-0"
            >
              {isLiveChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ================= RENDER: MAIN SUPPORT MENU VIEW =================
  return (
    <div className="p-5 flex flex-col gap-6 animate-in slide-in-from-right duration-300 pb-28 max-w-2xl mx-auto w-full font-sans">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          onClick={goBack}
          className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 tracking-tight">
          <Headphones className="w-5 h-5 text-primary shrink-0" />
          Support & Help
        </h2>
        <div className="w-6" />
      </div>

      {/* Main Banner Card (No Aetheris logo as requested) */}
      <Card className="bg-[#0c142b] border border-[#182344] rounded-3xl p-6 relative overflow-hidden shadow-2xl text-center">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            HUMAN / AI ACTIVE MONITORING
          </div>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed font-medium">
            Intelligent Wealth support protocols. Select a channel below to communicate directly with our automated AI or dedicated live technical officers.
          </p>
        </div>
      </Card>

      {/* Support Channels List */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
          Select Support Channel
        </h3>

        {/* Channel 1: Aethro AI Chatbot */}
        <button
          type="button"
          onClick={() => setActiveTab('aethro')}
          className="w-full p-4 rounded-2xl bg-[#0c142b] hover:bg-[#111c3a] border border-[#182344] hover:border-primary/40 transition-all flex items-center justify-between text-left group shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                AETHRO AI CHATBOT
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Interactive AI assistant for instant answers
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        {/* Channel 2: Telegram Support */}
        <button
          type="button"
          onClick={() => window.open(telegramLink, '_blank')}
          className="w-full p-4 rounded-2xl bg-[#0c142b] hover:bg-[#111c3a] border border-[#182344] hover:border-blue-500/40 transition-all flex items-center justify-between text-left group shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                TELEGRAM CHAT SUPPORT
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct message with technical admin
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        {/* Channel 3: WhatsApp Support */}
        <button
          type="button"
          onClick={() => window.open(getWhatsappUrl(), '_blank')}
          className="w-full p-4 rounded-2xl bg-[#0c142b] hover:bg-[#111c3a] border border-[#182344] hover:border-emerald-500/40 transition-all flex items-center justify-between text-left group shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                WHATSAPP CHAT SUPPORT
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Encrypted direct chat with support agent
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        {/* Channel 4: Live Chat Terminal */}
        <button
          type="button"
          onClick={() => setActiveTab('livechat')}
          className="w-full p-4 rounded-2xl bg-[#0c142b] hover:bg-[#111c3a] border border-[#182344] hover:border-emerald-500/40 transition-all flex items-center justify-between text-left group shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                LIVE CHAT TERMINAL
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live human agents & support ticket queue
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>
      </div>

      {/* Official Email Contact Footer */}
      <div className="p-4 rounded-2xl bg-[#070b13] border border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Official Email Dispatch</p>
            <a
              href="mailto:support@update.aetheriss.online"
              className="text-xs text-primary font-mono truncate hover:underline block font-semibold"
            >
              support@update.aetheriss.online
            </a>
          </div>
        </div>
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
      </div>
    </div>
  );
}
