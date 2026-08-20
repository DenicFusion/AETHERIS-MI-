import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  getDocs,
  limit,
  serverTimestamp, 
  setDoc 
} from 'firebase/firestore';
import { 
  HelpCircle, 
  X, 
  MessageSquare, 
  Send, 
  Paperclip, 
  ChevronRight, 
  Bot, 
  User, 
  ArrowLeft, 
  SendHorizonal, 
  PhoneCall, 
  AlertCircle,
  Clock,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';

// Define TS Types internally for maximum modular file safety
interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  username: string;
  subject: string;
  status: 'open' | 'assigned' | 'ai_answering' | 'pending_user' | 'closed';
  assignedAgentId: string | null;
  lastActivityAt: any;
  createdAt: any;
  unreadCount?: number;
}

interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'ai' | 'admin';
  text: string;
  attachmentUrl?: string;
  createdAt: any;
}

export function SupportHub() {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'menu' | 'aethro' | 'telegram' | 'livechat'>('menu');
  
  // Ask Aethro Local Stream
  const [aethroMessages, setAethroMessages] = useState<Array<{sender: 'user' | 'aethro', text: string}>>([
    { sender: 'aethro', text: "Welcome to Aetheris Intelligence Hub. I am Aethro. How may I assist you with plan explanations, active trading cycles, or deposit/withdrawal instructions today?" }
  ]);
  const [aethroInput, setAethroInput] = useState('');
  const [isAethroLoading, setIsAethroLoading] = useState(false);
  
  // Telegram Departments
  const [telegramDept, setTelegramDept] = useState('');
  const [telegramRouterBase, setTelegramRouterBase] = useState('');
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'support_config', 'settings'), (snap) => {
      if (snap.exists()) {
        setTelegramRouterBase(snap.data().telegramLink || "https://t.me/AetherisSupport");
      }
    }, (err) => console.warn("Support config snapshot error:", err));

    const handleOpen = (e: Event) => {
      if (window.location.pathname.includes('/dashboard')) {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'support');
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        window.location.href = '/dashboard?tab=support';
      }
    };
    const handleClose = () => setIsOpen(false);
    const handleToggle = () => setIsOpen(prev => !prev);

    window.addEventListener('open-support-hub', handleOpen as EventListener);
    window.addEventListener('close-support-hub', handleClose);
    window.addEventListener('toggle-support-hub', handleToggle);

    return () => {
      unsub();
      window.removeEventListener('open-support-hub', handleOpen as EventListener);
      window.removeEventListener('close-support-hub', handleClose);
      window.removeEventListener('toggle-support-hub', handleToggle);
    };
  }, []);

  const telegramLinks: Record<string, string> = {
    billing: telegramRouterBase,
    verification: telegramRouterBase,
    technical: telegramRouterBase,
    trading: telegramRouterBase,
    master: telegramRouterBase
  };

  // Live Chat States
  const [liveChatTicket, setLiveChatTicket] = useState<SupportTicket | null>(null);
  const [liveChatMessages, setLiveChatMessages] = useState<SupportMessage[]>([]);
  const [liveChatInput, setLiveChatInput] = useState('');
  const [isLiveChatLoading, setIsLiveChatLoading] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isLiveChatActive, setIsLiveChatActive] = useState(false);

  // References
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aethroMessages, liveChatMessages, activeTab]);

  // Sync Live Chat messages in real-time
  useEffect(() => {
    if (!user || activeTab !== 'livechat' || !liveChatTicket) return;

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
    }, (err) => console.warn("Support messages snapshot error:", err));

    return () => unsubscribe();
  }, [user, activeTab, liveChatTicket]);

  // Check if active ticket already exists for Live Chat
  const loadOrCreateLiveChatTicket = async () => {
    if (!user) return;
    setIsLiveChatLoading(true);

    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('userId', '==', user.uid),
        where('status', 'in', ['open', 'assigned', 'ai_answering', 'pending_user']),
        limit(1)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const ticketDoc = snap.docs[0];
        setLiveChatTicket({ id: ticketDoc.id, ...ticketDoc.data() } as SupportTicket);
      } else {
        // Create new active ticket with cool 8-digit numeric Ticket ID
        const numericTicketId = Math.floor(10000000 + Math.random() * 90000000).toString();
        const ticketData = {
          ticketId: numericTicketId,
          ticket_id: numericTicketId,
          userId: user.uid,
          userEmail: user.email || 'guest@aetheris.com',
          username: user.displayName || user.username || 'Aetheris Investor',
          subject: 'Live Terminal Assistance Inquiry',
          status: 'ai_answering', // starts with AI tier
          assignedAgentId: null,
          createdAt: serverTimestamp(),
          lastActivityAt: serverTimestamp()
        };

        await setDoc(doc(db, 'support_tickets', numericTicketId), ticketData);
        setLiveChatTicket({ id: numericTicketId, ...ticketData } as any);
        
        // Add initial system message welcoming user
        await addDoc(collection(db, 'support_messages'), {
          ticketId: numericTicketId,
          senderId: 'system_ai',
          senderType: 'ai',
          text: "Terminal Live support session initiated. I am the Aetheris automated AI responder. Ask me anything, or tap 'Speak to Human Agent' at any time to transfer live.",
          createdAt: serverTimestamp()
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to connect with live chat database pool.");
    } finally {
      setIsLiveChatLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'livechat' && user && !liveChatTicket) {
      loadOrCreateLiveChatTicket();
    }
  }, [activeTab, user]);

  // Send Ask Aethro Message
  const handleSendAethro = async () => {
    if (!aethroInput.trim() || isAethroLoading) return;
    const userMsg = aethroInput;
    setAethroInput('');
    setAethroMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsAethroLoading(true);

    try {
      const response = await fetch('/api/support/ask-aethro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, email: user?.email })
      });
      const data = await response.json();
      setAethroMessages(prev => [...prev, { sender: 'aethro', text: data.reply || "Aethro is temporarily optimizing its network. Please retry in a few moments." }]);
    } catch (err) {
      console.error(err);
      setAethroMessages(prev => [...prev, { sender: 'aethro', text: "Error communicating with AI neural core. Please try again." }]);
    } finally {
      setIsAethroLoading(false);
    }
  };

  // Live Chat Message submission
  const handleSendLiveChatMessage = async () => {
    if ((!liveChatInput.trim() && !attachment) || !liveChatTicket || isLiveChatLoading) return;
    
    const textToSend = liveChatInput;
    const currentAttachment = attachment;
    
    setLiveChatInput('');
    setAttachment(null);

    try {
      // 1. Add user message to DB
      await addDoc(collection(db, 'support_messages'), {
        ticketId: liveChatTicket.id,
        senderId: user?.uid || 'guest',
        senderType: 'user',
        text: textToSend,
        attachmentUrl: currentAttachment || null,
        createdAt: serverTimestamp()
      });

      // Update last activity on ticket
      await updateDoc(doc(db, 'support_tickets', liveChatTicket.id), {
        lastActivityAt: serverTimestamp()
      });

      // 2. If ticket is still handled by AI responder, trigger server proxy endpoint
      if (liveChatTicket.status === 'ai_answering' || liveChatTicket.status === 'open') {
        fetch('/api/support/live-chat-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: liveChatTicket.id,
            message: textToSend,
            email: user?.email
          })
        });
      }
    } catch (e: any) {
      toast.error("Message delivery failure.");
    }
  };

  // Escalation: Speak with Human Agent
  const handleEscalateToHuman = async () => {
    if (!liveChatTicket) return;
    try {
      await updateDoc(doc(db, 'support_tickets', liveChatTicket.id), {
        status: 'open', // sets to open waiting for human agent assignment
        assignedAgentId: null,
        lastActivityAt: serverTimestamp()
      });

      // Inject system message indicating transfer
      await addDoc(collection(db, 'support_messages'), {
        ticketId: liveChatTicket.id,
        senderId: 'system',
        senderType: 'admin',
        text: "🔄 Session redirected. Your connection has been queued for a human technical officer. They will reply directly here or email support@update.aetheriss.online.",
        createdAt: serverTimestamp()
      });

      // Re-fetch ticket details locally
      setLiveChatTicket(prev => prev ? { ...prev, status: 'open' } : null);
      toast.success("Redirecting session to live quantitative technical officers.");
    } catch (e: any) {
      toast.error("Escalation sequence failed.");
    }
  };

  // Dummy file converter for mock base64 storage
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
        toast.success("Attachment queued successfully.");
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Support Hub Modal Frame */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed top-16 right-3 sm:top-20 sm:right-6 md:right-8 w-[92vw] max-w-[380px] h-[520px] md:h-[550px] bg-[#0c0e17]/95 border border-white/10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-[10004] backdrop-blur-2xl text-white font-sans"
          >
            {/* Header branding lockup */}
            <div className="p-4 bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-white/5 flex items-center gap-3">
              {activeTab !== 'menu' && (
                <button 
                  onClick={() => {
                    setActiveTab('menu');
                    setAttachment(null);
                  }}
                  className="p-1 max-h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-300" />
                </button>
              )}
              <div className="flex-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#f5f5f7]">
                  {activeTab === 'menu' && "Aetheris Support Hub"}
                  {activeTab === 'aethro' && "Ask Aethro Portal"}
                  {activeTab === 'telegram' && "Telegram Dispatch"}
                  {activeTab === 'livechat' && "Live Chat Terminal"}
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>AI Arbitrage Active Monitoring</span>
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-300" />
              </button>
            </div>

            {/* TAB VIEWS INJECTOR */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              
              {/* VIEW 1: MASTER MENU */}
              {activeTab === 'menu' && (
                <div className="space-y-4 my-auto">
                  <div className="text-center pb-2 flex flex-col items-center">
                    <Logo className="h-10 mx-auto opacity-90" />
                    <p className="text-xs text-muted-foreground mt-4 max-w-[280px] mx-auto">
                      Intelligent Wealth support protocols. Select a channel to route your request.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1: Ask Aethro */}
                    <button 
                      onClick={() => setActiveTab('aethro')}
                      className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20 border border-primary/20 hover:border-primary/40 transition-all flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                          <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            Ask Aethro Core
                            <Sparkles className="w-3 h-3 text-amber-400" />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px]">Plan operations & systematic execution queries</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Option 2: Telegram Support */}
                    <button 
                      onClick={() => setActiveTab('telegram')}
                      className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                          <ExternalLink className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground uppercase tracking-wider">Telegram Chat Support</div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px]">Assigned department routing loops</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Option 3: Live Chat Support */}
                    <button 
                      onClick={() => setActiveTab('livechat')}
                      className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <MessageSquare className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            Live Chat Terminal
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px]">Live agents and automated assist queue</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <div className="pt-2 text-center text-[10px] text-zinc-500 font-mono">
                    Official Support Email:<br/>
                    <a href="mailto:support@update.aetheriss.online" className="text-primary hover:underline">support@update.aetheriss.online</a>
                  </div>
                </div>
              )}

              {/* VIEW 2: ASK AETHRO CHAT */}
              {activeTab === 'aethro' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <div className="flex-grow overflow-y-auto space-y-3 pb-3 pr-1">
                    {aethroMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'aethro' && (
                          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center self-start">
                            <Bot className="w-3.5 h-3.5 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                          msg.sender === 'user' 
                            ? 'bg-primary text-white rounded-tr-sm' 
                            : 'bg-white/5 border border-white/10 text-zinc-200 rounded-tl-sm'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isAethroLoading && (
                      <div className="flex gap-2 justify-start items-center">
                        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl rounded-tl-none flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.32s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.16s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="pt-3 border-t border-white/5 flex gap-2">
                    <input 
                      type="text" 
                      value={aethroInput}
                      onChange={(e) => setAethroInput(e.target.value)}
                      placeholder="Ask about AI plans or cycles..."
                      onKeyDown={(e) => e.key === 'Enter' && handleSendAethro()}
                      disabled={isAethroLoading}
                      className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                    />
                    <button 
                      onClick={handleSendAethro}
                      disabled={isAethroLoading || !aethroInput.trim()}
                      className="p-2 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 3: TELEGRAM ROUTER */}
              {activeTab === 'telegram' && (
                <div className="space-y-4 my-auto">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                      <ExternalLink className="w-6 h-6 text-blue-400" />
                    </div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-white">Select Department Destination</h4>
                    <p className="text-[10px] text-zinc-400 mt-2 max-w-[280px] mx-auto leading-relaxed">
                      Your connection loop will target direct quantitative operators assigned to your topic.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'billing', name: "Billing & Funding Operations", desc: "For deposits, withdrawals, and ledger balances" },
                      { id: 'verification', name: "Verification & KYC Audit", desc: "For secure account approvals and onboarding" },
                      { id: 'technical', name: "Technical System Support", desc: "For app errors, access issues, and PWA installs" },
                      { id: 'trading', name: "Quantitative Trading Desk", desc: "For AI engine cycles and algorithmic explanation" }
                    ].map(dept => (
                      <a 
                        key={dept.id}
                        href={telegramLinks[dept.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 text-left bg-white/5 border border-white/5 rounded-xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all block group"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[11px] text-[#f5f5f7] tracking-wider uppercase">{dept.name}</span>
                          <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <p className="text-[9px] text-zinc-500 mt-0.5">{dept.desc}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 4: LIVE CHAT TERMINAL */}
              {activeTab === 'livechat' && (
                <div className="flex-grow flex flex-col h-full overflow-hidden">
                  {/* Status Indicator */}
                  {liveChatTicket && (
                    <div className="px-3 py-1.5 bg-black/25 text-[10px] text-zinc-400 border border-white/5 rounded-xl flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        <span>Ticket Status:</span>
                      </span>
                      <span className="font-bold uppercase font-mono tracking-wider text-green-400">
                        {liveChatTicket.status === 'ai_answering' && "🤖 AI Intercept"}
                        {liveChatTicket.status === 'open' && "⏳ Human Queue"}
                        {liveChatTicket.status === 'assigned' && "👨‍💻 Technical Team Active"}
                        {liveChatTicket.status === 'pending_user' && "💬 Response Due"}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto space-y-3 pb-3 pr-1">
                    {liveChatMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-2 ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.senderType !== 'user' && (
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center self-start">
                            {msg.senderType === 'ai' ? <Bot className="w-3 h-3 text-pink-400" /> : <User className="w-3 h-3 text-blue-400" />}
                          </div>
                        )}
                        <div className="max-w-[80%] space-y-1">
                          <div className={`rounded-2xl p-3 text-xs leading-relaxed ${
                            msg.senderType === 'user' 
                              ? 'bg-[#1e3a8a] text-white rounded-tr-sm' 
                              : msg.senderType === 'ai'
                                ? 'bg-black/40 border border-pink-500/20 text-zinc-200 rounded-tl-sm'
                                : 'bg-[#1e1e2d] border border-[#ff4f00]/20 text-zinc-200 rounded-tl-sm'
                          }`}>
                            {msg.text}
                            {msg.attachmentUrl && (
                              <div className="mt-2 text-[10px] bg-black/40 p-1.5 rounded-lg border border-white/5">
                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 font-mono uppercase tracking-wider font-semibold">
                                  <Paperclip className="w-3 h-3 text-zinc-300" /> View Attachment
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Speak with Human Action Button */}
                  {liveChatTicket && liveChatTicket.status === 'ai_answering' && (
                    <div className="py-2 text-center">
                      <button 
                        onClick={handleEscalateToHuman}
                        className="inline-flex items-center gap-1.5 text-[10px] bg-[#3b82f6]/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-[0_4px_15px_rgba(59,130,246,0.15)] block mx-auto text-center font-mono"
                      >
                        <PhoneCall className="w-3 h-3" /> Speak To Human Agent
                      </button>
                    </div>
                  )}

                  {/* Inline attachment file preview */}
                  {attachment && (
                    <div className="p-2 border border-white/5 bg-black/30 rounded-xl mb-2 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#3b82f6] truncate max-w-[200px]">📎 Queued base64 upload</span>
                      <button onClick={() => setAttachment(null)} className="text-red-400 font-bold uppercase tracking-wider text-[8px]">Cancel</button>
                    </div>
                  )}

                  <div className="pt-3 border-t border-white/5">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 flex items-center justify-center"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <input 
                        type="text" 
                        value={liveChatInput}
                        onChange={(e) => setLiveChatInput(e.target.value)}
                        placeholder="Write support inquiry..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSendLiveChatMessage()}
                        className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                      />
                      <button 
                        onClick={handleSendLiveChatMessage}
                        disabled={!liveChatInput.trim() && !attachment}
                        className="p-2 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        <SendHorizonal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
