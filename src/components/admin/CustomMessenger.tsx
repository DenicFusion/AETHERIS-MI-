import React, { useState, useMemo } from "react";
import { 
  Mail, 
  Users, 
  Send, 
  Search, 
  Check, 
  Info, 
  CheckSquare, 
  Square,
  Sparkles,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface UserItem {
  id: string;
  email?: string;
  username?: string;
  role?: string;
  avatar_url?: string;
  wallet_balance?: number;
  balance?: number;
}

interface CustomMessengerProps {
  users: UserItem[];
}

export default function CustomMessenger({ users }: CustomMessengerProps) {
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("selected");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchText, setUserSearchText] = useState("");
  
  const [subject, setSubject] = useState("");
  const [senderName, setSenderName] = useState("Aetheris Support Team");
  const [messageBody, setMessageBody] = useState(
    "Hello {{username}},\n\nWe are pleased to inform you that "
  );
  const [isSending, setIsSending] = useState(false);

  // Filter out any admins and non-email users
  const eligibleUsers = useMemo(() => {
    return users.filter(user => user.role !== "admin" && user.email);
  }, [users]);

  // Filtered users for selection list
  const filteredUsers = useMemo(() => {
    if (!userSearchText.trim()) return eligibleUsers;
    const lower = userSearchText.toLowerCase();
    return eligibleUsers.filter(
      u => 
        (u.username || "").toLowerCase().includes(lower) || 
        (u.email || "").toLowerCase().includes(lower)
    );
  }, [eligibleUsers, userSearchText]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const unfilteredList = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => {
      const merged = new Set([...prev, ...unfilteredList]);
      return Array.from(merged);
    });
    toast.success(`Selected all ${unfilteredList.length} filtered users`);
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredUsers.map(u => u.id));
    setSelectedUserIds(prev => prev.filter(id => !filteredIds.has(id)));
    toast.info("Deselected filtered users");
  };

  const handleSendCustomEmails = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    if (!senderName.trim()) {
      toast.error("Sender name configuration is required.");
      return;
    }
    if (!messageBody.trim()) {
      toast.error("Message body content is required.");
      return;
    }

    const recipients = recipientMode === "all" ? ["all"] : selectedUserIds;

    if (recipientMode === "selected" && recipients.length === 0) {
      toast.error("Please select at least one recipient user.");
      return;
    }

    setIsSending(true);
    const toastId = toast.loading("Connecting to transactional gateway & sending...");

    try {
      const response = await fetch("/api/admin/send-custom-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients,
          subject,
          senderName,
          messageBody,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to dispatch custom messages");
      }

      toast.success(result.message || "Emails successfully delivered!", { id: toastId });
      // Reset form variables
      setSubject("");
      if (recipientMode === "selected") {
        setSelectedUserIds([]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Internal gateway error dispatching mail.", { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
      {/* Configuration & Editor */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-[#12131a] border border-[#222431] rounded-2xl p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
              <Mail className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Custom Email Dispatch</h2>
              <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Configure, target, and verify customized email alerts</p>
            </div>
          </div>

          <form onSubmit={handleSendCustomEmails} className="space-y-5">
            {/* Sender Name Configuration */}
            <div>
              <label className="block text-slate-300 text-xs uppercase font-black tracking-widest mb-2 flex items-center justify-between">
                <span>Sender Name Configuration</span>
                <span className="text-slate-500 font-bold tracking-normal uppercase text-[9px] italic">Appears as &lt;Sender Name&gt;</span>
              </label>
              <input
                type="text"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="e.g. Aetheris Wealth Alert"
                required
                className="w-full bg-[#181922] border border-[#2c2f42] focus:border-primary/50 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 font-medium"
              />
            </div>

            {/* Custom Subject Line */}
            <div>
              <label className="block text-slate-300 text-xs uppercase font-black tracking-widest mb-2 flex items-center justify-between">
                <span>Custom Email Subject</span>
                <span className="text-[#a855f7] font-extrabold tracking-normal text-[10px] flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" /> Dynamic Title supported
                </span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Exclusive Portfolio Update for {{username}}"
                required
                className="w-full bg-[#181922] border border-[#2c2f42] focus:border-primary/50 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 font-medium"
              />
            </div>

            {/* Message Body Content */}
            <div>
              <label className="block text-slate-300 text-xs uppercase font-black tracking-widest mb-2 flex items-center justify-between">
                <span>Personalized Message Body (HTML/Text)</span>
                <span className="text-emerald-400 font-bold tracking-normal uppercase text-[9px]">Custom variables allowed</span>
              </label>
              <textarea
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                rows={10}
                placeholder="Hello {{username}},\n\nYour portfolio update is ready..."
                required
                className="w-full bg-[#181922] border border-[#2c2f42] focus:border-primary/50 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 font-mono resize-none leading-relaxed"
              ></textarea>
              
              {/* Dynamic Variables Guide Card */}
              <div className="mt-3 p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start space-x-3 text-xs leading-normal">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-zinc-400">
                  <span className="text-white font-bold uppercase tracking-wider block mb-1">Interactive Placeholders</span>
                  Inject personalized customer information inside email and subject text dynamically:
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono text-[10px]">{"{{username}}"}</span>
                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono text-[10px]">{"{{email}}"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSending}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-4 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2" />
                  <span>Transmitting Dispatch...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Transmit Real-time Email Broadcast</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Recipients & Target Selector */}
      <div className="lg:col-span-5 space-y-6">
        {/* Recipient Mode Selection */}
        <div className="bg-[#12131a] border border-[#222431] rounded-2xl p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center space-x-3 mb-5">
            <Users className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-black text-white uppercase italic tracking-tight">Recipient Selection</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setRecipientMode("selected")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition ${
                recipientMode === "selected"
                  ? "bg-primary/10 border-primary/40 text-white"
                  : "bg-black/20 border-transparent text-slate-400 hover:bg-white/5"
              }`}
            >
              <CheckSquare className="w-5 h-5 mb-2 text-primary" />
              <span className="text-xs uppercase font-black tracking-wider">Select Users</span>
              <span className="text-[9px] text-muted-foreground uppercase font-bold mt-1">
                {selectedUserIds.length} Targeted
              </span>
            </button>

            <button
              onClick={() => {
                setRecipientMode("all");
                setSelectedUserIds([]);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition ${
                recipientMode === "all"
                  ? "bg-purple-500/10 border-purple-500/40 text-white"
                  : "bg-black/20 border-transparent text-slate-400 hover:bg-white/5"
              }`}
            >
              <Sparkles className="w-5 h-5 mb-2 text-purple-400" />
              <span className="text-xs uppercase font-black tracking-wider">All Recipients</span>
              <span className="text-[9px] text-zinc-500 uppercase font-bold mt-1">
                {eligibleUsers.length} total users
              </span>
            </button>
          </div>

          {/* User Multi Select view */}
          {recipientMode === "selected" ? (
            <div className="space-y-4">
              {/* User search bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={userSearchText}
                  onChange={e => setUserSearchText(e.target.value)}
                  placeholder="Search user by username or email..."
                  className="w-full bg-[#181922] border border-[#2c2f42] focus:border-primary/50 text-white placeholder-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-all"
                />
              </div>

              {/* Bulk operations */}
              <div className="flex gap-2 justify-between">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="flex-1 bg-white/5 border border-white/5 text-zinc-300 text-[10px] uppercase font-black py-1.5 px-3 rounded-lg hover:bg-white/10 transition"
                >
                  Select Filtered
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="flex-1 bg-white/5 border border-white/5 text-zinc-300 text-[10px] uppercase font-black py-1.5 px-3 rounded-lg hover:bg-white/10 transition"
                >
                  Clear Filtered
                </button>
              </div>

              {/* Scrollable checklist of elegible users */}
              <div className="bg-[#181922] border border-[#2c2f42] rounded-xl h-[320px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <AlertCircle className="w-8 h-8 text-zinc-600 mb-2" />
                    <p className="text-xs text-slate-400 uppercase font-bold">No recipients found</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Try another search keyword.</p>
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`flex items-center justify-between p-2.5 mb-1 rounded-lg cursor-pointer transition ${
                          isSelected 
                            ? "bg-primary/5 border border-primary/20" 
                            : "bg-transparent border border-transparent hover:bg-white/5"
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-white truncate max-w-[170px]">
                            {user.username || "Investor"}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[170px]">
                            {user.email}
                          </p>
                        </div>
                        
                        <div className={`p-1 rounded transition-colors ${isSelected ? "bg-primary text-white" : "text-zinc-600 hover:text-zinc-400"}`}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-3">
              <div className="flex items-start space-x-3 text-xs text-zinc-400 leading-relaxed">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-black uppercase tracking-wider block mb-1">Global Broadcast Target</span>
                  By selecting this option, your customized email template will be generated and routed individually to <strong className="text-purple-300 font-black">{eligibleUsers.length}</strong> active platform members in sequence.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
