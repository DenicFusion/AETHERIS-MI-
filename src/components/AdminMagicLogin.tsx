import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Zap,
  Copy,
  Check,
  Send,
  MessageCircle,
  Phone,
  Mail,
  Trash2,
  Clock,
  Shield,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  Loader2,
  Lock,
  Unlock,
  Sparkles,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface AdminMagicLoginProps {
  users: any[];
  preselectedUserId?: string;
  onClearPreselected?: () => void;
  magicTokens?: any[];
}

export function AdminMagicLogin({ users = [], preselectedUserId, onClearPreselected, magicTokens: propMagicTokens }: AdminMagicLoginProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [expirationHours, setExpirationHours] = useState("24");
  const [isPermanent, setIsPermanent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLinkInfo, setGeneratedLinkInfo] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Lists in real-time
  const [magicTokens, setMagicTokens] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isTokensLoading, setIsTokensLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(true);

  // Sync token real-time
  useEffect(() => {
    if (propMagicTokens) {
      setMagicTokens(propMagicTokens);
      setIsTokensLoading(false);
      return;
    }
    setIsTokensLoading(true);
    const qTokens = query(collection(db, "magic_login_tokens"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      qTokens,
      (snapshot) => {
        const tokensList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setMagicTokens(tokensList);
        setIsTokensLoading(false);
      },
      (error) => {
        console.error("Tokens load error:", error);
        setIsTokensLoading(false);
      }
    );
    return () => unsubscribe();
  }, [propMagicTokens]);

  // Sync audit logs real-time
  useEffect(() => {
    setIsLogsLoading(true);
    const qLogs = query(collection(db, "magic_login_audit_logs"), orderBy("timestamp", "desc"), limit(100));
    const unsubscribe = onSnapshot(
      qLogs,
      (snapshot) => {
        const logsList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setAuditLogs(logsList);
        setIsLogsLoading(false);
      },
      (error) => {
        console.error("Audits load error:", error);
        setIsLogsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Preselected user routing (from short-cuts)
  useEffect(() => {
    if (preselectedUserId && users.length > 0) {
      const match = users.find((usr) => usr.uid === preselectedUserId || usr.id === preselectedUserId);
      if (match) {
        setSelectedUser(match);
        setSearchTerm(match.email || match.username || "");
        if (onClearPreselected) onClearPreselected();
      }
    }
  }, [preselectedUserId, users, onClearPreselected]);

  // Autocomplete search
  const filteredSearchUsers = searchTerm.trim().length > 1
    ? users.filter((usr) => (
        usr.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usr.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usr.uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usr.id?.toLowerCase().includes(searchTerm.toLowerCase())
      )).slice(0, 5)
    : [];

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSearchTerm(user.email || user.username || "");
    setGeneratedLinkInfo(null);
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setSearchTerm("");
    setGeneratedLinkInfo(null);
  };

  // Generation Handshake
  const handleGenerateLink = async () => {
    if (!selectedUser) {
      toast.error("Please specify a user before triggering credentials signature.");
      return;
    }

    setIsGenerating(true);
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const currentUserEmail = db.app.options ? "admin" : "admin"; // client fallback

      const response = await fetch(`${baseUrl}/api/auth/generate-magic-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.uid || selectedUser.id,
          expirationHoursStr: expirationHours,
          isPermanent: isPermanent,
          createdBy: currentUserEmail
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Handshake generated 500 rejection.");
      }

      const appOrigin = window.location.origin;
      const completeLink = `${appOrigin}/auth/magic-login?token=${result.token}`;

      setGeneratedLinkInfo({
        link: completeLink,
        token: result.token,
        expiresAt: result.expiresAt,
        isPermanent: result.isPermanent,
        email: selectedUser.email,
        username: selectedUser.username || "User"
      });

      toast.success(`Access authorization generated for ${selectedUser.username || selectedUser.email}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Establishing credentials handshake timed out.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLinkInfo) return;
    navigator.clipboard.writeText(generatedLinkInfo.link);
    setCopiedLink(true);
    toast.success("Security login URL copied successfully.");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRevokeToken = async (token: string) => {
    try {
      toast.loading("Revoking protocol token...", { id: "revoke-action" });
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      
      const response = await fetch(`${baseUrl}/api/auth/revoke-magic-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Revocation failed.");
      }

      toast.success("Security token successfully revoked.", { id: "revoke-action" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to transmit revocation signals.", { id: "revoke-action" });
    }
  };

  // Multi-Channel Share logic
  const getShareText = () => {
    if (!generatedLinkInfo) return "";
    return `Hello ${generatedLinkInfo.username},\n\nClick the secure link below to access your Aetheris Dashboard directly. No password or email login required.\n\n🔒 Lock Access URL:\n${generatedLinkInfo.link}\n\nThis is a secure link. Do not share this connection link with anyone.`;
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const shareViaTelegram = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://t.me/share/url?url=${encodeURIComponent(generatedLinkInfo.link)}&text=${text}`, "_blank");
  };

  const shareViaSMS = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`sms:?body=${text}`, "_blank");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent("Aetheris Accounts - Secure Magic Login Link");
    const body = encodeURIComponent(getShareText());
    window.open(`mailto:${generatedLinkInfo.email}?subject=${subject}&body=${body}`, "_blank");
  };

  const getDeviceIcon = (type: string) => {
    if (type === "Mobile") return <Smartphone className="w-4 h-4 text-primary" />;
    if (type === "Tablet") return <Tablet className="w-4 h-4 text-emerald-400" />;
    return <Laptop className="w-4 h-4 text-blue-400" />;
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return "N/A";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div>
        <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary animate-pulse" /> Magic Login Engine
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Generate secure single-session or permanent access overrides for client nodes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Generator Controls (Left) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Authority Generation Control
              </CardTitle>
              <CardDescription className="text-xs">
                Acquire client keys for immediate bypass validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* User Search Input */}
              <div className="space-y-2 relative">
                <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest block">
                  Select Target User
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary text-white"
                    placeholder="Search UID, username, email..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedUser && e.target.value !== selectedUser.email) {
                        setSelectedUser(null);
                      }
                    }}
                    disabled={!!selectedUser}
                  />
                  {selectedUser && (
                    <button
                      onClick={clearSelection}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Autocomplete List */}
                {!selectedUser && filteredSearchUsers.length > 0 && (
                  <div className="absolute top-[102%] left-0 right-0 bg-[#0c1424] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
                    {filteredSearchUsers.map((usr) => (
                      <button
                        key={usr.id}
                        type="button"
                        onClick={() => handleSelectUser(usr)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-white truncate uppercase font-sans">
                            {usr.username || "Legacy Node"}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground truncate">
                            {usr.email}
                          </p>
                        </div>
                        <Badge className="bg-primary/20 text-primary uppercase text-[9px] font-black h-5 border-none">
                          {usr.role || "USER"}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase font-black text-primary tracking-wider font-sans">
                      Target Core Locked
                    </p>
                    <p className="text-sm font-black text-white uppercase mt-1">
                      {selectedUser.username || "Legacy Node"}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {selectedUser.email}
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-500 uppercase font-black tracking-widest text-[8px] h-5 px-2 border-none">
                    ONLINE SYNC
                  </Badge>
                </div>
              )}

              {/* Security parameters */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                    Vip Permanent Access
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPermanent(!isPermanent)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPermanent ? "bg-primary" : "bg-white/10"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPermanent ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                {!isPermanent ? (
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest block">
                      Token Lifespan Validity
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "1 Hour", val: "1" },
                        { label: "12 Hours", val: "12" },
                        { label: "24 Hours", val: "24" },
                        { label: "7 Days", val: "168" },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setExpirationHours(item.val)}
                          className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition ${expirationHours === item.val ? "bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/5" : "bg-black/20 text-muted-foreground border-white/5 hover:bg-white/5"}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-black text-amber-500 tracking-wider">
                        Static VIP Connection Link
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                        This token will bypass standard 24-hour schedules. The link will remain viable infinitely or until administratively destroyed in the control console. Use with discretion.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleGenerateLink}
                disabled={!selectedUser || isGenerating}
                className="w-full bg-primary hover:bg-primary/90 text-white font-black h-12 uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 transition-all text-xs disabled:opacity-40"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> EXTRUDING SIGNATURE...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" /> CREATE SECURE LOGIN KEY
                  </>
                )}
              </Button>

            </CardContent>
          </Card>

          {/* Generated Information Area */}
          <AnimatePresence>
            {generatedLinkInfo && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <Card className="border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center justify-between">
                      🔒 SECURE LINK READY
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-none uppercase text-[8px] font-black h-4">
                        {generatedLinkInfo.isPermanent ? "PERMANENT ACCESS" : "SINGLE USE ONLY"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block">
                        Login Protocol Token
                      </p>
                      <div className="flex bg-black/60 rounded-xl overflow-hidden border border-white/10 p-1">
                        <input
                          type="text"
                          readOnly
                          value={generatedLinkInfo.link}
                          className="flex-1 bg-transparent border-0 font-mono text-[10px] text-white px-2.5 outline-none select-all truncate"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition"
                        >
                          {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedLink ? "COPIED" : "COPY"}
                        </button>
                      </div>
                    </div>

                    {/* Share Action Grid */}
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block">
                        Send Authentication Signatures Via
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={shareViaEmail}
                          className="flex flex-col items-center justify-center p-3 bg-black/40 border border-white/5 hover:border-primary/20 hover:bg-primary/5 rounded-2xl group transition"
                        >
                          <Mail className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black font-mono tracking-widest uppercase text-muted-foreground mt-2">
                            MAIL
                          </span>
                        </button>
                        <button
                          onClick={shareViaWhatsApp}
                          className="flex flex-col items-center justify-center p-3 bg-black/40 border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 rounded-2xl group transition"
                        >
                          <Phone className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black font-mono tracking-widest uppercase text-muted-foreground mt-2">
                            WHATSAPP
                          </span>
                        </button>
                        <button
                          onClick={shareViaTelegram}
                          className="flex flex-col items-center justify-center p-3 bg-black/40 border border-white/5 hover:border-blue-400/20 hover:bg-blue-400/5 rounded-2xl group transition"
                        >
                          <Send className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black font-mono tracking-widest uppercase text-muted-foreground mt-2">
                            TG
                          </span>
                        </button>
                        <button
                          onClick={shareViaSMS}
                          className="flex flex-col items-center justify-center p-3 bg-black/40 border border-white/5 hover:border-rose-400/20 hover:bg-rose-400/5 rounded-2xl group transition"
                        >
                          <MessageSquare className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black font-mono tracking-widest uppercase text-muted-foreground mt-2">
                            SMS
                          </span>
                        </button>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Audit Stream and Database Registry (Right) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Active Login Handshakes & Tokens
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time active tokens registered in our network grid.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              
              <div className="overflow-x-auto max-h-[350px] custom-scrollbar">
                <Table>
                  <TableHeader className="bg-white/5 sticky top-0 z-10">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-[9px] uppercase font-black text-muted-foreground tracking-widest pl-6">Matched Node</TableHead>
                      <TableHead className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Expiration</TableHead>
                      <TableHead className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Status / Type</TableHead>
                      <TableHead className="text-[9px] uppercase font-black text-muted-foreground tracking-widest text-right pr-6">Destroy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isTokensLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                          <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Syncing active protocols...</span>
                        </TableCell>
                      </TableRow>
                    ) : magicTokens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground uppercase tracking-widest font-mono">
                          Zero active bypass keys registered
                        </TableCell>
                      </TableRow>
                    ) : (
                      magicTokens.map((tk) => {
                        const isExpired = tk.expiresAt && Date.now() > tk.expiresAt.toDate().getTime();
                        let badgeColor = "bg-primary/20 text-primary";
                        if (tk.status === "used") badgeColor = "bg-green-500/20 text-green-500";
                        if (tk.status === "revoked") badgeColor = "bg-rose-500/20 text-rose-500";
                        if (isExpired && tk.status === "active") badgeColor = "bg-orange-500/20 text-orange-400";

                        return (
                          <TableRow key={tk.id} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="pl-6 py-3">
                              <p className="text-xs font-black text-white uppercase truncate max-w-[150px] leading-tight">
                                {tk.username}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">
                                {tk.email}
                              </p>
                            </TableCell>
                            <TableCell className="py-3">
                              {tk.isPermanent ? (
                                <span className="text-xs font-mono font-black text-emerald-400 flex items-center gap-1">
                                  <Unlock className="w-3 h-3 text-emerald-400" /> PERMANENT
                                </span>
                              ) : isExpired ? (
                                <span className="text-[10px] font-mono text-rose-500 uppercase font-black">EXPIRED</span>
                              ) : (
                                <span className="text-xs font-mono text-slate-300">
                                  {formatTimestamp(tk.expiresAt)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex flex-col gap-1 items-start">
                                <Badge className={`text-[8px] uppercase font-black border-none px-1.5 h-4.5 ${badgeColor}`}>
                                  {isExpired && tk.status === "active" ? "EXPIRED" : tk.status}
                                </Badge>
                                <span className="text-[8px] text-muted-foreground font-mono uppercase tracking-widest">
                                  {tk.isPermanent ? "VIP BYPASS" : "ONE-TIME"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6 py-3">
                              {tk.status === "active" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeToken(tk.token)}
                                  className="h-8 w-8 p-0 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg text-slate-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>

          {/* Audit Trails Logs */}
          <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Security Access Audit Logs
              </CardTitle>
              <CardDescription className="text-xs">
                IP and Device logs synchronized across incoming auth requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              
              <div className="overflow-x-auto max-h-[350px] custom-scrollbar">
                <Table>
                  <TableHeader className="bg-white/5 sticky top-0 z-10">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-[9px] uppercase font-black text-muted-foreground tracking-widest pl-6">Client / Node</TableHead>
                      <TableHead className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Action Protocol</TableHead>
                      <TableHead className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Network details</TableHead>
                      <TableHead className="text-[9px] uppercase font-black text-muted-foreground tracking-widest text-right pr-6">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLogsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                          <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Syncing audit logs...</span>
                        </TableCell>
                      </TableRow>
                    ) : auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground uppercase tracking-widest font-mono">
                          Audit Trail Stream Empty
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => {
                        let statusColor = "bg-slate-500/20 text-slate-400";
                        if (log.type === "login_success") statusColor = "bg-green-500/20 text-green-400";
                        if (log.type === "opened") statusColor = "bg-blue-500/20 text-blue-400";
                        if (log.type === "generated") statusColor = "bg-primary/20 text-primary";
                        if (log.type === "login_failed") statusColor = "bg-rose-500/20 text-rose-400";
                        if (log.type === "revoked") statusColor = "bg-red-500/20 text-red-400";

                        return (
                          <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="pl-6 py-3">
                              <p className="text-xs font-mono font-bold text-white truncate max-w-[130px]">
                                {log.email || "Unknown node"}
                              </p>
                              <p className="text-[8px] text-muted-foreground font-mono uppercase">
                                UID: {log.userId?.slice(0, 10)}...
                              </p>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex flex-col gap-1 items-start">
                                <Badge className={`text-[8px] uppercase font-mono font-black border-none px-1.5 h-4.5 ${statusColor}`}>
                                  {log.type.replace("_", " ")}
                                </Badge>
                                {log.reason && (
                                  <span className="text-[8px] text-rose-400 font-mono italic">
                                    Why: {log.reason}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="space-y-1">
                                <p className="text-[10px] font-mono text-white flex items-center gap-1.5 leading-tight">
                                  {getDeviceIcon(log.deviceType)} {log.ip || "Local IP"}
                                </p>
                                <p className="text-[9px] text-muted-foreground flex items-center gap-1 uppercase font-black font-sans tracking-widest leading-none">
                                  <Globe className="w-3 h-3 text-slate-500" /> {log.country || "Local"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6 py-3 text-xs font-mono text-muted-foreground">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
