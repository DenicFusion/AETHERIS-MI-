import React, { useState, useEffect, useMemo } from "react";
import { formatPlanName, calculateInvestmentMetrics, calculateInvestmentProjection } from "@/lib/InvestmentEngine";
import { useFCMToken } from "@/hooks/useFCMToken";
import { getUserLevelBadge } from "@/lib/badge";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { WorkersManager } from '../components/AdminWorkersManager';
import AdminEmailSettings from '../components/AdminEmailSettings';
import { AdminCommunity } from '../components/AdminCommunity';
import { AdminTransparency } from '../components/AdminTransparency';
import { DeepAnalytics } from '../components/DeepAnalytics';
import { AdminMagicLogin } from '../components/AdminMagicLogin';
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import CustomMessenger from "../components/admin/CustomMessenger";
import QuickTradeSettingsManager from "../components/admin/QuickTradeSettingsManager";
import { DepositWithdrawalSettingsManager } from "../components/admin/DepositWithdrawalSettingsManager";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings,
  Users as UsersIcon,
  Activity,
  DollarSign,
  Plus,
  MessageCircle,
  Megaphone,
  Globe,
  CheckCircle,
  XCircle,
  Lock,
  LayoutDashboard,
  Gift,
  Shield,
  Bell,
  Search,
  Menu,
  LogOut,
  ChevronRight,
  Download,
  Eye,
  Edit,
  ListFilter,
  Calendar,
  RefreshCcw,
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
  X,
  UploadCloud,
  Trash2,
  Copy,
  CreditCard,
  Bitcoin,
  Wallet,
  Headphones,
  ChevronLeft,
  Loader2,
  Mail,
  MapPin,
  Laptop,
  Smartphone,
  Tablet,
  Zap,
  MessageSquare,
  Bot,
  User,
  Clock,
  Check,
  Database,
  Sliders,
  ArrowUp,
  ArrowDown,
  Trophy
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { TradingEngineService } from "@/lib/TradingEngineService";

// Dashboard components the admin utilizes

function NotificationBroadcaster() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<'broadcast' | 'profit' | 'interval'>("broadcast");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!title || !message) {
      toast.error("Both title and message are required.");
      return;
    }
    setIsSending(true);
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/admin/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, type }),
      });
      if (!res.ok) throw new Error("Failed to send broadcast");
      toast.success("Broadcast sent successfully!");
      setTitle("");
      setMessage("");
    } catch (e) {
      toast.error("Broadcast failed.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="w-5 h-5 text-primary mr-2" /> Global Broadcast
        </CardTitle>
        <CardDescription>Send real-time notifications to all active user nodes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Notification Title</label>
          <input 
            className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 text-sm" 
            placeholder="System Update, Market Notice, etc." 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Message Body</label>
          <textarea 
            className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 text-sm h-24" 
            placeholder="Write your announcement here..." 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-4">
           <div className="flex-1">
              <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-2 block">Alert Type</label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="bg-black/60 border-white/10 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broadcast">Announcement (Blue)</SelectItem>
                  <SelectItem value="profit">Yield Success (Green)</SelectItem>
                  <SelectItem value="interval">Payment Reminder (Orange)</SelectItem>
                </SelectContent>
              </Select>
           </div>
           <Button onClick={handleSend} disabled={isSending} className="mt-6 flex-1 bg-primary text-white font-bold h-10 shadow-lg shadow-primary/20">
             {isSending ? "Transmitting..." : "Send Global Alert"}
           </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReferralSettings() {
  const [config, setConfig] = useState({
    level1_percentage: 10,
    level2_percentage: 3,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "config", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          level1_percentage: data.level1_percentage || 10,
          level2_percentage: data.level2_percentage || 3,
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "config/global");
    });
    return () => unsubscribe();
  }, []);

  const saveConfig = async () => {
    setIsUpdating(true);
    try {
      await setDoc(doc(db, "config", "global"), config, { merge: true });
      toast.success("Referral settings updated");
    } catch (e) {
      toast.error("Failed to update referral settings");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Gift className="w-5 h-5 text-primary mr-2" /> Referral Program
        </CardTitle>
        <CardDescription>Configure tiered commission percentages for the network.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-muted-foreground">Tier 1 Commission (%)</label>
            <input 
              type="number" 
              className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2" 
              value={config.level1_percentage} 
              onChange={e => setConfig({...config, level1_percentage: Number(e.target.value)})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-muted-foreground">Tier 2 Commission (%)</label>
            <input 
              type="number" 
              className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2" 
              value={config.level2_percentage} 
              onChange={e => setConfig({...config, level2_percentage: Number(e.target.value)})} 
            />
          </div>
        </div>
        <Button onClick={saveConfig} disabled={isUpdating} className="w-full bg-primary">
          {isUpdating ? "Syncing..." : "Update Commissions"}
        </Button>
      </CardContent>
    </Card>
  );
}

function WalletPoolManager() {
  const [pools, setPools] = useState({
    BTC: "",
    ETH: "",
    SOL: "",
    USDT: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "crypto_pools"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPools({
          BTC: data.BTC?.join(", ") || "",
          ETH: data.ETH?.join(", ") || "",
          SOL: data.SOL?.join(", ") || "",
          USDT: data.USDT?.join(", ") || "",
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/crypto_pools");
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedPools = {
        BTC: pools.BTC.split(",").map(a => a.trim()).filter(Boolean),
        ETH: pools.ETH.split(",").map(a => a.trim()).filter(Boolean),
        SOL: pools.SOL.split(",").map(a => a.trim()).filter(Boolean),
        USDT: pools.USDT.split(",").map(a => a.trim()).filter(Boolean),
      };
      await setDoc(doc(db, "settings", "crypto_pools"), parsedPools, { merge: true });
      toast.success("Wallet pools updated successfully");
    } catch (e) {
      toast.error("Failed to update wallet pools");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl mt-6">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle className="flex items-center">
            <Bitcoin className="w-5 h-5 text-primary mr-2" /> Crypto Wallet Pools
          </CardTitle>
          <CardDescription>Manage your cryptocurrency deposit addresses. Comma-separated for multiple addresses.</CardDescription>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
          {isSaving ? "Saving..." : "Save Addresses"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {["BTC", "ETH", "SOL", "USDT"].map((crypto) => (
          <div key={crypto} className="space-y-1">
            <label className="text-xs uppercase font-bold text-muted-foreground">{crypto} Addresses</label>
            <textarea
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm h-20 font-mono text-white placeholder-slate-600 focus:border-primary focus:outline-none"
              placeholder={`Enter ${crypto} addresses separated by commas...`}
              value={pools[crypto as keyof typeof pools]}
              onChange={(e) => setPools({ ...pools, [crypto]: e.target.value })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BrandingManager() {
  const [mainLogoUrl, setMainLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [logoHeight, setLogoHeight] = useState<number>(32);
  const [fileToUpload, setFileToUpload] = useState<{file: File, type: 'logo'|'favicon'} | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const brandingRef = doc(db, "settings", "branding");
    const unsubscribe = onSnapshot(
      brandingRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMainLogoUrl(data.main_logo_url || null);
          setLogoHeight(data.logo_height || 32);
          setFaviconUrl(data.favicon_url || null);
        } else {
          setMainLogoUrl(null);
          setLogoHeight(32);
          setFaviconUrl(null);
        }
      },
      (error) =>
        handleFirestoreError(error, OperationType.GET, "settings/branding"),
    );
    return () => unsubscribe();
  }, []);

  const updateLogoHeight = async (newHeight: number) => {
    setLogoHeight(newHeight);
    try {
      await setDoc(doc(db, "settings", "branding"), { logo_height: newHeight }, { merge: true });
    } catch (err) {
      console.error("Failed to update logo height:", err);
    }
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo'|'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileToUpload({file, type});
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelSelection = () => {
    setFileToUpload(null);
    setPreviewUrl(null);
  };

  const confirmUpload = async () => {
    if (!fileToUpload) return;
    setIsUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const { url } = await uploadToCloudinary(fileToUpload.file);
      await setDoc(doc(db, "settings", "branding"), { [fileToUpload.type === 'logo' ? 'main_logo_url' : 'favicon_url']: url }, { merge: true });
      toast.success(`${fileToUpload.type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully!`);
      cancelSelection();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (type: 'logo'|'favicon') => {
    try {
      await setDoc(doc(db, "settings", "branding"), { [type === 'logo' ? 'main_logo_url' : 'favicon_url']: null }, { merge: true });
      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} deleted.`);
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="w-5 h-5 text-primary mr-2" /> Branding: Logo & Favicon
        </CardTitle>
        <CardDescription>
          Upload your rectangular logo (PNG/SVG) and square Favicon (PNG/ICO/SVG).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {previewUrl && fileToUpload ? (
          <div className="space-y-4">
            <h4 className="text-white font-medium capitalize">Uploading {fileToUpload.type}...</h4>
            <div className="relative p-6 w-full max-w-md rounded-xl bg-[#0f1115] border border-white/10 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-20 w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5"
                onClick={cancelSelection}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={confirmUpload}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Confirm Upload"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider border-b border-white/10 pb-2">Main Logo</h3>
              {mainLogoUrl ? (
                <div className="space-y-3">
                  <div className="relative p-6 w-full max-w-md rounded-xl bg-[#0f1115] border border-white/10 flex items-center justify-center">
                    <img
                      src={mainLogoUrl}
                      alt="Current Logo"
                      className="max-h-20 w-auto object-contain"
                      crossOrigin="anonymous"
                    />
                    <button
                      className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500/80 transition"
                      onClick={() => handleDelete('logo')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No logo uploaded. Please upload a logo to display it on the platform.
                </p>
              )}

              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="logo-upload"
                  className="hidden"
                  onChange={(e) => handleSelectFile(e, 'logo')}
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex w-full cursor-pointer max-w-md"
                >
                  <div className="w-full flex items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-primary/50 hover:bg-white/5 transition-colors gap-3">
                    <UploadCloud className="w-5 h-5 text-primary" />
                    <span className="text-white text-sm font-medium">
                      Upload Logo
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-4 space-y-4 max-w-md">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-white uppercase tracking-wider">
                    Logo Display Size
                  </label>
                  <span className="text-primary font-mono text-xs font-bold bg-primary/10 px-2 py-1 rounded">
                    {logoHeight}px
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="80"
                  step="2"
                  value={logoHeight ?? 32}
                  onChange={(e) => updateLogoHeight(parseInt(e.target.value))}
                  className="w-full accent-primary h-2 bg-black/50 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider border-b border-white/10 pb-2">Website Favicon</h3>
              {faviconUrl ? (
                <div className="space-y-3">
                  <div className="relative p-6 w-[120px] rounded-xl bg-[#0f1115] border border-white/10 flex items-center justify-center">
                    <img
                      src={faviconUrl}
                      alt="Current Favicon"
                      className="w-12 h-12 object-contain"
                      crossOrigin="anonymous"
                    />
                    <button
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-red-500/80 transition"
                      onClick={() => handleDelete('favicon')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No custom favicon. The default Aetheris icon will be used.
                </p>
              )}

              <div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/x-icon, image/svg+xml"
                  id="favicon-upload"
                  className="hidden"
                  onChange={(e) => handleSelectFile(e, 'favicon')}
                />
                <label
                  htmlFor="favicon-upload"
                  className="inline-flex w-full cursor-pointer max-w-md"
                >
                  <div className="w-full flex items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-primary/50 hover:bg-white/5 transition-colors gap-3">
                    <UploadCloud className="w-5 h-5 text-primary" />
                    <span className="text-white text-sm font-medium">
                      Upload Favicon
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentGatewayManager({ paymentGateways = { fiat: true, crypto: true }, handleUpdateGlobalConfig }: any) {
  return (
    <Card className="bg-black/40 border-white/5 p-8 group hover:bg-black/60 transition-all flex flex-col">
       <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl font-black uppercase italic tracking-tighter leading-none mb-1">Gateway Allocation Matrix</CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold tracking-widest leading-relaxed">
             Toggle primary ingress routes. Disabling a gateway routes nodes to fallback methods.
          </CardDescription>
       </CardHeader>
       <div className="flex-1 mt-6 space-y-6">
          <div className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-2xl">
             <div>
                <h4 className="text-base font-black text-white uppercase italic flex items-center">
                   <Bitcoin className="w-5 h-5 mr-2 text-primary" /> Crypto Gateway <Badge className="ml-3 bg-primary/20 text-primary uppercase text-[9px] font-black tracking-widest border-none">NOWPayments</Badge>
                </h4>
                <p className="text-xs text-muted-foreground uppercase font-semibold mt-1">If disabled, defaults to manual Smart Pool wallets.</p>
             </div>
             <button 
                onClick={() => handleUpdateGlobalConfig('paymentGateways', { ...paymentGateways, crypto: !paymentGateways.crypto })}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-500 ${paymentGateways?.crypto ? 'bg-primary ring-4 ring-primary/20 shadow-[0_0_20px_rgba(30,80,255,0.4)]' : 'bg-white/10 opacity-50'}`}
             >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-500 ${paymentGateways?.crypto ? 'translate-x-9 shadow-lg' : 'translate-x-1'}`} />
             </button>
          </div>

          <div className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-2xl">
             <div>
                <h4 className="text-base font-black text-white uppercase italic flex items-center">
                   <CreditCard className="w-5 h-5 mr-2 text-emerald-500" /> Fiat Gateway <Badge className="ml-3 bg-emerald-500/20 text-emerald-500 uppercase text-[9px] font-black tracking-widest border-none">Bachs Gateway</Badge>
                </h4>
                <p className="text-xs text-muted-foreground uppercase font-semibold mt-1">Enable or disable fiat/card ingestion methods.</p>
             </div>
             <button 
                onClick={() => handleUpdateGlobalConfig('paymentGateways', { ...paymentGateways, fiat: !paymentGateways.fiat })}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-500 ${paymentGateways?.fiat ? 'bg-emerald-500 ring-4 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/10 opacity-50'}`}
             >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-500 ${paymentGateways?.fiat ? 'translate-x-9 shadow-lg' : 'translate-x-1'}`} />
             </button>
          </div>
       </div>
    </Card>
  );
}

function AiRatesManager() {
  const [status, setStatus] = useState<any>({
    lastSync: null,
    nextSync: null,
    status: 'pending',
    error: null,
    hasApiKey: false,
    rates: { EUR: 0.92, GBP: 0.79, BTC: 92450, ETH: 3250, SOL: 168, USDT: 1.00 }
  });
  const [apiKey, setApiKey] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const rawBaseUrl = (import.meta as any).env.VITE_API_URL || "";
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/rates/status`);
      if (res.ok) {
        const d = await res.json();
        if (d && typeof d === 'object') {
          setStatus(d);
        }
      }
    } catch (err) {
      console.warn("Rates status sync standby:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const intv = setInterval(fetchStatus, 30000); // refresh status every 30s
    return () => clearInterval(intv);
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a valid Gemini API Key");
      return;
    }
    setIsSavingKey(true);
    try {
      const res = await fetch(`${baseUrl}/api/rates/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: apiKey })
      });
      if (res.ok) {
        toast.success("Gemini API Key saved and rates successfully calibrated!");
        setApiKey("");
        fetchStatus();
      } else {
        toast.error("Failed to save Gemini API Key");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save API Configuration");
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    toast.loading("Initiating live AI currency & crypto rate recalibration...");
    try {
      const res = await fetch(`${baseUrl}/api/rates/sync`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          toast.success("Liquidity calibration complete. System rates successfully synchronized.");
          fetchStatus();
        } else {
          toast.error(d.error || "Calibration completed but encountered some warnings.");
          fetchStatus();
        }
      } else {
        toast.error("Rates synchronization service timed out or failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Sync execution aborted.");
    } finally {
      setIsSyncing(false);
      toast.dismiss();
    }
  };

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return "Never";
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="bg-[#12151D]/60 border-slate-900 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-6">
        <div>
          <CardTitle className="flex items-center text-primary uppercase font-black tracking-tighter text-xl italic gap-2 focus:outline-none">
            <RefreshCcw className="w-6 h-6 animate-pulse text-[#1e50ff]" /> Aetheris AI Rates Optimizer
          </CardTitle>
          <CardDescription className="uppercase font-bold tracking-widest text-[10px] text-muted-foreground mt-1">
            Algorithmic calibration and syncing engine
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`uppercase text-[9px] font-black tracking-widest px-2 py-1 select-none border-none ${
            status?.status === 'success' ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' :
            status?.status === 'error' ? 'bg-red-500/20 text-red-500 border-none' : 'bg-amber-500/20 text-amber-500 border-none'
          }`}>
            ● {status?.status === 'success' ? 'Securely Calibrated' : status?.status === 'error' ? 'Warnings / Uncalibrated' : 'Sync Pending'}
          </Badge>
          {status?.hasApiKey ? (
            <Badge className="bg-primary/20 text-primary border-none uppercase text-[9px] font-black tracking-widest px-2 py-1">
              Active Gemini AI
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-500 border-none uppercase text-[9px] font-black tracking-widest px-2 py-1">
              No Gemini Key
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0b0c10] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">Last Dynamic Sync</span>
              <span className="text-sm font-semibold text-white block font-mono">
                {formatDateTime(status?.lastSync)}
              </span>
            </div>
            <div className="mt-3 border-t border-white/5 pt-2 flex justify-between items-center text-[10px] uppercase text-muted-foreground">
              <span>Next Schedule Target:</span>
              <span className="font-mono font-bold text-slate-300">{formatDateTime(status?.nextSync)}</span>
            </div>
          </div>

          <div className="bg-[#0b0c10] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">Recurrent Interval</span>
              <span className="text-sm font-semibold text-white block">
                Every 3 Hours (Active Grounding)
              </span>
            </div>
            <div className="mt-3 border-t border-white/5 pt-2 flex justify-between items-center text-[10px] uppercase text-muted-foreground">
              <span>Status Report:</span>
              <span className="font-mono text-xs font-semibold max-w-[200px] truncate block text-slate-300">
                {status?.error || "All algorithms calibrated successfully."}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase font-extrabold text-[#717b8f] tracking-widest block font-sans">Active Exchange & Valuation Rates</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="bg-[#0f121a] border border-white/[0.02] rounded-xl p-3 text-center">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">EUR / USD</p>
              <h5 className="text-lg font-mono font-black text-white mt-1">€{status?.rates?.EUR?.toFixed(4) || "0.9200"}</h5>
              <p className="text-[8px] text-slate-500 font-bold mt-0.5">FIAT SYNC</p>
            </div>
            <div className="bg-[#0f121a] border border-white/[0.02] rounded-xl p-3 text-center">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">GBP / USD</p>
              <h5 className="text-lg font-mono font-black text-white mt-1">£{status?.rates?.GBP?.toFixed(4) || "0.7900"}</h5>
              <p className="text-[8px] text-slate-500 font-bold mt-0.5">FIAT SYNC</p>
            </div>
            <div className="bg-[#0f121a] border border-white/[0.02] rounded-xl p-3 text-center">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">BTC / USDT</p>
              <h5 className="text-lg font-mono font-black text-white mt-1">${status?.rates?.BTC?.toLocaleString(undefined, {maximumFractionDigits: 1}) || "92,450"}</h5>
              <p className="text-[8px] text-emerald-500 font-bold mt-0.5 animate-pulse">● CRYPTO ALIVE</p>
            </div>
            <div className="bg-[#0f121a] border border-white/[0.02] rounded-xl p-3 text-center">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">ETH / USDT</p>
              <h5 className="text-lg font-mono font-black text-white mt-1">${status?.rates?.ETH?.toLocaleString(undefined, {maximumFractionDigits: 1}) || "3,250"}</h5>
              <p className="text-[8px] text-emerald-500 font-bold mt-0.5 animate-pulse">● CRYPTO ALIVE</p>
            </div>
            <div className="bg-[#0f121a] border border-white/[0.02] rounded-xl p-3 text-center col-span-2 sm:col-span-1">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">SOL / USDT</p>
              <h5 className="text-lg font-mono font-black text-white mt-1">${status?.rates?.SOL?.toLocaleString(undefined, {maximumFractionDigits: 1}) || "168"}</h5>
              <p className="text-[8px] text-emerald-500 font-bold mt-0.5 animate-pulse">● CRYPTO ALIVE</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-8 space-y-2">
            <label className="text-xs uppercase font-extrabold text-[#717b8f] tracking-widest block font-sans">
              Enter Gemini API Key to activate AI-Calibration spreads
            </label>
            <div className="flex bg-[#0f121a] border border-slate-900 rounded-lg items-center group focus-within:border-primary/50 transition-colors h-12 px-4 gap-3">
              <Lock className="w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder={status?.hasApiKey ? "••••••••••••••••••••••••••••••••" : "AI key (Starts with AIzaSy...)"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-transparent border-0 outline-none flex-1 text-sm text-white placeholder-slate-700 font-sans focus:ring-0 focus:outline-none"
              />
              <Button
                size="sm"
                className="bg-primary hover:bg-blue-600 font-bold text-[10px] h-8 rounded-md uppercase tracking-wider"
                onClick={handleSaveApiKey}
                disabled={isSavingKey}
              >
                {isSavingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save API Key"}
              </Button>
            </div>
          </div>

          <div className="md:col-span-4 w-full">
            <Button
              className="w-full h-12 uppercase font-black text-xs tracking-widest bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 gap-2 cursor-pointer transition-all mb-0.5"
              onClick={handleSyncNow}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calibrating...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-4 h-4" />
                  Sync Rates Now
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BachsSettingsManager() {
  const [settings, setSettings] = useState({
    mode: "test",
    test_secret_key: "",
    live_secret_key: "",
    test_product_id: "",
    live_product_id: "",
    test_webhook_secret: "",
    live_webhook_secret: "",
    test_merchant_id: "",
    live_merchant_id: "",
    test_publishable_key: "",
    live_publishable_key: "",
    methods: {
      bacs_direct_debit: true,
      card: true,
      bank_transfer: true,
      faster_payments: true,
      sepa: true,
      wire_transfer: true
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribeBachs = onSnapshot(doc(db, "payment_settings", "bachs"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(prev => ({
          ...prev,
          mode: data.mode || "test",
          test_secret_key: data.test_secret_key || "",
          live_secret_key: data.live_secret_key || "",
          test_product_id: data.test_product_id || "",
          live_product_id: data.live_product_id || "",
          test_webhook_secret: data.test_webhook_secret || "",
          live_webhook_secret: data.live_webhook_secret || "",
          test_merchant_id: data.test_merchant_id || "",
          live_merchant_id: data.live_merchant_id || "",
          test_publishable_key: data.test_publishable_key || "",
          live_publishable_key: data.live_publishable_key || "",
          methods: {
            bacs_direct_debit: data.methods?.bacs_direct_debit ?? true,
            card: data.methods?.card ?? true,
            bank_transfer: data.methods?.bank_transfer ?? true,
            faster_payments: data.methods?.faster_payments ?? true,
            sepa: data.methods?.sepa ?? true,
            wire_transfer: data.methods?.wire_transfer ?? true,
          }
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "payment_settings/bachs");
    });

    return () => unsubscribeBachs();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "payment_settings", "bachs"), {
        provider: "bachs",
        mode: settings.mode,
        test_secret_key: settings.test_secret_key,
        live_secret_key: settings.live_secret_key,
        test_product_id: settings.test_product_id,
        live_product_id: settings.live_product_id,
        test_webhook_secret: settings.test_webhook_secret,
        live_webhook_secret: settings.live_webhook_secret,
        test_merchant_id: settings.test_merchant_id,
        live_merchant_id: settings.live_merchant_id,
        test_publishable_key: settings.test_publishable_key,
        live_publishable_key: settings.live_publishable_key,
        methods: settings.methods,
      }, { merge: true });

      toast.success("Bachs Payment Gateway Settings Updated!");
    } catch (e) {
      toast.error("Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMethod = (key: keyof typeof settings.methods) => {
    setSettings(prev => ({
      ...prev,
      methods: {
        ...prev.methods,
        [key]: !prev.methods[key]
      }
    }));
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl mt-6">
      <CardHeader>
         <CardTitle className="flex items-center text-xl font-black uppercase italic tracking-tighter">
            <CreditCard className="w-5 h-5 text-emerald-500 mr-2" /> Bachs Gateway Integration
         </CardTitle>
         <CardDescription className="text-xs uppercase font-bold tracking-widest leading-relaxed">
            Configure Bachs Payment Gateway credentials and manage global fiat deposit ingress.
         </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className="flex gap-4">
            <Button 
               variant={settings.mode === 'test' ? 'default' : 'outline'} 
               onClick={() => setSettings({...settings, mode: 'test'})}
               className={settings.mode === 'test' ? "flex-1 bg-amber-500 text-black hover:bg-amber-600 font-bold" : "flex-1"}
            >
               TEST MODE
            </Button>
            <Button 
               variant={settings.mode === 'live' ? 'default' : 'outline'} 
               onClick={() => setSettings({...settings, mode: 'live'})}
               className={settings.mode === 'live' ? "flex-1 bg-emerald-500 text-black hover:bg-emerald-600 font-bold" : "flex-1"}
            >
               LIVE MODE
            </Button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Test Secret API Key</label>
               <input type="password" value={settings.test_secret_key} onChange={e => setSettings({...settings, test_secret_key: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Live Secret API Key</label>
               <input type="password" value={settings.live_secret_key} onChange={e => setSettings({...settings, live_secret_key: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Test Publishable Key</label>
               <input type="text" value={settings.test_publishable_key} onChange={e => setSettings({...settings, test_publishable_key: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white placeholder-white/30" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Live Publishable Key</label>
               <input type="text" value={settings.live_publishable_key} onChange={e => setSettings({...settings, live_publishable_key: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white placeholder-white/30" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Webhook Secret (Test)</label>
               <input type="password" value={settings.test_webhook_secret} onChange={e => setSettings({...settings, test_webhook_secret: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Webhook Secret (Live)</label>
               <input type="password" value={settings.live_webhook_secret} onChange={e => setSettings({...settings, live_webhook_secret: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Test Merchant ID</label>
               <input type="text" placeholder="e.g. merchant_bachs_123" value={settings.test_merchant_id} onChange={e => setSettings({...settings, test_merchant_id: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white placeholder-white/30" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Live Merchant ID</label>
               <input type="text" placeholder="e.g. merchant_bachs_123" value={settings.live_merchant_id} onChange={e => setSettings({...settings, live_merchant_id: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white placeholder-white/30" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Test Product ID</label>
               <input type="text" placeholder="e.g. prod_xxx" value={settings.test_product_id} onChange={e => setSettings({...settings, test_product_id: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white placeholder-white/30" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Live Product ID</label>
               <input type="text" placeholder="e.g. prod_xxx" value={settings.live_product_id} onChange={e => setSettings({...settings, live_product_id: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-white placeholder-white/30" />
            </div>
         </div>

         <div className="space-y-3 pt-4 border-t border-white/5">
            <h4 className="text-xs uppercase font-extrabold tracking-widest text-emerald-500 mb-1">Enable Payment Methods</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-black/20 p-4 rounded-xl border border-white/5">
               {Object.keys(settings.methods).map(methodKey => {
                  const mKey = methodKey as keyof typeof settings.methods;
                  const label = methodKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return (
                     <label key={mKey} className="flex items-center gap-3 cursor-pointer group text-xs font-bold text-slate-300 hover:text-white select-none transition-colors">
                        <input 
                           type="checkbox" 
                           checked={settings.methods[mKey]} 
                           onChange={() => toggleMethod(mKey)}
                           className="rounded bg-black border-slate-700 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0 h-4 w-4"
                        />
                        <span>{label}</span>
                     </label>
                  );
               })}
            </div>
         </div>

         <Button onClick={handleSave} disabled={isSaving} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 uppercase tracking-widest">
            {isSaving ? "Saving..." : "Save Bachs Settings"}
         </Button>
      </CardContent>
    </Card>
  );
}

function HeroMediaManager({
  heroMediaUrl,
  heroMediaType,
  handleUpdateGlobalConfig,
}: any) {
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileToUpload(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelSelection = () => {
    setFileToUpload(null);
    setPreviewUrl(null);
  };

  const confirmUpload = async () => {
    if (!fileToUpload) return;
    setIsUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const { url, type } = await uploadToCloudinary(fileToUpload);
      await handleUpdateGlobalConfig("heroMediaUrl", url);
      await handleUpdateGlobalConfig("heroMediaType", type);
      toast.success(
        `${type === "video" ? "Video" : "Image"} uploaded successfully!`,
      );
      cancelSelection();
    } catch (err: any) {
      toast.error(err.message || "Media upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await handleUpdateGlobalConfig("heroMediaUrl", "");
      await handleUpdateGlobalConfig("heroMediaType", "");
      toast.success("Hero media deleted.");
    } catch (err) {
      toast.error("Failed to delete hero media");
    }
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Globe className="w-5 h-5 text-primary mr-2" /> Homepage Hero Media
        </CardTitle>
        <CardDescription>
          Upload background media (Image or Video) for the landing page hero.
          Only one active hero media at a time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {previewUrl ? (
          <div className="space-y-4">
            <div className="relative w-full max-w-sm rounded overflow-hidden border border-white/10">
              {fileToUpload?.type.startsWith("video/") ? (
                <video
                  src={previewUrl}
                  className="w-full h-auto"
                  controls
                  muted
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-auto object-cover"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={confirmUpload}
                disabled={isUploading}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {isUploading ? (
                  <RefreshCcw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}{" "}
                Confirm
              </Button>
              <Button
                onClick={cancelSelection}
                disabled={isUploading}
                variant="outline"
                className="border-white/10 hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {heroMediaUrl ? (
              <div className="relative w-full max-w-sm rounded overflow-hidden border border-white/10 group mb-4">
                {heroMediaType === "video" ? (
                  <video
                    src={heroMediaUrl}
                    className="w-full h-auto"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={heroMediaUrl}
                    alt="Hero"
                    className="w-full h-auto object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white"
                    onClick={() =>
                      document.getElementById("hero-upload")?.click()
                    }
                  >
                    <Edit className="w-4 h-4 mr-2" /> Replace
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-red-500/40 hover:bg-red-500/60 text-white"
                    onClick={handleDelete}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm h-32 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-muted-foreground bg-white/5 mb-4">
                No active media
              </div>
            )}
            <input
              id="hero-upload"
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleSelectFile}
            />
            {!heroMediaUrl && (
              <Button
                className="w-full max-w-sm bg-white/5 hover:bg-white/10 border border-white/10"
                onClick={() => document.getElementById("hero-upload")?.click()}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" /> Select New Media
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AvatarManager({ avatars }: any) {
  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; preview: string }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const maxAvatars = 12;

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check against max 12 avatars limit
    const totalSelected = files.length;
    const availableSlots = Math.max(
      0,
      maxAvatars - avatars.length - selectedFiles.length,
    );

    if (totalSelected > availableSlots) {
      toast.error(
        `You can only add ${availableSlots} more avatars. Limit is ${maxAvatars} total.`,
      );
      return;
    }

    const newFiles = files.map((file: File) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeSelected = (index: number) => {
    setSelectedFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const uploadBatch = async () => {
    if (!selectedFiles.length) return;
    setIsUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      let uploadedCount = 0;
      for (const item of selectedFiles) {
        const { url } = await uploadToCloudinary(item.file);
        const docRef = doc(collection(db, "avatars"));
        await setDoc(docRef, { image_url: url, created_at: new Date() });
        uploadedCount++;
      }
      toast.success(`${uploadedCount} avatars uploaded successfully!`);
      setSelectedFiles([]);
    } catch (err: any) {
      toast.error(err.message || "Batch upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAvatar = async (id: string) => {
    try {
      await deleteDoc(doc(db, "avatars", id));
      toast.success("Avatar deleted.");
    } catch (e) {
      toast.error("Failed to delete avatar.");
    }
  };

  const replaceAvatar = async (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.loading("Replacing avatar...");
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const { url } = await uploadToCloudinary(file);
      await setDoc(
        doc(db, "avatars", id),
        { image_url: url, updated_at: new Date() },
        { merge: true },
      );
      toast.dismiss();
      toast.success("Avatar replaced successfully!");
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to replace avatar");
    }
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <UsersIcon className="w-5 h-5 text-primary mr-2" /> User Avatar Pool
        </CardTitle>
        <CardDescription>
          Manage user avatars. Strict limit of {maxAvatars} avatars displayed in
          a grid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Live Grid */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">
            Active Avatars ({avatars.length}/{maxAvatars})
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {avatars.map((av: any) => (
              <div
                key={av.id}
                className="relative aspect-square rounded-lg border border-white/10 overflow-hidden group bg-white/5 flex items-center justify-center"
              >
                <img
                  src={av.image_url}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <label className="cursor-pointer text-xs bg-white/20 hover:bg-white/30 text-white rounded px-2 py-1 flex items-center justify-center">
                    <Edit className="w-3 h-3 mr-1" /> Edit
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => replaceAvatar(av.id, e)}
                    />
                  </label>
                  <button
                    onClick={() => deleteAvatar(av.id)}
                    className="text-xs bg-red-500/40 hover:bg-red-500/60 text-white rounded px-2 py-1 flex items-center justify-center"
                  >
                    <XCircle className="w-3 h-3 mr-1" /> Remove
                  </button>
                </div>
              </div>
            ))}
            {Array.from({ length: maxAvatars - avatars.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-lg border border-dashed border-white/10 flex items-center justify-center opacity-30"
              >
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
            ))}
          </div>
        </div>

        {/* Selected for Upload */}
        {selectedFiles.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/5">
            <h3 className="text-sm font-medium text-primary mb-3">
              Pending Uploads ({selectedFiles.length})
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {selectedFiles.map((item, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-lg overflow-hidden border border-white/20 bg-black"
                >
                  <img
                    src={item.preview}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeSelected(idx)}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-red-500/80 rounded-full p-1 text-white shadow-lg transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={uploadBatch}
                disabled={isUploading}
                className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto"
              >
                {isUploading ? (
                  <RefreshCcw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                )}{" "}
                Upload Batch
              </Button>
              <Button
                onClick={() => setSelectedFiles([])}
                disabled={isUploading}
                variant="outline"
                className="border-white/10 hover:bg-white/10"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Trigger Batch Select */}
        <div className="pt-2">
          <input
            id="batch-avatar-upload"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleSelectFiles}
          />
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 w-full hover:bg-white/10"
            onClick={() =>
              document.getElementById("batch-avatar-upload")?.click()
            }
            disabled={avatars.length + selectedFiles.length >= maxAvatars}
          >
            <Plus className="w-4 h-4 mr-2" />
            {avatars.length + selectedFiles.length >= maxAvatars
              ? "Avatar Limit Reached"
              : "Select Images to Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<any>({});
  const [defaults, setDefaults] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState("welcome_email");
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      
      const [defaultsRes, templatesRes] = await Promise.all([
         fetch(`${baseUrl}/api/admin/email-templates/defaults`),
         fetch(`${baseUrl}/api/admin/email-templates`)
      ]);
      
      if (defaultsRes.ok) {
         const data = await defaultsRes.json();
         setDefaults(data.defaults || {});
      }
      
      if (templatesRes.ok) {
         const data = await templatesRes.json();
         const tMap: any = {};
         data.forEach((t: any) => {
            tMap[t.id] = t.html;
         });
         setTemplates(tMap);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const templateList = [
    { id: "welcome_email", label: "Welcome Registration" },
    { id: "welcome_verification_email", label: "Welcome & Verification" },
    { id: "transaction_email", label: "Transaction Notification" },
    { id: "otp_email", label: "Security OTP" },
    { id: "plan_paused_email", label: "Investment Plan Paused" },
    { id: "support_reply_email", label: "Support Ticket Reply" },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/admin/email-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           templateId: activeTemplate, 
           html: templates[activeTemplate] || defaults[activeTemplate] || "" 
        })
      });
      if (!res.ok) throw new Error("Failed to save template");
      toast.success("Template saved successfully");
    } catch (e) {
      toast.error("Error saving template");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading templates...</div>;

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-black uppercase italic tracking-tighter">
          <Mail className="w-5 h-5 text-primary mr-2" /> Global Email Dispatch Templates
        </CardTitle>
        <CardDescription>Customize the core HTML structures used for system outgoing emails.</CardDescription>
      </CardHeader>
      <CardContent>
         <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-64 space-y-2">
               {templateList.map(t => (
                  <button
                     key={t.id}
                     onClick={() => setActiveTemplate(t.id)}
                     className={`w-full text-left px-4 py-3 rounded-xl transition-colors text-sm font-bold uppercase tracking-wider ${activeTemplate === t.id ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-black/40 text-muted-foreground hover:bg-white/5'}`}
                  >
                     {t.label}
                  </button>
               ))}
            </div>
            
            <div className="flex-1 space-y-4">
               <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest p-4 bg-black/60 rounded-xl border border-white/5">
                  <span className="text-white">Active Node:</span> {activeTemplate}
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-black uppercase text-white/50 tracking-wdest">Raw HTML Structure</label>
                 <textarea
                   className="w-full h-[600px] bg-[#0A0F1C] border border-white/10 rounded-xl p-6 text-sm font-mono text-emerald-400 placeholder-white/20 focus:border-primary outline-none whitespace-pre overflow-x-auto custom-scrollbar"
                   value={templates[activeTemplate] !== undefined ? templates[activeTemplate] : (defaults[activeTemplate] || "")}
                   onChange={(e) => setTemplates({...templates, [activeTemplate]: e.target.value})}
                   spellCheck={false}
                 />
                 <p className="text-[10px] text-muted-foreground/60 italic uppercase mt-2">
                   Warning: Do not alter critical syntax injection variables like {'{{username}}'} or {'{{amount}}'}.
                 </p>
               </div>

               <Button 
                  onClick={handleSave} 
                  disabled={isSaving} 
                  className="w-full lg:w-auto bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-12"
               >
                 {isSaving ? "Syncing..." : "Update Template Core"}
               </Button>
            </div>
         </div>
      </CardContent>
    </Card>
  )
}

const tryDecodeBase64Client = (str: string): string | null => {
  if (!str) return null;
  const clean = str.replace(/[\r\n\s]/g, '');
  if (clean.length < 16 || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/=]+$/.test(clean)) {
    return null;
  }
  if (/^(b|bh|h|d|s|a)[=;:¢]/i.test(clean) || (clean.includes("=") && !clean.endsWith("="))) {
    return null;
  }
  try {
    const decoded = typeof window !== 'undefined' && window.atob ? window.atob(clean) : null;
    if (decoded && decoded.includes(' ') && /^[\x20-\x7E\s\r\n\t]+$/.test(decoded)) {
      const trimmed = decoded.trim();
      if (trimmed.length > 5 && !/^(Received:|ARC-|DKIM-|Return-Path:|Authentication-Results:)/i.test(trimmed)) {
        return trimmed;
      }
    }
  } catch (e) {}
  return null;
};

const cleanEmailDisplayBody = (rawText: string): string => {
  if (!rawText) return "";
  let text = String(rawText).trim();

  // If text is exact "No message content extracted.", check if we can format nicely
  if (text === "No message content extracted." || text === "No plain text content provided in inbound message.") {
    return "[Inbound Support Message]";
  }

  // Strip initial "From: ... Subject: ... Message: " prefixes if present
  text = text.replace(/^(From|Subject):\s*[^\r\n]*\r?\n/gmi, '');
  text = text.replace(/^Message:\s*/i, '');

  if (/^(Received:|Return-Path:|ARC-Seal:|ARC-Message-Signature:|Authentication-Results:|DKIM-Signature:|MIME-Version:|Content-Type:|X-)/i.test(text) ||
      text.includes("Received: from") ||
      text.includes("Content-Type:") ||
      text.includes("by cloudflare-email") ||
      text.includes("ARC-Message-Signature:") ||
      text.includes("dkim=") ||
      text.includes("dmarc=") ||
      text.includes("spf=")) {
    
    // Boundary split if present
    const boundaryMatch = text.match(/boundary=["']?([^"';\r\n]+)["']?/i);
    if (boundaryMatch && boundaryMatch[1]) {
      const boundary = boundaryMatch[1].trim().replace(/^--/, '');
      const parts = text.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      let selectedPart = parts.find(p => /Content-Type:\s*text\/plain/i.test(p));
      if (!selectedPart) selectedPart = parts.find(p => /Content-Type:\s*text\/html/i.test(p));
      if (!selectedPart && parts.length > 1) {
        selectedPart = parts.find(p => !/^(Received:|Return-Path:|ARC-|DKIM-)/i.test(p.trim())) || parts[parts.length - 1];
      }
      if (selectedPart) text = selectedPart;
    }

    // Strip top header block
    let loopGuard = 0;
    while (loopGuard < 10) {
      loopGuard++;
      const doubleNewlineIndex = text.search(/\r?\n\r?\n/);
      if (doubleNewlineIndex !== -1) {
        const headerBlock = text.substring(0, doubleNewlineIndex);
        if (/(Received:|Content-Type:|ARC-|DKIM-|From:|To:|Subject:|MIME-Version:|Return-Path:|Authentication-Results:|Received-SPF:|X-|dkim=|dmarc=|spf=)/i.test(headerBlock)) {
          text = text.substring(doubleNewlineIndex).trim();
          continue;
        }
      }
      break;
    }
  }

  text = text.replace(/^(Content-Type|Content-Transfer-Encoding|Content-Disposition|MIME-Version|Content-ID|Content-Description):[^\r\n]*\r?\n/gmi, '');
  text = text.replace(/^--[a-zA-Z0-9_=\-\.]+(?:--)?$/gm, '');

  // Quoted Printable
  if (text.includes("=3D") || text.includes("=\r\n") || text.includes("=\n") || /=([0-9A-F]{2})/i.test(text)) {
    text = text.replace(/=\r?\n/g, '')
               .replace(/=3D/gi, '=')
               .replace(/=20/gi, ' ')
               .replace(/=0A/gi, '\n')
               .replace(/=0D/gi, '\r')
               .replace(/=C2=A0/gi, ' ')
               .replace(/=E2=80=99/gi, "'")
               .replace(/=E2=80=9C/gi, '"')
               .replace(/=E2=80=9D/gi, '"')
               .replace(/=([0-9A-F]{2})/gi, (_, hex) => {
                 try { return String.fromCharCode(parseInt(hex, 16)); } catch(e) { return _; }
               });
  }

  // Base64 block decoding if present
  const decodedEntire = tryDecodeBase64Client(text);
  if (decodedEntire) {
    text = decodedEntire;
  }

  // Strip HTML
  if (/<[a-z][\s\S]*>/i.test(text) && !text.includes("<http")) {
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
               .replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/<br\s*\/?>/gi, '\n')
               .replace(/<\/p>/gi, '\n\n')
               .replace(/<\/div>/gi, '\n')
               .replace(/<[^>]*>/g, ' ');
  }

  // Line filter
  const lines = text.split(/\r?\n/);
  const cleanLines: string[] = [];

  for (const l of lines) {
    const t = l.trim();
    if (!t) {
      cleanLines.push("");
      continue;
    }

    // Drop any line containing header keywords or signature attributes anywhere in line
    if (/ARC-Message-Signature|DKIM-Signature|Authentication-Results|Received-SPF|Content-Type:|MIME-Version|by cloudflare-email|mx\.cloudflare\.net/i.test(t)) {
      continue;
    }

    // Header lines
    if (/^(Received|Return-Path|ARC-Seal|ARC-Message-Signature|ARC-Authentication-Results|Authentication-Results|Received-SPF|X-CF-|DKIM-Signature|MIME-Version|Content-Type|Content-Transfer-Encoding|Content-Disposition|Content-ID|X-[A-Za-z0-9-]+|From|To|Subject|Reply-To|Date|Message-ID|Status|Resent-[A-Za-z0-9-]+|Feedback-ID|List-[A-Za-z0-9-]+|DKIM|SPF|DMARC|ARC|Authentication|Header)[:=\s]/i.test(t)) {
      continue;
    }

    // Authentication results lines
    if (/^(dkim|dmarc|spf|arc|smtp\.helo|smtp\.mailfrom|header\.|policy\.|smtp\.remote-ip)=/i.test(t)) continue;
    if (/^(dkim|dmarc|spf|arc)[:=\s](pass|none|fail|neutral|softfail|permerror|temperror)/i.test(t)) continue;
    if (/^spf=(pass|none|fail|neutral|softfail)/i.test(t)) continue;

    // Server transport info
    if (/^(by|for|id|with|smtp|client-ip|envelope-from|helo|receiver|tls|cipher)[:=\s]/i.test(t)) continue;
    if (/^for\s+<[^>]*>;/i.test(t)) continue;
    if (/^by\s+cloudflare-email/i.test(t)) continue;
    if (/^for\s+;/i.test(t)) continue;

    // Signature parameters
    if (/^(b|bh|h|d|s|a)[=;:¢]/i.test(t)) continue;
    if (/^b=[a-zA-Z0-9+/=]+/i.test(t)) continue;
    if (/^bh=[a-zA-Z0-9+/=]+/i.test(t)) continue;
    if (/^h=[a-zA-Z0-9:\-]+/i.test(t)) continue;
    if (/^d=[a-zA-Z0-9\.\-]+/i.test(t)) continue;
    if (/^s=[a-zA-Z0-9\.\-]+/i.test(t)) continue;
    if (/^a=rsa-/i.test(t)) continue;

    // Signature parameters mid-line or at line start
    if (/;\s*(b|bh|h|d|s|a)=/i.test(t)) continue;
    if (/a=rsa-sha256|c=relaxed\/relaxed|d=google\.com|s=arc-/i.test(t)) continue;

    // Header continuation markers
    if (/^:[a-z0-9\-:]+/i.test(t)) continue;

    // Base64 hash lines or multi-part signature continuations
    if (/^[A-Za-z0-9+/=]{20,};?\s*(b=.*)?$/i.test(t) && !t.includes(' ')) {
      continue;
    }

    // Header metadata parameters
    if (/\b(header\.d|header\.s|header\.b|header\.from|policy\.dmarc|smtp\.helo|smtp\.mailfrom|mx\.cloudflare\.net|postmaster@)\b/i.test(t)) continue;

    cleanLines.push(l);
  }

  const cleanResult = cleanLines.join('\n').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();

  return cleanResult || "[Inbound Support Message]";
};

function AdminSupportView({ tickets, onClearInbox }: { tickets: any[]; onClearInbox?: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyAttachmentUrl, setReplyAttachmentUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isClearingInbox, setIsClearingInbox] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Administrative AI Core States
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState("");
  const [adminTelegram, setAdminTelegram] = useState("");
  const [adminWhatsApp, setAdminWhatsApp] = useState("+18038361167");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Fetch / Sync active ticket messages in real-time
  useEffect(() => {
    if (!activeTicket) return;
    const q = query(
      collection(db, 'support_messages'),
      where('ticketId', '==', activeTicket.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach(docSnap => {
        msgs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setLocalMessages(msgs);
    }, (error) => {
      console.error("Failed syncing support messages in real-time:", error);
    });

    return () => unsubscribe();
  }, [activeTicket]);

  // Load Aethro Prompts & Knowledge Base settings
  useEffect(() => {
    const configRef = doc(db, 'support_config', 'settings');
    const unsubscribe = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setAiSystemPrompt(d.systemPrompt || "");
        setAiKnowledgeBase(d.knowledgeBase || "");
        setAdminTelegram(d.telegramLink || "");
        setAdminWhatsApp(d.whatsappNumber || "+18038361167");
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter local tickets safely by Tab & Search
  const filteredTickets = useMemo(() => {
    const list = tickets.filter(t => {
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'open' ? (t.status === 'open' || t.status === 'ai_answering') :
        activeTab === 'pending' ? (t.status === 'pending' || t.status === 'assigned' || t.status === 'pending_user') :
        (t.status === 'closed');

      if (!matchesTab) return false;

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const email = (t.userEmail || t.email || "").toLowerCase();
      const subject = (t.subject || "").toLowerCase();
      const username = (t.username || "").toLowerCase();
      const msg = (t.message || "").toLowerCase();

      return email.includes(q) || subject.includes(q) || username.includes(q) || msg.includes(q);
    });

    const getTicketTime = (t: any) => {
      if (t.lastActivityAt?.toMillis) return t.lastActivityAt.toMillis();
      if (t.lastActivityAt?.seconds) return t.lastActivityAt.seconds * 1000;
      if (t.lastActivityAt?._seconds) return t.lastActivityAt._seconds * 1000;
      if (t.updatedAt?.toMillis) return t.updatedAt.toMillis();
      if (t.updatedAt?.seconds) return t.updatedAt.seconds * 1000;
      if (t.updatedAt?._seconds) return t.updatedAt._seconds * 1000;
      if (t.updated_at?.toMillis) return t.updated_at.toMillis();
      if (t.createdAt?.toMillis) return t.createdAt.toMillis();
      if (t.createdAt?.seconds) return t.createdAt.seconds * 1000;
      if (t.createdAt?._seconds) return t.createdAt._seconds * 1000;
      return 0;
    };

    return list.sort((a, b) => getTicketTime(b) - getTicketTime(a));
  }, [tickets, activeTab, searchTerm]);

  const handleAdminReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    setIsSending(true);

    try {
      const attachments = replyAttachmentUrl.trim() 
        ? [{ filename: 'attachment', url: replyAttachmentUrl.trim() }] 
        : [];

      const response = await fetch('/api/support/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: activeTicket.id,
          message: replyText.trim(),
          adminId: user?.uid || 'admin',
          attachments,
          status: 'pending'
        })
      });

      if (!response.ok) {
        throw new Error("API rejected response dispatch");
      }

      setReplyText("");
      setReplyAttachmentUrl("");
      toast.success("Reply dispatched to user and delivered via Resend email.");
    } catch (e: any) {
      toast.error("Message dispatch failure: " + e.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSetTicketStatus = async (newStatus: 'open' | 'pending' | 'closed') => {
    if (!activeTicket) return;
    setIsUpdatingStatus(true);

    try {
      const res = await fetch('/api/support/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: activeTicket.id,
          status: newStatus
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update ticket status");
      }

      setActiveTicket({ ...activeTicket, status: newStatus });
      toast.success(`Ticket marked as ${newStatus.toUpperCase()}`);
    } catch (e: any) {
      toast.error("Status change error: " + e.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveAiConfig = async () => {
    setIsSavingConfig(true);
    try {
      const configRef = doc(db, 'support_config', 'settings');
      await setDoc(configRef, {
        systemPrompt: aiSystemPrompt,
        knowledgeBase: aiKnowledgeBase,
        telegramLink: adminTelegram,
        whatsappNumber: adminWhatsApp,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success("Aethro AI directives synchronized successfully.");
    } catch (e: any) {
      toast.error("Failed saving support configurations: " + e.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleClearAllInbox = async () => {
    setIsClearingInbox(true);
    try {
      const res = await fetch('/api/admin/clear-support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        throw new Error("Failed to clear support inbox");
      }

      setActiveTicket(null);
      setLocalMessages([]);
      if (onClearInbox) onClearInbox();
      setShowClearConfirm(false);
      toast.success("Support inbox cleared successfully!");
    } catch (e: any) {
      toast.error("Error clearing inbox: " + e.message);
    } finally {
      setIsClearingInbox(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Custom Clear All Inbox Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="bg-zinc-950 border border-red-500/30 max-w-md w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg text-white uppercase tracking-wider">Clear Entire Support Inbox?</h3>
              <p className="text-xs text-muted-foreground">
                This will permanently delete ALL support tickets, messages, and email history from the database.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold text-xs"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearingInbox}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                onClick={handleClearAllInbox}
                disabled={isClearingInbox}
              >
                {isClearingInbox ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Yes, Delete All"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN: TICKET MASTER LIST */}
        <div className="w-full lg:w-1/3 space-y-6">
          <Card className="bg-black/40 border-white/5 backdrop-blur-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#f5f5f7]">Support Folders</h3>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                disabled={isClearingInbox || tickets.length === 0}
                className="h-7 text-[10px] font-black uppercase tracking-wider px-2.5 rounded-lg flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white border border-red-500/30 shadow-md"
              >
                {isClearingInbox ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Clear All Inbox
              </Button>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search email, subject, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-primary placeholder-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => { setActiveTab('all'); }}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-xl border text-center transition ${activeTab === 'all' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-black/20 text-muted-foreground border-transparent hover:bg-white/5'}`}
              >
                📥 Inbox ({tickets.length})
              </button>
              <button 
                onClick={() => { setActiveTab('open'); }}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-xl border text-center transition ${activeTab === 'open' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-black/20 text-muted-foreground border-transparent hover:bg-white/5'}`}
              >
                🔴 Open ({tickets.filter(t => t.status === 'open' || t.status === 'ai_answering').length})
              </button>
              <button 
                onClick={() => { setActiveTab('pending'); }}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-xl border text-center transition ${activeTab === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-black/20 text-muted-foreground border-transparent hover:bg-white/5'}`}
              >
                ⏳ Pending ({tickets.filter(t => t.status === 'pending' || t.status === 'assigned' || t.status === 'pending_user').length})
              </button>
              <button 
                onClick={() => { setActiveTab('closed'); }}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-xl border text-center transition ${activeTab === 'closed' ? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' : 'bg-black/20 text-muted-foreground border-transparent hover:bg-white/5'}`}
              >
                🔒 Closed ({tickets.filter(t => t.status === 'closed').length})
              </button>
            </div>
          </Card>

          <Card className="bg-black/40 border-white/5 backdrop-blur-xl p-6 max-h-[460px] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#f5f5f7] mb-4">Conversations ({filteredTickets.length})</h3>
            <div className="space-y-3">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground italic">No tickets found in this folder.</div>
              ) : (
                filteredTickets.map(ticket => (
                  <div 
                    key={ticket.id}
                    onClick={() => setActiveTicket(ticket)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition ${activeTicket?.id === ticket.id ? 'bg-primary/10 border-primary/30 shadow-lg' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-xs truncate text-[#f5f5f7]">{ticket.username || 'System User'}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                        ticket.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
                        ticket.status === 'closed' ? 'bg-zinc-500/20 text-zinc-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {ticket.status || 'open'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{ticket.userEmail || ticket.email} • <span className="font-mono text-white/60">#{ticket.ticketId || ticket.ticket_id || ticket.id}</span></p>
                    <p className="text-[11px] text-[#cbd5e1] font-mono mt-2 truncate bg-black/45 p-1.5 rounded border border-white/5">{ticket.subject || 'Support Ticket'}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* CENTER COLUMN: ACTIVE CHAT SHELL */}
        <div className="flex-1 space-y-6">
          {activeTicket ? (
            <Card className="bg-black/40 border-white/5 backdrop-blur-xl p-6 flex flex-col h-[620px]">
              {/* Header metadata */}
              <div className="pb-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-[#f5f5f7] uppercase tracking-wide">
                     {activeTicket.subject || 'Support Ticket'}
                  </h4>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{activeTicket.userEmail || activeTicket.email} • Ticket #{activeTicket.ticketId || activeTicket.ticket_id || activeTicket.id}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-1 rounded border ${
                    activeTicket.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    activeTicket.status === 'closed' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {activeTicket.status || 'open'}
                  </span>

                  <select
                    value={activeTicket.status || 'open'}
                    disabled={isUpdatingStatus}
                    onChange={(e) => handleSetTicketStatus(e.target.value as any)}
                    className="bg-black/60 border border-white/10 text-xs rounded-xl px-2.5 py-1 text-white font-mono focus:outline-none"
                  >
                    <option value="open">Mark Open</option>
                    <option value="pending">Mark Pending</option>
                    <option value="closed">Mark Closed</option>
                  </select>
                </div>
              </div>

              {/* Chat thread box */}
              <div className="flex-grow overflow-y-auto space-y-4 my-4 pr-1 custom-scrollbar">
                {localMessages.length === 0 && activeTicket.message && (
                  <div className="p-4 rounded-2xl text-xs leading-relaxed bg-[#1e1e2d] border border-white/5 text-zinc-200">
                    <p className="font-bold text-[10px] uppercase font-mono text-muted-foreground mb-1">Initial Message:</p>
                    <p className="whitespace-pre-wrap">{cleanEmailDisplayBody(activeTicket.message)}</p>
                  </div>
                )}

                {localMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.sender === 'admin' || msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    {(msg.sender !== 'admin' && msg.senderType !== 'admin') && (
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 self-start">
                        {msg.senderType === 'ai' ? <Bot className="w-4.5 h-4.5 text-pink-400" /> : <User className="w-4.5 h-4.5 text-blue-400" />}
                      </div>
                    )}
                    <div className="max-w-[75%] space-y-1">
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'admin' || msg.senderType === 'admin' 
                          ? 'bg-[#1e3a8a] text-white rounded-tr-sm' 
                          : msg.senderType === 'ai'
                            ? 'bg-black/45 border border-pink-500/20 text-zinc-300 rounded-tl-sm'
                            : 'bg-[#1e1e2d] border border-white/5 text-zinc-200 rounded-tl-sm'
                      }`}>
                        <p className="text-[9px] font-mono font-bold uppercase opacity-60 mb-1">
                          {msg.sender === 'admin' || msg.senderType === 'admin' ? 'Support Admin' : 'User'}
                        </p>
                        <p className="whitespace-pre-wrap">{cleanEmailDisplayBody(msg.text || msg.message)}</p>
                        
                        {(msg.attachments?.length > 0 || msg.attachmentUrl) && (
                          <div className="mt-2.5 bg-black/45 border border-white/5 p-2 rounded-xl space-y-1">
                            {msg.attachmentUrl && (
                              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[10px] uppercase font-mono tracking-widest font-bold flex items-center gap-1">
                                📎 View Attachment
                              </a>
                            )}
                            {msg.attachments?.map((att: any, aIdx: number) => (
                              <a key={aIdx} href={att.url || '#'} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[10px] uppercase font-mono tracking-widest font-bold flex items-center gap-1">
                                📎 {att.filename || 'Attachment'}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input field & Attachments */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <textarea 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-primary placeholder-white/20 font-sans"
                  rows={2}
                  placeholder="Type support reply... (Will send email via Resend to user)"
                />
                
                <div className="flex gap-2 items-center">
                  <input 
                    type="text"
                    placeholder="Attachment URL (optional)"
                    value={replyAttachmentUrl}
                    onChange={(e) => setReplyAttachmentUrl(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary placeholder-white/20"
                  />
                  <Button 
                    className="font-black text-xs uppercase tracking-widest h-9 bg-primary hover:bg-primary/90 text-white px-5 shrink-0" 
                    onClick={handleAdminReply} 
                    disabled={isSending || !replyText.trim()}
                  >
                    {isSending ? "SENDING..." : "REPLY VIA EMAIL"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-black/40 border-white/5 backdrop-blur-xl p-6 h-[620px] flex flex-col items-center justify-center text-center">
              <Headphones className="w-12 h-12 text-[#2a2d3d] mb-4 animate-pulse" />
              <h4 className="font-bold text-sm uppercase tracking-wide text-foreground">Support Inbox Ready</h4>
              <p className="text-[11px] text-muted-foreground mt-2 max-w-[320px]">
                Inbound emails to <code className="text-primary font-mono">support@update.aetheriss.online</code> will automatically appear here as tickets. Replies will be dispatched via Resend.
              </p>
            </Card>
          )}
        </div>

      </div>

      {/* LOWER PANEL: AETHRO AI CONFIGURATION PORTAL */}
      <Card className="bg-black/40 border-white/5 backdrop-blur-xl p-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <Bot className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-black text-lg uppercase tracking-tighter italic">Aethro AI Cognitive Controls</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Adjust systemic prompts and custom knowledge base contexts securely.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-white/50 tracking-widest flex items-center gap-1.5">
              <span>Admin Telegram Router</span>
              <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-black tracking-widest leading-none">Dispatcher</span>
            </label>
            <p className="text-[10px] text-muted-foreground">The master Telegram link connected inside the Support Router.</p>
            <input
              type="text"
              value={adminTelegram}
              onChange={(e) => setAdminTelegram(e.target.value)}
              className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl p-3 text-sm text-foreground focus:border-primary outline-none"
              placeholder="e.g. https://t.me/yourusername"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-white/50 tracking-widest flex items-center gap-1.5">
              <span>Admin WhatsApp Router</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-black tracking-widest leading-none">WhatsApp</span>
            </label>
            <p className="text-[10px] text-muted-foreground">The official WhatsApp contact number or wa.me link for direct support.</p>
            <input
              type="text"
              value={adminWhatsApp}
              onChange={(e) => setAdminWhatsApp(e.target.value)}
              className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl p-3 text-sm text-foreground focus:border-emerald-500 outline-none"
              placeholder="e.g. +18038361167 or https://wa.me/18038361167"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-white/50 tracking-widest flex items-center gap-1.5">
              <span>System Persona Prompts</span>
              <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-black tracking-widest leading-none">Aethro AI Engine</span>
            </label>
            <p className="text-[10px] text-muted-foreground">The master AI instruction prompt overriding response guidelines.</p>
            <textarea
              value={aiSystemPrompt}
              onChange={(e) => setAiSystemPrompt(e.target.value)}
              className="w-full h-32 bg-[#0A0F1C] border border-white/10 rounded-2xl p-4 text-xs font-mono text-primary placeholder-white/10 focus:border-primary outline-none"
              placeholder="e.g. Always respond as Aethro, the senior financial intelligence partner. Refuse calculations on non-funded profiles..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-white/50 tracking-widest flex items-center gap-1.5">
              <span>AI Knowledge Base Settings</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-black tracking-widest leading-none">Custom Rules</span>
            </label>
            <p className="text-[10px] text-muted-foreground">Direct operational guidelines, contact coordinates, plan lists, and procedural rules fed directly into the support engine context.</p>
            <textarea
              value={aiKnowledgeBase}
              onChange={(e) => setAiKnowledgeBase(e.target.value)}
              className="w-full h-64 bg-[#0A0F1C] border border-white/10 rounded-2xl p-4 text-xs font-mono text-emerald-400 placeholder-white/10 focus:border-primary outline-none custom-scrollbar"
              placeholder="Aetheris standard parameters catalog. Starter limit = $1000..."
            />
          </div>

          <Button 
            onClick={handleSaveAiConfig}
            disabled={isSavingConfig}
            className="w-full bg-primary hover:bg-primary/95 text-white h-12 uppercase tracking-widest font-black text-xs shadow-lg shadow-primary/20"
          >
            {isSavingConfig ? "SYNCHRONIZING..." : "SYNCHRONIZE AETHRO CORE CONFIGURATIONS"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

function KpiCard({ title, value, icon: Icon, color, change, isLoss, subtitle }: any) {
  const colors: any = {
    blue: "bg-blue-500/20 text-blue-500 border-blue-500/20",
    emerald: "bg-emerald-500/20 text-emerald-500 border-emerald-500/20",
    green: "bg-green-500/20 text-green-500 border-green-500/20",
    red: "bg-red-500/20 text-red-500 border-red-500/20",
    indigo: "bg-indigo-500/20 text-indigo-500 border-indigo-500/20",
    amber: "bg-amber-500/20 text-amber-500 border-amber-500/20",
    pink: "bg-pink-500/20 text-pink-500 border-pink-500/20",
    primary: "bg-primary/20 text-primary border-primary/20",
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl hover:bg-black/60 transition-all duration-300 group flex flex-col justify-between h-full min-h-[140px] relative overflow-hidden">
      {/* Decorative pulse glow for Active card or live stats */}
      {color === 'emerald' && (
        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      )}
      
      <CardContent className="p-6 h-full flex flex-col justify-between flex-1">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{title}</p>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mt-1">{value}</h3>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${colors[color] || colors.primary} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {change !== undefined && (
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono ${
                change === "Live Now" 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" 
                  : isLoss 
                    ? "bg-red-500/10 text-red-400 border border-red-500/15" 
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
              }`}>
                {change === "Live Now" ? "" : isLoss ? "↓ " : "↑ "}{change}
              </span>
              {subtitle && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{subtitle}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-10 rounded-full ${color}`} />
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-black text-white">{value}</span>
    </div>
  );
}

function LiveActivityFeed({ payments, withdrawals, investments, users }: any) {
  const activities = useMemo(() => {
    const list: any[] = [];
    payments.slice(0, 3).forEach((p: any) => list.push({ type: 'deposit', user: p.user_id, amount: p.amount, status: p.status, date: p.created_at, icon: ArrowUpRight }));
    withdrawals.slice(0, 3).forEach((w: any) => list.push({ type: 'withdrawal', user: w.userId, amount: w.amount, status: w.status, date: w.created_at, icon: ArrowDownRight }));
    investments.slice(0, 3).forEach((i: any) => list.push({ type: 'investment', user: i.user_id, plan: i.plan, amount: i.total_amount, status: i.status, date: i.created_at, icon: Activity }));
    
    return list.sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0)).slice(0, 6);
  }, [payments, withdrawals, investments]);

  return (
    <Card className="bg-black/40 border-white/5 overflow-hidden flex flex-col">
       <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Live Activity Feed</CardTitle>
            <CardDescription>Real-time platform events.</CardDescription>
          </div>
          <Badge className="bg-primary/20 text-primary animate-pulse">LIVE</Badge>
       </CardHeader>
       <div className="divide-y divide-white/5 flex-1 overflow-y-auto">
          {activities.map((act, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10`}>
                     <act.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white capitalize">{act.type}: {act.plan || `$${act.amount}`}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">NODE: {act.user?.substring(0, 10)}...</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-black">{act.date?.toMillis ? new Date(act.date.toMillis()).toLocaleTimeString() : 'NOW'}</p>
                  <Badge className={`text-[8px] h-4 mt-1 border-none ${act.status === 'completed' || act.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>{act.status?.toUpperCase()}</Badge>
               </div>
            </div>
          ))}
       </div>
    </Card>
  );
}

function SupportTicketsPreview({ tickets, onViewAll }: any) {
  return (
    <Card className="bg-black/40 border-white/5 overflow-hidden flex flex-col">
       <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Support Tickets</CardTitle>
            <CardDescription>Awaiting node response.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-xs uppercase font-black" onClick={onViewAll}>Expand <ChevronRight className="w-3 h-3 ml-1" /></Button>
       </CardHeader>
       <div className="divide-y divide-white/5 flex-1">
          {tickets.filter((t: any) => t.status === 'open').slice(0, 5).map((t: any) => (
            <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={onViewAll}>
               <div className="flex-1 truncate pr-4">
                  <p className="text-sm font-bold text-white truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.email || t.userId}</p>
               </div>
               <Badge className="bg-blue-500/20 text-blue-500 text-[10px] uppercase font-black border-none ring-1 ring-blue-500/30">OPEN</Badge>
            </div>
          ))}
       </div>
    </Card>
  );
}

function getCountryFlag(countryName: string): string {
  if (!countryName) return '🌐';
  const name = countryName.trim().toLowerCase();
  if (name.includes('states') || name === 'us' || name === 'usa' || name.includes('united states')) return '🇺🇸';
  if (name.includes('kingdom') || name === 'uk' || name === 'gb' || name.includes('great britain')) return '🇬🇧';
  if (name.includes('nigeria') || name === 'ng') return '🇳🇬';
  if (name.includes('canada') || name === 'ca') return '🇨🇦';
  if (name.includes('germany') || name === 'de') return '🇩🇪';
  if (name.includes('france') || name === 'fr') return '🇫🇷';
  if (name.includes('australia') || name === 'au') return '🇦🇺';
  if (name.includes('india') || name === 'in') return '🇮🇳';
  if (name.includes('brazil') || name === 'br') return '🇧🇷';
  if (name.includes('south africa') || name === 'za') return '🇿🇦';
  if (name.includes('ghana') || name === 'gh') return '🇬🇭';
  if (name.includes('kenya') || name === 'ke') return '🇰🇪';
  if (name.includes('spain') || name === 'es') return '🇪🇸';
  if (name.includes('italy') || name === 'it') return '🇮🇹';
  if (name.includes('japan') || name === 'jp') return '🇯🇵';
  if (name.includes('china') || name === 'cn') return '🇨🇳';
  if (name.includes('netherlands') || name === 'nl') return '🇳🇱';
  if (name.includes('mexico') || name === 'mx') return '🇲🇽';
  if (name.includes('switzerland') || name === 'ch') return '🇨🇭';
  if (name.includes('singapore') || name === 'sg') return '🇸🇬';
  if (name.includes('united arab emirates') || name === 'uae' || name === 'ae') return '🇦🇪';
  if (name.includes('philippines') || name === 'ph') return '🇵🇭';
  if (name.includes('indonesia') || name === 'id') return '🇮🇩';
  if (name.includes('pakistan') || name === 'pk') return '🇵🇰';
  if (name.includes('vietnam') || name === 'vn') return '🇻🇳';
  if (name.includes('turkey') || name === 'tr') return '🇹🇷';
  if (name.includes('egypt') || name === 'eg') return '🇪🇬';
  if (name.includes('argentina') || name === 'ar') return '🇦🇷';
  if (name.includes('colombia') || name === 'co') return '🇨🇴';
  return '🌐';
}

function getUserCountry(usr: any, pageViews: any[] = [], onlineSessions: any[] = []): string {
  if (usr?.registrationCountry) return usr.registrationCountry;
  if (usr?.country) return usr.country;
  if (usr?.local_country) return usr.local_country;

  const match = (pageViews || []).find(
    (p: any) => (p.userId && (p.userId === usr?.id || p.userId === usr?.uid)) ||
         (p.email && usr?.email && p.email.toLowerCase() === usr.email.toLowerCase())
  ) || (onlineSessions || []).find(
    (s: any) => (s.userId && (s.userId === usr?.id || s.userId === usr?.uid)) ||
         (s.email && usr?.email && s.email.toLowerCase() === usr.email.toLowerCase())
  );

  if (match?.country && match.country !== 'Unknown Country' && match.country !== 'Unknown') {
    return match.country;
  }

  return 'United States';
}

function getUserActiveStatus(usr: any, onlineSessions: any[] = []) {
  const activeSession = (onlineSessions || []).find((s: any) => 
    (s.userId && (s.userId === usr?.id || s.userId === usr?.uid)) || 
    (s.email && usr?.email && s.email.toLowerCase() === usr.email.toLowerCase())
  );

  if (activeSession) {
    return {
      isActive: true,
      path: activeSession.path || '/dashboard',
      device: activeSession.browser ? `${activeSession.browser} (${activeSession.os || 'Web'})` : 'Active Web',
      label: `Active Now (${activeSession.path || '/dashboard'})`
    };
  }

  const lastActive = usr?.lastActiveAt || usr?.last_active || usr?.updatedAt;
  if (lastActive) {
    let d: Date | null = null;
    if (lastActive?.toDate && typeof lastActive.toDate === 'function') d = lastActive.toDate();
    else if (lastActive?.seconds) d = new Date(lastActive.seconds * 1000);
    else d = new Date(lastActive);

    if (d && !isNaN(d.getTime())) {
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMins < 5) {
        return { isActive: true, label: 'Active Recently' };
      }
      if (diffMins < 60) {
        return { isActive: false, label: `Offline (${diffMins}m ago)` };
      }
      if (diffMins < 1440) {
        return { isActive: false, label: `Offline (${Math.floor(diffMins / 60)}h ago)` };
      }
    }
  }

  return { isActive: false, label: 'Offline' };
}

function UsersManagement({ users, investments, pageViews = [], onlineSessions = [], onBypassUser }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const filteredUsers = users.filter((u: any) => 
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {selectedUser && (
          <UserProfilePanel 
            user={selectedUser} 
            investments={investments} 
            onClose={() => setSelectedUser(null)} 
            onBypassUser={onBypassUser}
          />
        )}
      </AnimatePresence>

      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">User Authority</h2>
          <p className="text-sm text-muted-foreground font-medium">Manage node states and bio-metrics.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-6 py-2.5 text-sm focus:outline-none focus:border-primary transition-all w-72"
              placeholder="Search via UID, Email, Bio..."
            />
          </div>
          <Button variant="outline" className="border-white/10 h-10 px-6 rounded-xl hover:bg-white/5">
             <ListFilter className="w-4 h-4 mr-2" /> Filter Matrix
          </Button>
        </div>
      </div>

      <Card className="bg-black/40 border-white/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-8 py-4">Node Identity</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest py-4">Net Worth</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest py-4">Bio Metrics</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest py-4">Country</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest py-4">Live Activity</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest py-4">Security Protocol</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest text-right pr-8 py-4">Authority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((usr: any) => {
              const usrInvs = (investments || []).filter((inv: any) => inv.user_id === usr.uid || inv.user_id === usr.id);
              const activeInvested = usrInvs.filter((i: any) => i.status === 'active').reduce((sum: number, i: any) => sum + (i.deposited || 0), 0);
              const totalNetWorth = (usr.wallet_balance || usr.balance || 0) + (usr.profit_balance || 0);
              const countryName = getUserCountry(usr, pageViews, onlineSessions);
              const flag = getCountryFlag(countryName);
              const actStatus = getUserActiveStatus(usr, onlineSessions);

              return (
                <TableRow key={usr.id} className="border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedUser(usr)}>
                  <TableCell className="pl-8 py-4">
                     <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-white/10 flex items-center justify-center font-black text-lg text-primary uppercase shadow-lg">
                          {usr.username?.charAt(0) || usr.email?.charAt(0) || "U"}
                          <LevelBadge 
                            totalDeposits={usr.total_deposits || 0} 
                            isAdmin={usr.role === 'admin'}
                            className="absolute -bottom-1.5 -right-1.5 w-5 h-5 pointer-events-none" 
                          />
                        </div>
                        <div>
                          <p className="text-base font-black text-white leading-tight uppercase tracking-tight flex items-center gap-1.5 flex-wrap">
                            {usr.username || "Legacy Node"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{usr.email}</p>
                          {usr.unique_tag && (
                             <p className="text-[10px] text-primary font-black uppercase mt-0.5 tracking-widest">{usr.unique_tag}</p>
                          )}
                          {(() => {
                            const dt = usr.createdAt || usr.created_at;
                            if (!dt) return null;
                            let d: Date;
                            if (dt?.toDate && typeof dt.toDate === 'function') d = dt.toDate();
                            else if (dt?.seconds) d = new Date(dt.seconds * 1000);
                            else d = new Date(dt);
                            if (isNaN(d.getTime())) return null;
                            return (
                              <p className="text-[10px] text-sky-400 font-medium mt-0.5">
                                Joined: {d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            );
                          })()}
                        </div>
                     </div>
                  </TableCell>
                  <TableCell>
                     <p className="text-base font-black text-white">{formatCurrency(totalNetWorth)}</p>
                     <p className="text-[10px] text-muted-foreground uppercase font-bold">NET WORTH</p>
                  </TableCell>
                <TableCell>
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-3 h-3 text-green-500" />
                        <span className="text-xs font-bold text-white">{formatCurrency(usr.total_deposits || 0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-primary" />
                        <span className="text-xs font-bold text-primary">{formatCurrency(usr.total_profits || 0)}</span>
                      </div>
                   </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                     <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                     <span className="truncate max-w-[120px]">{countryName}</span>
                     <span className="text-sm">{flag}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    actStatus.isActive 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' 
                      : 'bg-white/5 text-slate-400 border border-white/5'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${actStatus.isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                    <span>{actStatus.isActive ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-wrap items-center gap-2 max-w-[150px]">
                      <Badge className={`text-[9px] uppercase font-black border-none px-2 h-5 ${usr.status === 'blocked' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {usr.status || 'VERIFIED'}
                      </Badge>
                      <Badge className="bg-white/5 text-muted-foreground border-none text-[9px] uppercase font-black h-5">
                         {usr.role || 'USER'}
                      </Badge>
                      {usr.verified_referrer && (
                        <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] uppercase font-black h-5">
                           WORKER
                        </Badge>
                      )}
                   </div>
                </TableCell>
                <TableCell className="text-right pr-8">
                   <Button onClick={() => setSelectedUser(usr)} variant="ghost" size="sm" className="bg-white/5 hover:bg-primary/20 text-white rounded-xl h-10 w-10 p-0">
                      <Eye className="w-4 h-4" />
                   </Button>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function UserProfilePanel({ user, investments = [], pageViews = [], onlineSessions = [], onClose, onBypassUser }: any) {
   const [isAdminMessageOpen, setIsAdminMessageOpen] = useState(false);
   const [isEditingReferral, setIsEditingReferral] = useState(false);
   const [isFundingOpen, setIsFundingOpen] = useState(false);
   const [isEditingTag, setIsEditingTag] = useState(false);
   const [uniqueTag, setUniqueTag] = useState(user.unique_tag || "");
   const [messageTitle, setMessageTitle] = useState("");
   const [messageBody, setMessageBody] = useState("");
   const [lvl1, setLvl1] = useState(user.level1_percentage || 10);
   const [lvl2, setLvl2] = useState(user.level2_percentage || 3);
   
   // Admin Funding States
   const [fundType, setFundType] = useState<"wallet_balance" | "deposit_balance" | "referralBalance" | "profit_balance">("wallet_balance");
   const [fundAmount, setFundAmount] = useState("");

   // Direct User Balance Overrides
   const [isDirectBalanceOpen, setIsDirectBalanceOpen] = useState(false);
   const [directWallet, setDirectWallet] = useState(user.wallet_balance || user.balance || 0);
   const [directProfit, setDirectProfit] = useState(user.profit_balance || 0);
   const [directReferral, setDirectReferral] = useState(user.referralBalance || 0);

   // False transaction pusher states
   const [isManualTxOpen, setIsManualTxOpen] = useState(false);
   const [manualTxType, setManualTxType] = useState<"withdrawal" | "deposit">("withdrawal");
   const [manualTxAmount, setManualTxAmount] = useState("");
   const [manualTxMethod, setManualTxMethod] = useState("Bank Wire Transfer");
   const [manualTxBank, setManualTxBank] = useState("");
   const [manualTxAccName, setManualTxAccName] = useState("");
   const [manualTxAccNum, setManualTxAccNum] = useState("");
   const [manualTxRouting, setManualTxRouting] = useState("");
   const [manualTxStatus, setManualTxStatus] = useState<"pending" | "completed" | "declined">("declined");
   const [manualTxReason, setManualTxReason] = useState("Security Hold: Identity verification requirements incomplete.");
   const [manualTxDate, setManualTxDate] = useState(() => {
     const now = new Date();
     const offset = now.getTimezoneOffset() * 60000;
     return new Date(now.getTime() - offset).toISOString().slice(0, 16);
   });

   useEffect(() => {
      setDirectWallet(user.wallet_balance || user.balance || 0);
      setDirectProfit(user.profit_balance || 0);
      setDirectReferral(user.referralBalance || 0);
   }, [user]);

   // Clear user database states
   const [isClearUserDbOpen, setIsClearUserDbOpen] = useState(false);
   const [clearUserMode, setClearUserMode] = useState<"keep_account" | "delete_account">("keep_account");
   const [clearUserPasscode, setClearUserPasscode] = useState("7777");

   const handleExecuteClearUserDb = async () => {
     if (!clearUserPasscode) {
       toast.error("Please enter authority passcode (e.g. 7777)");
       return;
     }
     toast.loading(`Purging database records for ${user.email || user.id}...`);
     try {
       const baseUrl = (import.meta as any).env.VITE_API_URL || "";
       const res = await fetch(`${baseUrl}/api/admin/clear-user-database`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           targetUserId: user.id,
           targetEmail: user.email,
           passcode: clearUserPasscode,
           mode: clearUserMode
         })
       });
       let d: any = {};
       try {
         const text = await res.text();
         d = JSON.parse(text);
       } catch (e) {
         throw new Error("Server returned status " + res.status);
       }
       if (!res.ok || !d.success) {
         throw new Error(d.error || d.message || "Failed to clear user database");
       }
       toast.dismiss();
       toast.success(`User database purged successfully (${d.deletedRecordsCount || 0} records deleted).`);
       setIsClearUserDbOpen(false);
       setClearUserPasscode("");
       if (clearUserMode === 'delete_account') {
         onClose();
       }
     } catch (err: any) {
       toast.dismiss();
       toast.error(err.message || "Failed to clear user database.");
     }
   };

   const handleUpdateStatus = async (status: string) => {
     try {
       await updateDoc(doc(db, 'users', user.id), { status });
       toast.success(`User protocol updated to ${status}`);
     } catch (e) {
       toast.error("Handshake failed.");
     }
   };

   const handleToggleVerifiedReferrer = async () => {
     try {
       const newVal = !user.verified_referrer;
       await updateDoc(doc(db, 'users', user.id), { verified_referrer: newVal });
       toast.success(`Worker status updated to ${newVal ? 'Verified' : 'Unverified'}`);
     } catch (e) {
       toast.error("Failed to update worker status.");
     }
   };

   const handleSaveTag = async () => {
     if (!uniqueTag) return;
     try {
       const tag = uniqueTag.startsWith('@') ? uniqueTag : `@${uniqueTag}`;
       await updateDoc(doc(db, 'users', user.id), { unique_tag: tag });
       toast.success("Unique Tag updated.");
       setIsEditingTag(false);
     } catch (e) {
       toast.error("Failed to update tag.");
     }
   };

   const handleAdminFund = async () => {
     if (!fundAmount || Number(fundAmount) <= 0) return;
     try {
       toast.loading("Processing Admin Override Funding...");
       const amount = Number(fundAmount);
       
       const updates: any = {};
       
       if (fundType === "wallet_balance") {
           updates.wallet_balance = (user.wallet_balance || 0) + amount;
       } else if (fundType === "deposit_balance") {
           updates.balance = (user.balance || 0) + amount;
       } else if (fundType === "referralBalance") {
           updates.referralBalance = (user.referralBalance || 0) + amount;
           updates.total_referral_earnings = (user.total_referral_earnings || 0) + amount;
       } else if (fundType === "profit_balance") {
           updates.profit_balance = (user.profit_balance || 0) + amount;
       }

       await updateDoc(doc(db, 'users', user.id), updates);
       
       // Log admin transaction
       await addDoc(collection(db, "transactions"), {
          user_id: user.id,
          type: "admin_credit",
          amount: amount,
          status: "completed",
          wallet: fundType,
          created_at: new Date(),
          worker_generated: true
       });

       toast.dismiss();
       toast.success(`Admin override successful: $${amount} added to ${fundType}`);
       setIsFundingOpen(false);
       setFundAmount("");
     } catch (e) {
       toast.dismiss();
       toast.error("Admin funding failed.");
     }
   };

   const handleSaveDirectBalances = async () => {
     try {
       toast.loading("Writing direct override balance adjustments...");
       await updateDoc(doc(db, 'users', user.id), {
         wallet_balance: Number(directWallet),
         balance: Number(directWallet),
         profit_balance: Number(directProfit),
         referralBalance: Number(directReferral)
       });
       toast.dismiss();
       toast.success("User balance configurations successfully overridden.");
       setIsDirectBalanceOpen(false);
     } catch (e: any) {
       toast.dismiss();
       toast.error("Failed to update user balances directly.");
     }
   };

   const handleInjectManualTx = async () => {
     if (!manualTxAmount || Number(manualTxAmount) <= 0) {
       toast.error("Please provide a valid transaction amount.");
       return;
     }
     
     try {
       toast.loading("Integrating custom ledger transaction...");
       const targetDate = new Date(manualTxDate);
       const firestoreTimestamp = Timestamp.fromDate(targetDate);

       const txData: any = {
         user_id: user.id,
         userId: user.id,
         type: manualTxType,
         amount: Number(manualTxAmount),
         status: manualTxStatus,
         method: manualTxMethod,
         withdrawal_method: manualTxMethod,
         payment_method: manualTxMethod,
         bankName: manualTxBank || (manualTxMethod === 'wire' ? 'Global Commerce' : manualTxMethod),
         accountName: manualTxAccName || user.username || user.fullName || 'Investor Node',
         accountNumber: manualTxAccNum || '••••' + Math.floor(1000 + Math.random() * 9000),
         routingNumber: manualTxRouting || '',
         address: manualTxAccNum || '',
         created_at: firestoreTimestamp,
         timestamp: firestoreTimestamp,
         timestamp_millis: targetDate.getTime(),
         submittedAt: firestoreTimestamp,
         reference: 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
         referenceId: 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
         manual_injection: true
       };

       if (manualTxStatus === 'declined' || manualTxStatus === 'failed') {
         txData.rejection_reason = manualTxReason;
         txData.declineReason = manualTxReason;
         txData.declinedAt = firestoreTimestamp;
       } else if (manualTxStatus === 'completed') {
         txData.completedAt = firestoreTimestamp;
       } else if (manualTxStatus === 'approved') {
         txData.approvedAt = firestoreTimestamp;
       }

       await addDoc(collection(db, "transactions"), txData);
       
       toast.dismiss();
       toast.success("Transaction injected and positioned historically in ledger history.");
       setIsManualTxOpen(false);
       setManualTxAmount("");
       setManualTxBank("");
       setManualTxAccName("");
       setManualTxAccNum("");
       setManualTxRouting("");
     } catch (e: any) {
       toast.dismiss();
       toast.error("Manual transaction injection failed.");
     }
   };

   const handleUpdateReferralRates = async () => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        level1_percentage: Number(lvl1),
        level2_percentage: Number(lvl2)
      });
      toast.success("Referral rates updated for this node.");
      setIsEditingReferral(false);
    } catch (e) {
      toast.error("Update failed.");
    }
  };

  const sendMessage = async () => {
    if (!messageTitle || !messageBody) {
      toast.error("Both title and message are required.");
      return;
    }
    toast.loading("Transmitting real-time signal via FCM...");
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/admin/send-direct-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: messageTitle,
          message: messageBody,
          type: "broadcast"
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to transmit real-time signal.");
      }
      toast.dismiss();
      toast.success("Signal successfully transmitted in real-time via FCM!");
      setIsAdminMessageOpen(false);
      setMessageTitle("");
      setMessageBody("");
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "FCM transmission failed.");
    }
  };

   const userInvestments = investments.filter((inv: any) => inv.user_id === user.uid || inv.user_id === user.id);
   const activeInvested = userInvestments.filter((i: any) => i.status === 'active').reduce((sum: number, i: any) => sum + (i.deposited || 0), 0);
   const totalBalance = (user.wallet_balance || user.balance || 0) + (user.profit_balance || 0);
   const isLocked = userInvestments.some((inv: any) => inv.status === 'active' && (inv.progress || 0) < 100);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed inset-y-0 right-0 w-[500px] bg-[#0A0F1C]/95 backdrop-blur-2xl border-l border-white/10 z-[60] shadow-2xl p-8 overflow-y-auto custom-scrollbar"
    >
       <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
             <div className="relative w-16 h-16 rounded-3xl bg-primary/20 border border-primary/40 flex items-center justify-center font-black text-2xl text-primary shadow-2xl">
               {(user.username || user.email || "U").charAt(0).toUpperCase()}
               <LevelBadge 
                 totalDeposits={user.total_deposits || 0} 
                 isAdmin={user.role === 'admin'}
                 className="absolute -bottom-2 -right-2 w-7 h-7 pointer-events-none" 
               />
             </div>
             <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{user.username || user.fullName || "System Node"}</h3>
                <p className="text-sm font-mono text-muted-foreground">{user.email || user.id}</p>
                {(() => {
                  const dt = user.createdAt || user.created_at;
                  let d: Date | null = null;
                  if (dt) {
                    if (dt?.toDate && typeof dt.toDate === 'function') d = dt.toDate();
                    else if (dt?.seconds) d = new Date(dt.seconds * 1000);
                    else d = new Date(dt);
                  }

                  const regCountry = getUserCountry(user, pageViews, onlineSessions);
                  const flag = getCountryFlag(regCountry);
                  const actStatus = getUserActiveStatus(user, onlineSessions);

                  return (
                    <div className="mt-2 space-y-1.5">
                      {d && !isNaN(d.getTime()) && (
                        <p className="text-xs text-sky-400 font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          Member Since: {d.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                          <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Registration Country: <strong className="text-white font-extrabold">{regCountry}</strong> {flag}</span>
                        </div>

                        <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          actStatus.isActive 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse' 
                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${actStatus.isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                          <span>Status: <strong className="font-extrabold">{actStatus.label}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
             <X className="w-6 h-6 text-white" />
          </button>
       </div>

       {isLocked && (
         <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
           <Lock className="w-5 h-5 text-amber-500" />
           <div className="text-xs font-bold text-amber-500 uppercase tracking-tight">Main Withdrawal Matrix Locked: Active Incomplete Plans Detected (Referral node remains active)</div>
         </div>
       )}

       <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
             <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">Total Main Balance (Net Worth)</p>
             <p className="text-xl font-black text-white">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
             <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">Referral Balance</p>
             <p className="text-xl font-black text-white">{formatCurrency(user.referralBalance || 0)}</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
             <p className="text-[10px] text-primary uppercase font-black mb-1">Profit Paid Balance</p>
             <p className="text-xl font-black text-primary">{formatCurrency(user.profit_balance || 0)}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
             <p className="text-[10px] text-emerald-500 uppercase font-black mb-1">Wallet (Deposit)</p>
             <p className="text-xl font-black text-emerald-500">{formatCurrency(user.wallet_balance || user.balance || 0)}</p>
          </div>
       </div>

       <div className="space-y-6">
          <div>
             <h4 className="text-xs uppercase font-black text-muted-foreground tracking-widest mb-4">Command Actions</h4>
             <div className="grid grid-cols-1 gap-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-12 border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 rounded-xl font-bold text-primary"
                  onClick={() => {
                    if (onBypassUser) onBypassUser(user.id);
                    onClose();
                  }}
                >
                   Generate Magic Bypass Link <Zap className="w-4 h-4 text-primary animate-pulse" />
                </Button>
                <Button variant="outline" className={`w-full justify-between h-12 border-white/10 hover:bg-white/5 rounded-xl font-bold ${user.verified_referrer ? 'bg-primary/20 text-primary border-primary/30' : ''}`} onClick={handleToggleVerifiedReferrer}>
                   {user.verified_referrer ? 'Worker Verified (Revoke)' : 'Verify as Worker'} <UsersIcon className="w-4 h-4 text-pink-500" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-12 border-white/10 hover:bg-white/5 rounded-xl font-bold" onClick={() => setIsFundingOpen(true)}>
                   Admin Force Funding Override <DollarSign className="w-4 h-4 text-emerald-500" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-12 border-white/10 hover:bg-white/5 rounded-xl font-bold hover:text-cyan-400" onClick={() => setIsDirectBalanceOpen(true)}>
                   Direct Users Balances Editor <Sliders className="w-4 h-4 text-cyan-400" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-12 border-white/10 hover:bg-white/5 rounded-xl font-bold text-amber-500 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5 animate-pulse" onClick={() => setIsManualTxOpen(true)}>
                   Inject False Ledger Transaction <ArrowDownRight className="w-4 h-4 text-amber-500" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-12 border-white/10 hover:bg-white/5 rounded-xl font-bold" onClick={() => handleUpdateStatus('paused')}>
                   Pause Authority <Activity className="w-4 h-4 text-amber-500" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-12 border-white/10 hover:bg-white/5 rounded-xl font-bold" onClick={() => handleUpdateStatus('restricted')}>
                   Restrict Protocol <Lock className="w-4 h-4 text-orange-500" />
                </Button>
             </div>
          </div>

          <div>
             <h4 className="text-xs uppercase font-black text-muted-foreground tracking-widest mb-4">Unique User Tag</h4>
             <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-4">
                 {isEditingTag ? (
                   <>
                     <div className="flex justify-between items-center gap-4">
                        <span className="text-xs text-muted-foreground font-bold uppercase">Assign Tag</span>
                        <input type="text" value={uniqueTag} onChange={e => setUniqueTag(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-white placeholder-muted-foreground" placeholder="@username" />
                     </div>
                     <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={handleSaveTag}>Save Tag</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingTag(false)}>Cancel</Button>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-bold uppercase">Current Tag</span>
                        <Badge className="bg-primary/20 text-primary font-mono">{user.unique_tag || "Unassigned"}</Badge>
                     </div>
                     <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/10" onClick={() => setIsEditingTag(true)}>Edit User Tag</Button>
                   </>
                 )}
             </div>
          </div>

          <div>
             <h4 className="text-xs uppercase font-black text-muted-foreground tracking-widest mb-4">Referral Upgrades</h4>
             <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-4">
                {isEditingReferral ? (
                  <>
                    <div className="flex justify-between items-center gap-4">
                       <span className="text-xs text-muted-foreground font-bold uppercase">Level 1 Commission (%)</span>
                       <input type="number" value={lvl1} onChange={e => setLvl1(Number(e.target.value))} className="w-20 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-right text-sm font-bold text-primary" />
                    </div>
                    <div className="flex justify-between items-center gap-4">
                       <span className="text-xs text-muted-foreground font-bold uppercase">Level 2 Commission (%)</span>
                       <input type="number" value={lvl2} onChange={e => setLvl2(Number(e.target.value))} className="w-20 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-right text-sm font-bold text-white" />
                    </div>
                    <div className="flex gap-2">
                       <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={handleUpdateReferralRates}>Save Rates</Button>
                       <Button size="sm" variant="ghost" onClick={() => setIsEditingReferral(false)}>Cancel</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                       <span className="text-xs text-muted-foreground font-bold uppercase">Level 1 Commission</span>
                       <Badge className="bg-primary/20 text-primary">{user.level1_percentage || 10}%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs text-muted-foreground font-bold uppercase">Level 2 Commission</span>
                       <Badge className="bg-white/10 text-muted-foreground">{user.level2_percentage || 3}%</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/10" onClick={() => setIsEditingReferral(true)}>Configure Custom Rates</Button>
                  </>
                )}
             </div>
          </div>

          <div>
             <h4 className="text-xs uppercase font-black text-muted-foreground tracking-widest mb-4">Active Yield Plans</h4>
             {userInvestments.length === 0 ? (
                <div className="bg-white/5 border border-white/5 p-6 rounded-2xl text-center">
                   <p className="text-sm font-bold text-muted-foreground">No active plans detected.</p>
                </div>
             ) : (
                <div className="space-y-3">
                   {userInvestments.map((inv: any) => (
                      <div key={inv.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                         <div>
                            <p className="text-sm font-black text-white uppercase italic">{formatPlanName(inv)} ${Number(inv.total_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-muted-foreground font-bold">Principle: {formatCurrency(inv.total_amount)}</p>
                         </div>
                         <div className="text-right">
                            <Badge className={`text-[10px] uppercase font-black border-none ${inv.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10 text-muted-foreground'}`}>{inv.status}</Badge>
                            <p className="text-xs text-primary font-black mt-1">+{formatCurrency(inv.total_profit_earned || 0)}</p>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>

          <div>
             <h4 className="text-xs uppercase font-black text-muted-foreground tracking-widest mb-4">Signal Transmission</h4>
             <Button className="w-full h-12 bg-primary hover:bg-primary/90 font-bold rounded-xl" onClick={() => setIsAdminMessageOpen(true)}>
                Transmit Direct Message <MessageCircle className="w-4 h-4 ml-2" />
             </Button>
          </div>
       </div>

       {isFundingOpen && (
          <div className="mt-8 pt-8 border-t border-white/10 space-y-4 bg-primary/5 p-4 rounded-2xl border-l-[4px] border-l-primary">
             <h4 className="text-sm font-bold text-white uppercase italic flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Admin System Funding
             </h4>
             <select 
               value={fundType}
               onChange={e => setFundType(e.target.value as any)}
               className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
             >
                <option value="wallet_balance">Wallet / Trading Balance</option>
                <option value="balance">Deposit Main Balance (Legacy)</option>
                <option value="referralBalance">Referral Earnings Balance</option>
                <option value="profit_balance">Profit Ready Balance</option>
             </select>
             <input type="number" value={fundAmount} onChange={e => setFundAmount(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-emerald-400" placeholder="Amount USD (e.g. 5000)" />
             <div className="flex gap-2 pt-2">
                <Button className="flex-1 font-bold bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleAdminFund}>Credit Account Override</Button>
                <Button variant="ghost" className="px-6" onClick={() => setIsFundingOpen(false)}>Cancel</Button>
             </div>
          </div>
       )}

       {isDirectBalanceOpen && (
           <div className="mt-8 pt-8 border-t border-white/10 space-y-4 bg-cyan-950/20 p-4 rounded-2xl border-l-[4px] border-l-cyan-500 text-left animate-in fade-in duration-300">
              <h4 className="text-sm font-bold text-white uppercase italic flex items-center gap-2">
                 <Sliders className="w-4 h-4 text-cyan-400" /> Direct Balances Editor
              </h4>
              <p className="text-[11px] text-slate-400">
                 Overwrites the exact ledger balances for this user account. Enter the absolute values.
              </p>
              <div className="space-y-3">
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1 font-bold">
                       Trading / Wallet Balance
                    </label>
                    <input type="number" value={directWallet} onChange={e => setDirectWallet(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-cyan-400" placeholder="Trading Balance" />
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1 font-bold">
                       Profit Ready Balance
                    </label>
                    <input type="number" value={directProfit} onChange={e => setDirectProfit(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-emerald-400" placeholder="Profit Balance" />
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1 font-bold">
                       Referral Earnings Balance
                    </label>
                    <input type="number" value={directReferral} onChange={e => setDirectReferral(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-pink-400" placeholder="Referral Earnings" />
                 </div>
              </div>
              <div className="flex gap-2 pt-2">
                 <Button className="flex-1 font-bold bg-cyan-500 hover:bg-cyan-600 text-white" onClick={handleSaveDirectBalances}>Save Overwritten Balances</Button>
                 <Button variant="ghost" className="px-6 text-white" onClick={() => setIsDirectBalanceOpen(false)}>Cancel</Button>
              </div>
           </div>
        )}

        {isManualTxOpen && (
           <div className="mt-8 pt-8 border-t border-white/10 space-y-4 bg-amber-950/20 p-4 rounded-2xl border-l-[4px] border-l-amber-500 text-left animate-in fade-in duration-300">
              <h4 className="text-sm font-bold text-white uppercase italic flex items-center gap-2">
                 <ArrowDownRight className="w-4 h-4 text-amber-500" /> Dynamic False Ledger Injector
              </h4>
              <p className="text-[11px] text-slate-400">
                 Assemble and force-inject a custom transaction directly into history with custom timelines.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black block mb-1 font-bold">Tx Classification</label>
                    <select 
                      value={manualTxType}
                      onChange={e => setManualTxType(e.target.value as any)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white uppercase font-bold"
                    >
                       <option value="withdrawal">Withdrawal</option>
                       <option value="deposit">Deposit</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black block mb-1 font-bold">Positioning Timeline Date</label>
                    <input 
                      type="datetime-local" 
                      value={manualTxDate} 
                      onChange={e => setManualTxDate(e.target.value)} 
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white uppercase font-bold"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black block mb-1 font-bold">Absolute Value (USD)</label>
                    <input 
                      type="number" 
                      value={manualTxAmount} 
                      onChange={e => setManualTxAmount(e.target.value)} 
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400" 
                      placeholder="e.g. 15000"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black block mb-1 font-bold">Gateway Settlement Status</label>
                    <select 
                      value={manualTxStatus}
                      onChange={e => setManualTxStatus(e.target.value as any)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white uppercase font-bold"
                    >
                       <option value="declined">Failed / Declined</option>
                       <option value="pending">Pending Admin Review</option>
                       <option value="completed">Completed / Settled</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black block mb-1 font-bold font-bold">Settlement Gateway</label>
                    <input 
                      type="text" 
                      value={manualTxMethod} 
                      onChange={e => setManualTxMethod(e.target.value)} 
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold" 
                      placeholder="e.g. Bank Wire Transfer, BTC, PayPal"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black block mb-1 font-bold font-bold">Holding Bank / Network Name</label>
                    <input 
                      type="text" 
                      value={manualTxBank} 
                      onChange={e => setManualTxBank(e.target.value)} 
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold" 
                      placeholder="e.g. Chase Bank, JPMorgan"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black block mb-1 font-bold font-bold font-bold font-bold">Account Owner Ref Name</label>
                    <input 
                      type="text" 
                      value={manualTxAccName} 
                      onChange={e => setManualTxAccName(e.target.value)} 
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold" 
                      placeholder="Legal Name"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black block mb-1 font-bold font-bold font-bold font-bold">Account / Wallet Address</label>
                    <input 
                      type="text" 
                      value={manualTxAccNum} 
                      onChange={e => setManualTxAccNum(e.target.value)} 
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold" 
                      placeholder="e.g. IBAN or public key"
                    />
                 </div>
              </div>

              {manualTxType === "withdrawal" && (
                <div>
                   <label className="text-[10px] text-slate-400 uppercase font-black block mb-1 font-bold">Routing Number / SWIFT Code</label>
                   <input 
                     type="text" 
                     value={manualTxRouting} 
                     onChange={e => setManualTxRouting(e.target.value)} 
                     className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold" 
                     placeholder="BIC / SWIFT Transit"
                   />
                </div>
              )}

              {(manualTxStatus === "declined" || manualTxStatus === "failed") && (
                 <div>
                    <label className="text-[10px] text-amber-500 uppercase font-black block mb-1 font-bold font-bold">Decline Protocol Reason</label>
                    <textarea 
                      value={manualTxReason} 
                      onChange={e => setManualTxReason(e.target.value)} 
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white h-20 font-bold" 
                      placeholder="e.g. SECURITY HOLD: Identity document scans (front and back) required to clear fraud alert."
                    />
                 </div>
              )}

              <div className="flex gap-2 pt-2">
                 <Button className="flex-1 font-bold bg-amber-500 hover:bg-amber-600 text-white" onClick={handleInjectManualTx}>Force Inject Into Ledger</Button>
                 <Button variant="ghost" className="px-6 text-white" onClick={() => setIsManualTxOpen(false)}>Cancel</Button>
              </div>
           </div>
        )}

        {isAdminMessageOpen && (
           <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase italic">Draft Transmission</h4>
              <input value={messageTitle} onChange={e => setMessageTitle(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm" placeholder="Subject Target..." />
              <textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm h-32" placeholder="Signal Content..." />
              <div className="flex gap-2">
                 <Button className="flex-1 font-bold bg-primary hover:bg-primary/90 text-white" onClick={sendMessage}>Deliver Signal</Button>
                 <Button variant="ghost" className="px-6 text-white font-bold" onClick={() => setIsAdminMessageOpen(false)}>Abort</Button>
              </div>
           </div>
        )}

        {isClearUserDbOpen && (
           <div className="mt-8 pt-8 border-t border-red-500/20 space-y-4 bg-red-950/20 p-5 rounded-2xl border-l-[4px] border-l-red-500 text-left animate-in fade-in duration-300">
              <h4 className="text-sm font-bold text-white uppercase italic flex items-center gap-2">
                 <Trash2 className="w-4 h-4 text-red-500" /> Clear User Database Protocol
              </h4>
              <p className="text-xs text-slate-300">
                 Purge all transactions, active investments, deposits, withdrawals, tickets, notifications, and logs for <span className="font-bold text-white">{user.email || user.id}</span>.
              </p>
              <div className="space-y-3 pt-1">
                 <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Purge Execution Mode</label>
                 <div className="grid grid-cols-1 gap-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${clearUserMode === 'keep_account' ? 'bg-red-500/10 border-red-500/50 text-white' : 'bg-black/40 border-white/10 text-slate-400'}`}>
                       <input type="radio" name="clearUserMode" value="keep_account" checked={clearUserMode === 'keep_account'} onChange={() => setClearUserMode('keep_account')} className="mt-1 accent-red-500" />
                       <div>
                          <p className="text-xs font-bold text-white">Reset Ledger & Records (Keep User Profile)</p>
                          <p className="text-[11px] text-slate-400">Wipes all transaction/trade history, active plans, tickets & sets balances to $0, but leaves the user profile active.</p>
                       </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${clearUserMode === 'delete_account' ? 'bg-red-500/10 border-red-500/50 text-white' : 'bg-black/40 border-white/10 text-slate-400'}`}>
                       <input type="radio" name="clearUserMode" value="delete_account" checked={clearUserMode === 'delete_account'} onChange={() => setClearUserMode('delete_account')} className="mt-1 accent-red-500" />
                       <div>
                          <p className="text-xs font-bold text-red-400">Complete Purge & Delete User Account</p>
                          <p className="text-[11px] text-slate-400">Deletes all database records, profile document, and Firebase Auth user permanently.</p>
                       </div>
                    </label>
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Authority Passcode</label>
                    <input 
                       type="password" 
                       value={clearUserPasscode} 
                       onChange={e => setClearUserPasscode(e.target.value)} 
                       className="w-full bg-black/60 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 focus:border-red-500 outline-none font-bold" 
                       placeholder="Enter Authority Passcode (e.g. 7777)" 
                    />
                 </div>
              </div>
              <div className="flex gap-2 pt-2">
                 <Button className="flex-1 font-bold bg-red-600 hover:bg-red-700 text-white" onClick={handleExecuteClearUserDb}>
                    Execute User Data Purge
                 </Button>
                 <Button variant="ghost" className="px-6 text-slate-300 font-bold" onClick={() => setIsClearUserDbOpen(false)}>
                    Cancel
                 </Button>
              </div>
           </div>
        )}
     </motion.div>
  );
}

function InvestmentsManagement({ investments, users }: any) {
  const [filterNewOnly, setFilterNewOnly] = useState(false);
  const [selectedInvForDetails, setSelectedInvForDetails] = useState<any | null>(null);

  const unreviewedInvestments = investments.filter((i: any) => i.admin_reviewed !== true);
  const displayedInvestments = filterNewOnly ? unreviewedInvestments : investments;

  const handleMarkAllReviewed = async () => {
    try {
      const promises = unreviewedInvestments.map((inv: any) =>
        updateDoc(doc(db, "investments", inv.id), { admin_reviewed: true })
      );
      await Promise.all(promises);
      toast.success("All investments marked as reviewed.");
    } catch (e) {
      toast.error("Failed to update investments.");
    }
  };

  const handleMarkOneReviewed = async (id: string) => {
    try {
      await updateDoc(doc(db, "investments", id), { admin_reviewed: true });
      toast.success("Investment marked as reviewed.");
    } catch (e) {
      toast.error("Failed to update investment.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-3xl font-black tracking-tighter uppercase italic">Yield Engines</h2>
           <p className="text-sm text-muted-foreground font-medium">Monitoring active portfolio nodes & locked-in financial parameters.</p>
        </div>
      </div>

      {unreviewedInvestments.length > 0 && (
        <div className="relative overflow-hidden bg-primary/10 border border-primary/20 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-primary/5 animate-in fade-in slide-in-from-top duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="relative mt-1">
              <span className="absolute inline-flex h-3 w-3 rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
                🔵 {unreviewedInvestments.length} {unreviewedInvestments.length === 1 ? "New Investment" : "New Investments"}
              </h3>
              <p className="text-sm text-slate-300 font-medium mt-1">
                Review the latest investments added to the system.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterNewOnly(!filterNewOnly)}
              className="text-primary hover:text-white hover:bg-primary/20 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl h-10 transition-all border border-primary/20"
            >
              {filterNewOnly ? "Show All Investments" : "View New Investments →"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllReviewed}
              className="bg-primary hover:bg-primary/90 text-white hover:text-white border-none text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl h-10 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Mark All Reviewed
            </Button>
          </div>
        </div>
      )}

      <Card className="bg-black/40 border-white/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5">
              <TableHead className="pl-8 py-4 text-[10px] uppercase font-black text-muted-foreground">User Target</TableHead>
              <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Plan Structure</TableHead>
              <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Yield Return %</TableHead>
              <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Capital Invested</TableHead>
              <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Target Return</TableHead>
              <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Status</TableHead>
              <TableHead className="pr-8 py-4 text-right text-[10px] uppercase font-black text-muted-foreground">Command</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedInvestments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm uppercase tracking-widest font-mono">
                  No investments found.
                </TableCell>
              </TableRow>
            ) : (
              displayedInvestments.map((inv: any) => {
                const isNew = inv.admin_reviewed !== true;
                const metrics = calculateInvestmentMetrics(inv);
                const userObj = users.find((u: any) => u.id === inv.user_id || u.uid === inv.user_id);

                return (
                  <TableRow key={inv.id} className={`border-white/5 hover:bg-white/5 transition-colors relative cursor-pointer ${isNew ? 'bg-primary/5' : ''}`}>
                     <TableCell className="pl-8 py-4" onClick={() => setSelectedInvForDetails(inv)}>
                        <p className="text-sm font-bold text-white truncate max-w-[150px]">{userObj?.username || userObj?.email || inv.user_id}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{inv.user_id.substring(0, 12)}...</p>
                     </TableCell>
                     <TableCell onClick={() => setSelectedInvForDetails(inv)}>
                        <div className="flex items-center gap-2">
                           <p className="text-base font-black text-white uppercase italic">{formatPlanName(inv)}</p>
                           {isNew && (
                             <Badge className="bg-primary/20 text-primary border border-primary/30 text-[8px] font-black uppercase h-4.5 px-1.5 animate-pulse">
                                NEW
                             </Badge>
                           )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold">{metrics.durationMs ? Math.round(metrics.durationMs / (24*60*60*1000)) : inv.duration_days}D DURATION / {inv.interval_days || 3}D PULSE</p>
                     </TableCell>
                     <TableCell onClick={() => setSelectedInvForDetails(inv)}>
                        <span className="text-base font-black text-emerald-400">{metrics.returnPercentage}%</span>
                     </TableCell>
                     <TableCell onClick={() => setSelectedInvForDetails(inv)}>
                        <span className="text-sm font-bold text-white">{formatCurrency(metrics.principalInvested)}</span>
                     </TableCell>
                     <TableCell onClick={() => setSelectedInvForDetails(inv)}>
                        <span className="text-sm font-bold text-cyan-400">{formatCurrency(metrics.targetPayout)}</span>
                     </TableCell>
                     <TableCell onClick={() => setSelectedInvForDetails(inv)}>
                        <Badge className={`text-[9px] uppercase font-black border-none ring-1 px-2 h-5 ${metrics.status === 'active' ? 'bg-emerald-500/20 text-emerald-500 ring-emerald-500/30' : metrics.status === 'completed' ? 'bg-blue-500/20 text-blue-400 ring-blue-500/30' : 'bg-amber-500/20 text-amber-500 ring-amber-500/30'}`}>
                          {metrics.status}
                        </Badge>
                     </TableCell>
                     <TableCell className="pr-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Button
                             variant="ghost"
                             size="sm"
                             className="bg-primary/10 hover:bg-primary/20 text-primary h-10 px-3 rounded-xl text-xs font-bold"
                             onClick={() => setSelectedInvForDetails(inv)}
                           >
                             Inspect
                           </Button>
                           {isNew && (
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-400 h-10 w-10 p-0 rounded-xl"
                               onClick={() => handleMarkOneReviewed(inv.id)}
                               title="Mark as Reviewed"
                             >
                               <Check className="w-4 h-4" />
                             </Button>
                           )}
                           <Button variant="ghost" size="sm" className="bg-white/5 hover:bg-primary/20 h-10 w-10 p-0 rounded-xl" onClick={async () => {
                              const action = inv.status === 'active' ? 'pause' : 'resume';
                              try {
                                 const baseUrl = (import.meta as any).env.VITE_API_URL || "";
                                 await fetch(`${baseUrl}/api/admin/manage-investment`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ investmentId: inv.id, action })
                                 });
                                 toast.success(`Investment engine ${action}d.`);
                              } catch (e) {
                                 toast.error("Command intercept failed.");
                              }
                           }}>
                              {inv.status === 'active' ? <Lock className="w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />}
                           </Button>
                        </div>
                     </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* INVESTMENT INSPECTOR MODAL */}
      {selectedInvForDetails && (() => {
        const inv = selectedInvForDetails;
        const metrics = calculateInvestmentMetrics(inv);
        const userObj = users.find((u: any) => u.id === inv.user_id || u.uid === inv.user_id);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-[#090d16] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6 text-white max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary border border-primary/30 uppercase text-[10px] font-bold">
                      {metrics.model?.toUpperCase()} MODEL
                    </Badge>
                    <Badge className={`uppercase text-[10px] font-bold ${metrics.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      {metrics.status}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight italic mt-1">
                    {formatPlanName(inv)} Investment Record
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    User: {userObj?.username || userObj?.email || 'N/A'} ({inv.user_id})
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInvForDetails(null)}
                  className="text-slate-400 hover:text-white rounded-full h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>

              {/* Financial Metrics Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#0d1424] border border-white/5 rounded-2xl p-4">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Capital Invested</div>
                  <div className="text-lg font-black font-mono text-white">{formatCurrency(metrics.principalInvested)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Return Rate</div>
                  <div className="text-lg font-black font-mono text-emerald-400">{metrics.returnPercentage}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Projected Profit</div>
                  <div className="text-lg font-black font-mono text-emerald-400">+{formatCurrency(metrics.targetProfit)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Target Payout</div>
                  <div className="text-lg font-black font-mono text-cyan-300">{formatCurrency(metrics.targetPayout)}</div>
                </div>
              </div>

              {/* Real-time Progression */}
              <div className="bg-[#0d1424] border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Current Value / Progress</span>
                  <span className="font-mono font-bold text-cyan-300">{metrics.progressPercentage}% Complete</span>
                </div>
                <div className="w-full bg-[#18233a] h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${metrics.progressPercentage}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
                  <div>
                    <span className="text-slate-400">Earned Profit To Date: </span>
                    <span className="text-emerald-400 font-bold">+{formatCurrency(metrics.currentProfit)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Time Remaining: </span>
                    <span className="text-cyan-300 font-bold">{metrics.remainingFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Timeline & Parameters */}
              <div className="space-y-2 text-xs font-mono bg-[#0d1424] border border-white/5 rounded-2xl p-4">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 font-sans">
                  Timeline & Parameters
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Record ID:</span>
                  <span className="text-white font-bold">{inv.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Total Duration:</span>
                  <span className="text-white">{metrics.durationMs ? Math.round(metrics.durationMs / (24*60*60*1000)) : (inv.duration_days || 15)} Days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Interval Schedule:</span>
                  <span className="text-white">Every {inv.interval_days || 3} Days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Total Cycles:</span>
                  <span className="text-white">{metrics.totalCycles || 1}</span>
                </div>
                {inv.created_at && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Created At:</span>
                    <span className="text-white">{inv.created_at.seconds ? new Date(inv.created_at.seconds * 1000).toLocaleString() : 'N/A'}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedInvForDetails(null)}
                  className="bg-white/5 border-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function DepositsManagement({ payments, users }: any) {
  return (
    <div className="space-y-6">
       <h2 className="text-3xl font-black tracking-tighter uppercase italic">Inbound Pipeline</h2>
       <Card className="bg-black/40 border-white/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5">
              <TableHead className="pl-8 py-4 text-[10px] uppercase font-black text-muted-foreground">Source</TableHead>
              <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Asset Value</TableHead>
              <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Protocol</TableHead>
              <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Status</TableHead>
              <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground text-center">Proof</TableHead>
              <TableHead className="pr-8 py-4 text-right text-[10px] uppercase font-black text-muted-foreground">Command</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((pay: any) => (
              <TableRow key={pay.id} className="border-white/5 hover:bg-white/5">
                <TableCell className="pl-8 py-4">
                  <p className="text-sm font-bold text-white truncate max-w-[150px]">{users.find((u: any) => u.id === pay.user_id)?.username || "Unknown"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase">{pay.user_id.substring(0,12)}...</p>
                </TableCell>
                <TableCell>
                  <span className="text-base font-black text-white">{formatCurrency(pay.amount)}</span>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">{pay.pay_currency || 'USD'}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{pay.pay_address || pay.method}</p>
                </TableCell>
                <TableCell>
                   <Badge className={`${pay.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : pay.status === 'pending' ? 'bg-blue-500/20 text-blue-500 border-none animate-pulse' : 'bg-red-500/20 text-red-500'} border-none text-[9px] uppercase font-black px-2 h-5`}>
                     {pay.status}
                   </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {pay.proof_url ? (
                    <a href={pay.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[10px] font-black uppercase inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-[10px] uppercase font-black italic opacity-30">None</span>
                  )}
                </TableCell>
                <TableCell className="pr-8 text-right">
                  {pay.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                       <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 font-black text-[10px] h-8 px-4" onClick={async () => {
                          const baseUrl = (import.meta as any).env.VITE_API_URL || "";
                          const res = await fetch(`${baseUrl}/api/admin/process-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paymentId: pay.id, action: 'approve' })
                          });
                          if (res.ok) toast.success("Asset validated and node credited.");
                       }}>APPROVE</Button>
                       <Button size="sm" variant="destructive" className="font-black text-[10px] h-8 px-4" onClick={async () => {
                          const reason = prompt("Enter Rejection Reason:");
                          if (reason === null) return;
                          const baseUrl = (import.meta as any).env.VITE_API_URL || "";
                          const res = await fetch(`${baseUrl}/api/admin/process-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paymentId: pay.id, action: 'reject', reason })
                          });
                          if (res.ok) toast.success("Asset rejected.");
                       }}>REJECT</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
       </Card>
    </div>
  );
}

function WithrawalsManagement({ withdrawals, users }: any) {
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [isSubmittingDenial, setIsSubmittingDenial] = useState(false);

  // Dynamic verification step state
  const [selectedVerifyTx, setSelectedVerifyTx] = useState<any | null>(null);
  const [stepInst, setStepInst] = useState("");
  const [stepInputType, setStepInputType] = useState<"image" | "text" | "both">("both");
  const [stepRequired, setStepRequired] = useState("yes");
  const [isAddingStep, setIsAddingStep] = useState(false);

  // Find the exact live transaction object
  const liveTx = useMemo(() => {
    if (!selectedVerifyTx) return null;
    return withdrawals.find((w: any) => w.id === selectedVerifyTx.id) || selectedVerifyTx;
  }, [selectedVerifyTx, withdrawals]);

  const handleSubmitDenial = async () => {
    if (!denyingId) return;
    if (!denyReason.trim()) {
      toast.error("Please enter a denial reason");
      return;
    }
    setIsSubmittingDenial(true);
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/admin/process-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          withdrawalId: denyingId, 
          action: 'reject', 
          rejectionReason: denyReason.trim() 
        })
      });
      if (res.ok) {
        toast.success("Withdrawal denied successfully.");
        setDenyingId(null);
        setDenyReason("");
      } else {
        const d = await res.json();
        toast.error(d.error || "Denial failed");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setIsSubmittingDenial(false);
    }
  };

  const handleSettle = async (id: string) => {
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/admin/process-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, action: 'complete' })
      });
      if (res.ok) {
        toast.success("Withdrawal marked as completed and settled.");
      } else {
        const d = await res.json();
        toast.error(d.error || "Settle failed");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleAddVerificationStep = async () => {
    if (!liveTx) return;
    if (!stepInst.trim()) {
      toast.error("Please enter an instruction or prompt for the verification checkpoint");
      return;
    }

    setIsAddingStep(true);
    try {
      const txRef = doc(db, 'transactions', liveTx.id);
      const isCurrentlyNotDeclined = liveTx.status !== 'declined';

      const newStep = {
        id: 'step_' + Date.now(),
        instruction: stepInst.trim(),
        inputType: stepInputType,
        required: stepRequired === 'yes',
        status: 'pending_user',
        submittedText: '',
        submittedImage: '',
        submittedAt: ''
      };

      const updatedSteps = [...(liveTx.verificationSteps || []), newStep];

      const updates: any = {
        verificationSteps: updatedSteps
      };

      if (isCurrentlyNotDeclined) {
        updates.status = 'declined';
        updates.rejection_reason = "Security Verification Hold: Compliance review required to approve outbound settlement.";
        updates.declineReason = "Security Verification Hold: Compliance review required to approve outbound settlement.";
        updates.rejected_at = new Date();
      }

      await updateDoc(txRef, updates);
      toast.success("Verification checkpoint appended successfully and live.");
      setStepInst("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add verification checkpoint");
      console.error(err);
    } finally {
      setIsAddingStep(false);
    }
  };

  const handleUpdateStepStatus = async (stepIdx: number, newStatus: 'approved' | 'rejected') => {
    if (!liveTx) return;
    try {
      const txRef = doc(db, 'transactions', liveTx.id);
      const updatedSteps = [...(liveTx.verificationSteps || [])];
      
      updatedSteps[stepIdx] = {
        ...updatedSteps[stepIdx],
        status: newStatus
      };

      await updateDoc(txRef, {
        verificationSteps: updatedSteps
      });
      
      toast.success(`Checkpoint ${stepIdx + 1} marked as ${newStatus}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update step status");
      console.error(err);
    }
  };

  const handleRemoveStep = async (stepIdx: number) => {
    if (!liveTx) return;
    try {
      const txRef = doc(db, 'transactions', liveTx.id);
      const updatedSteps = [...(liveTx.verificationSteps || [])];
      updatedSteps.splice(stepIdx, 1);

      await updateDoc(txRef, {
        verificationSteps: updatedSteps
      });
      
      toast.success(`Checkpoint step removed.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove step");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-black tracking-tighter uppercase italic">Outbound Matrix</h2>
        <Card className="bg-black/40 border-white/5 overflow-hidden">
         <Table>
           <TableHeader className="bg-white/5">
             <TableRow className="border-white/5">
               <TableHead className="pl-8 py-4 text-[10px] uppercase font-black text-muted-foreground">Source Node</TableHead>
               <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Asset Value</TableHead>
               <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Source</TableHead>
               <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Settlement Target Details</TableHead>
               <TableHead className="py-4 text-[10px] uppercase font-black text-muted-foreground">Status</TableHead>
               <TableHead className="pr-8 py-4 text-right text-[10px] uppercase font-black text-muted-foreground">Command</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {withdrawals.map((w: any) => (
               <TableRow key={w.id} className="border-white/5 hover:bg-white/5">
                 <TableCell className="pl-8 py-4">
                   <p className="text-sm font-bold text-white truncate max-w-[150px]">{users.find((u: any) => u.id === w.userId)?.username || "Unknown"}</p>
                 </TableCell>
                 <TableCell>
                   <span className="text-base font-black text-white">{formatCurrency(w.amount)}</span>
                 </TableCell>
                 <TableCell>
                   <Badge className={`border-none text-[9px] uppercase font-black px-2 h-5 ${w.source === 'referral' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>
                     {w.source || 'main'}
                   </Badge>
                 </TableCell>
                 <TableCell>
                   <div className="text-xs space-y-0.5 py-1">
                     <p className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                       <span>{w.method || 'Wire'}</span>
                       {w.bankName && <span className="bg-white/5 px-2 py-0.5 rounded-md text-[9px] text-slate-300 font-black uppercase tracking-wider">{w.bankName}</span>}
                     </p>
                     {w.accountName && <p className="text-muted-foreground text-[10px]">Holder: <span className="text-slate-200 font-semibold">{w.accountName}</span></p>}
                     {w.routingNumber && <p className="text-[10px] text-amber-400 font-mono">Routing: <span className="text-slate-200 font-semibold">{w.routingNumber}</span></p>}
                     <p className="text-muted-foreground text-[10px] font-mono select-all">Dest: <span className="text-blue-400 font-bold">{w.accountNumber || w.address}</span></p>
                   </div>
                 </TableCell>
                 <TableCell>
                    <Badge className={`${w.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : w.status === 'pending' ? 'bg-blue-500/20 text-blue-500' : w.status === 'approved' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'} border-none text-[9px] uppercase font-black px-2 h-5`}>
                      {w.status}
                    </Badge>
                    {(w.status === 'declined' || w.status === 'rejected') && (w.rejection_reason || w.declineReason) && (
                      <p className="text-[10px] text-red-400 mt-1 font-semibold max-w-[150px] truncate" title={w.rejection_reason || w.declineReason}>
                        Reason: {w.rejection_reason || w.declineReason}
                      </p>
                    )}
                 </TableCell>
                 <TableCell className="pr-8 text-right">
                    <div className="flex justify-end gap-2 items-center">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 font-bold text-[10px] h-8 px-2.5 relative"
                        onClick={() => setSelectedVerifyTx(w)}
                        title="Manage Security Verification Steps"
                      >
                        STEPS ({(w.verificationSteps || []).length})
                        { (w.verificationSteps || []).some((s: any) => s.status === 'pending_admin') && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse border-2 border-black" />
                        )}
                      </Button>

                      {w.status === 'pending' && (
                        <>
                           <Button 
                             size="sm" 
                             className="bg-emerald-500 hover:bg-emerald-600 font-black text-[10px] h-8 px-4"
                             onClick={async () => {
                               try {
                                 const baseUrl = (import.meta as any).env.VITE_API_URL || "";
                                 const res = await fetch(`${baseUrl}/api/admin/process-withdrawal`, {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ withdrawalId: w.id, action: 'approve' })
                                 });
                                 if (res.ok) toast.success("Withdrawal approved and balance adjusted.");
                                 else {
                                   const d = await res.json();
                                   toast.error(d.error || "Approval failed");
                                 }
                               } catch (e) {
                                 toast.error("Network error");
                               }
                             }}
                           >
                             VALIDATE
                           </Button>
                           <Button 
                             size="sm" 
                             variant="destructive" 
                             className="font-black text-[10px] h-8 px-4"
                             onClick={() => {
                               setDenyingId(w.id);
                               setDenyReason("");
                             }}
                           >
                             DENY
                           </Button>
                        </>
                      )}
                      
                      {w.status === 'approved' && (
                        <>
                           <Button 
                             size="sm" 
                             className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] h-8 px-4"
                             onClick={() => handleSettle(w.id)}
                           >
                             SETTLE
                           </Button>
                           <Button 
                             size="sm" 
                             variant="destructive" 
                             className="font-black text-[10px] h-8 px-4"
                             onClick={() => {
                               setDenyingId(w.id);
                               setDenyReason("");
                             }}
                           >
                             DENY
                           </Button>
                        </>
                      )}
                    </div>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
        </Card>

        <AnimatePresence>
          {denyingId && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md bg-[#0F1524] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6"
              >
                <h3 className="text-lg font-black uppercase tracking-tight italic text-white mb-4">
                  Specify Decline Reason
                </h3>
                <p className="text-xs text-slate-450 mb-4">
                  Please write a clear reason why this withdrawal is being declined. This reason will be instantly visible to the investor on their private dashboard.
                </p>
                
                <textarea
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  placeholder="e.g., Target account number or Routing details mismatch."
                  className="w-full h-32 px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500/50 transition-colors resize-none mb-4"
                />

                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    className="text-slate-400 hover:text-white text-xs font-black"
                    onClick={() => setDenyingId(null)}
                    disabled={isSubmittingDenial}
                  >
                    CANCEL
                  </Button>
                  <Button
                    variant="destructive"
                    className="font-black text-xs px-6"
                    onClick={handleSubmitDenial}
                    disabled={isSubmittingDenial}
                  >
                    {isSubmittingDenial ? "SUBMITTING..." : "DENY WITHDRAWAL"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* DYNAMIC VERIFICATION STEP holds MODAL */}
          {liveTx && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-2xl bg-[#090d16] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start bg-black/20">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest block mb-1">compliance control</span>
                    <h3 className="text-xl font-bold text-white tracking-tight">Security Checkpoint Holds</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Target Investor: <span className="text-white font-semibold">{users.find((u: any) => u.id === liveTx.userId)?.username || "Unknown"}</span> &bull; Asset Value: <span className="text-emerald-400 font-bold">{formatCurrency(liveTx.amount)}</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedVerifyTx(null)}
                    className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body scroll area */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 h-full min-h-0">
                  
                  {/* Step Checklist Listing */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Current Verification Milestones</h4>
                    
                    {(!liveTx.verificationSteps || liveTx.verificationSteps.length === 0) ? (
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                        <Lock className="w-6 h-6 text-slate-500 mx-auto mb-1 animate-pulse" />
                        <span className="text-slate-400 text-xs font-medium block">Standard Clearance Flow</span>
                        <p className="text-[10px] text-slate-500 leading-normal max-w-sm mx-auto mt-1">
                          No active security check holds are configured yet. The user sees their traditional receipt detail panel. Add dynamic verification steps below to place them on hold.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {liveTx.verificationSteps.map((step: any, idx: number) => {
                          const isPendingUserSubmit = step.status === 'pending_user';
                          const isAwaitingAdminAction = step.status === 'pending_admin';
                          const isApproved = step.status === 'approved';
                          const isRejected = step.status === 'rejected';

                          return (
                            <div key={step.id || idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 relative group">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-slate-300">
                                      {idx + 1}
                                    </span>
                                    <span className="text-xs font-bold text-white">{step.instruction}</span>
                                  </div>
                                  <div className="flex gap-2 items-center text-[9px] text-slate-400 font-semibold uppercase">
                                    <span>Type: {step.inputType === 'both' ? 'Both image & text' : step.inputType === 'image' ? 'Image only' : 'Text only'}</span>
                                    <span>&bull;</span>
                                    <span>{step.required ? 'Mandatory' : 'Optional'}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {isApproved && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400">
                                      Approved ✓
                                    </span>
                                  )}
                                  {isPendingUserSubmit && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-500/10 text-slate-400">
                                      Awaiting User response...
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/10 text-rose-400">
                                      Returned (Rejected)
                                    </span>
                                  )}
                                  {isAwaitingAdminAction && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/20 text-blue-400 animate-pulse">
                                      SUBMISSION RECEIVED
                                    </span>
                                  )}

                                  <button
                                    onClick={() => handleRemoveStep(idx)}
                                    className="p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete Checkpoint"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Displays answers if any are submitted */}
                              {(step.submittedText || step.submittedImage || step.submittedImageBack) && (
                                <div className="p-4 bg-slate-950/80 border border-white/5 rounded-xl space-y-4 shadow-inner">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Investor Submission & AI Diagnostics</p>
                                    <span className="text-[8px] font-mono text-slate-500">SECURE PACKAGE</span>
                                  </div>

                                  {step.submittedText && (
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-black text-slate-500 uppercase font-mono tracking-wider">Statement / Details:</p>
                                      <p className="text-xs text-slate-200 leading-relaxed italic bg-white/5 p-3 rounded-lg border border-white/5">"{step.submittedText}"</p>
                                    </div>
                                  )}

                                  {/* Multi-Image/Video Document Attachment Previews */}
                                  {(step.submittedImage || step.submittedImageBack) && (
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-black text-slate-500 uppercase font-mono tracking-wider">Uploaded Biometric Evidence:</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {step.submittedImage && (
                                          <div className="space-y-1.5">
                                            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Front Side
                                            </p>
                                            <a 
                                              href={step.submittedImage} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="block relative rounded-xl overflow-hidden border border-white/10 group/img focus:outline-none bg-black/60 aspect-[4/3]"
                                            >
                                              {step.submittedImage.match(/\.(webm|mp4|mov)$/i) ? (
                                                <video src={step.submittedImage} className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.03]" controls controlsList="nodownload" muted playsInline />
                                              ) : (
                                                <img src={step.submittedImage} className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.03]" />
                                              )}
                                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white transition-opacity pointer-events-none">
                                                ZOOM FRONT
                                              </div>
                                            </a>
                                          </div>
                                        )}

                                        {step.submittedImageBack && (
                                          <div className="space-y-1.5">
                                            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Back Side
                                            </p>
                                            <a 
                                              href={step.submittedImageBack} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="block relative rounded-xl overflow-hidden border border-white/10 group/img focus:outline-none bg-black/60 aspect-[4/3]"
                                            >
                                              {step.submittedImageBack.match(/\.(webm|mp4|mov)$/i) ? (
                                                <video src={step.submittedImageBack} className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.03]" controls controlsList="nodownload" muted playsInline />
                                              ) : (
                                                <img src={step.submittedImageBack} className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.03]" />
                                              )}
                                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white transition-opacity pointer-events-none">
                                                ZOOM REVERSE
                                              </div>
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* GEMINI INTELLIGENCE ASSISTANCE SUITE COGNITIVE FEEDBACK */}
                                  {(step.geminiFeedbackFront || step.geminiFeedbackBack) && (
                                    <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-2.5">
                                      <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 font-mono">GOOGLE GEMINI // RISK & FIDELITY REPORT</span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[9px] font-mono text-slate-400 leading-relaxed uppercase">
                                        {step.geminiFeedbackFront && (
                                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5 space-y-1">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                                              <span>FRONT AI GRADE:</span>
                                              <span className={step.geminiConfidenceFront && step.geminiConfidenceFront > 90 ? 'text-emerald-400' : 'text-amber-400'}>
                                                CONFIDENCE: {step.geminiConfidenceFront || 0}%
                                              </span>
                                            </div>
                                            <p className="normal-case text-slate-450 text-[9px] font-sans leading-relaxed">"{step.geminiFeedbackFront}"</p>
                                          </div>
                                        )}

                                        {step.geminiFeedbackBack && (
                                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5 space-y-1">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                                              <span>BACK AI GRADE:</span>
                                              <span className={step.geminiConfidenceBack && step.geminiConfidenceBack > 90 ? 'text-emerald-400' : 'text-amber-400'}>
                                                CONFIDENCE: {step.geminiConfidenceBack || 0}%
                                              </span>
                                            </div>
                                            <p className="normal-case text-slate-450 text-[9px] font-sans leading-relaxed">"{step.geminiFeedbackBack}"</p>
                                          </div>
                                        )}
                                      </div>

                                      {/* AUTO VERIFICATION RECOMMENDATION INSIGHT BOX */}
                                      {/* OCR EXTRACTION DATA SUITE */}
                                      {(step.geminiOcrFront || step.geminiOcrBack) && (
                                        <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-2">
                                          <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 font-mono">AUTOMATED OCR IDENTITY EXTRACTION</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono text-slate-300">
                                            <div>
                                              <span className="text-slate-500 text-[8.5px] uppercase block">FULL LEGAL NAME:</span>
                                              <span className="font-bold text-white uppercase">{step.geminiOcrFront?.fullName || step.geminiOcrBack?.fullName || 'NOT FOUND'}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-500 text-[8.5px] uppercase block">DATE OF BIRTH:</span>
                                              <span className="font-bold text-white">{step.geminiOcrFront?.dob || step.geminiOcrBack?.dob || 'NOT FOUND'}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-500 text-[8.5px] uppercase block">DOCUMENT ID NUMBER:</span>
                                              <span className="font-bold text-white uppercase">{step.geminiOcrFront?.idNumber || step.geminiOcrBack?.idNumber || 'NOT FOUND'}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-500 text-[8.5px] uppercase block">EXPIRATION DATE:</span>
                                              <span className="font-bold text-white">{step.geminiOcrFront?.expiryDate || step.geminiOcrBack?.expiryDate || 'NOT FOUND'}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-500 text-[8.5px] uppercase block">CITIZEN NATIONALITY:</span>
                                              <span className="font-bold text-white uppercase">{step.geminiOcrFront?.nationality || step.geminiOcrBack?.nationality || 'NOT FOUND'}</span>
                                            </div>
                                            <div className="col-span-2">
                                              <span className="text-slate-500 text-[8.5px] uppercase block">RESIDENTIAL ADDRESS:</span>
                                              <span className="font-bold text-white uppercase break-words">{step.geminiOcrFront?.address || step.geminiOcrBack?.address || 'NOT FOUND'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* DETAILED FRAUD DEFENSE & SECURITY RISK FLAGS */}
                                      {(step.geminiSecurityFront || step.geminiSecurityBack) && (
                                        <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 space-y-2">
                                          <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 font-mono">ANTI-FRAUD DEFENSE AUDIT METRICS</span>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {step.geminiSecurityFront && (
                                              <div className="bg-slate-900/40 p-2 rounded border border-white/5 space-y-1 text-[9px] font-mono">
                                                <div className="text-slate-300 font-bold">FRONT SIDE SCREENING:</div>
                                                <div className="flex justify-between">
                                                  <span>SCREENSHOT DETECTED:</span>
                                                  <span className={step.geminiSecurityFront.isScreenshot ? 'text-red-400 font-bold' : 'text-slate-500'}>
                                                    {step.geminiSecurityFront.isScreenshot ? 'YES' : 'NO'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>SCREEN PHOTO/MOIRÉ:</span>
                                                  <span className={step.geminiSecurityFront.isPhotoOfScreen ? 'text-red-400 font-bold' : 'text-slate-500'}>
                                                    {step.geminiSecurityFront.isPhotoOfScreen ? 'YES' : 'NO'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>FLAT PAPER PRINT:</span>
                                                  <span className={step.geminiSecurityFront.isPrintedCopy ? 'text-red-400 font-bold' : 'text-slate-500'}>
                                                    {step.geminiSecurityFront.isPrintedCopy ? 'YES' : 'NO'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>REPLAY ATTACK:</span>
                                                  <span className={step.geminiSecurityFront.isImageReplay ? 'text-red-400 font-bold' : 'text-slate-500'}>
                                                    {step.geminiSecurityFront.isImageReplay ? 'YES' : 'NO'}
                                                  </span>
                                                </div>
                                                <div className="pt-1 text-slate-400">
                                                  <span className="text-slate-500 text-[8px] block">SECURITY STATEMENT:</span>
                                                  <span className="normal-case text-slate-300 font-sans leading-relaxed block mt-0.5">"{step.geminiSecurityFront.riskDetails || 'Clear of fraud indicators.'}"</span>
                                                </div>
                                              </div>
                                            )}
                                            {step.geminiSecurityBack && (
                                              <div className="bg-slate-900/40 p-2 rounded border border-white/5 space-y-1 text-[9px] font-mono">
                                                <div className="text-slate-300 font-bold">BACK SIDE SCREENING:</div>
                                                <div className="flex justify-between">
                                                  <span>SCREENSHOT DETECTED:</span>
                                                  <span className={step.geminiSecurityBack.isScreenshot ? 'text-red-400 font-bold' : 'text-slate-500'}>
                                                    {step.geminiSecurityBack.isScreenshot ? 'YES' : 'NO'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>SCREEN PHOTO/MOIRÉ:</span>
                                                  <span className={step.geminiSecurityBack.isPhotoOfScreen ? 'text-red-400 font-bold' : 'text-slate-500'}>
                                                    {step.geminiSecurityBack.isPhotoOfScreen ? 'YES' : 'NO'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>FLAT PAPER PRINT:</span>
                                                  <span className={step.geminiSecurityBack.isPrintedCopy ? 'text-red-400 font-bold' : 'text-slate-500'}>
                                                    {step.geminiSecurityBack.isPrintedCopy ? 'YES' : 'NO'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>REPLAY ATTACK:</span>
                                                  <span className={step.geminiSecurityBack.isImageReplay ? 'text-red-400 font-bold' : 'text-slate-500'}>
                                                    {step.geminiSecurityBack.isImageReplay ? 'YES' : 'NO'}
                                                  </span>
                                                </div>
                                                <div className="pt-1 text-slate-400">
                                                  <span className="text-slate-500 text-[8px] block">SECURITY STATEMENT:</span>
                                                  <span className="normal-case text-slate-300 font-sans leading-relaxed block mt-0.5">"{step.geminiSecurityBack.riskDetails || 'Clear of fraud indicators.'}"</span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-start gap-1.5 text-[9.5px] leading-normal font-sans text-slate-400 pt-0.5">
                                        <span className="text-emerald-400 font-semibold uppercase shrink-0 font-mono">[REC]:</span>
                                        <span>
                                          {((step.geminiConfidenceFront || 100) > 85 && (step.geminiConfidenceBack || 100) > 85 && !(step.geminiSecurityFront?.riskLevel === 'high' || step.geminiSecurityBack?.riskLevel === 'high')) 
                                            ? "Gemini audits passed. Images are authenticated as standard high-fidelity identity documents. Recommended action: APPROVE."
                                            : "One or more sides registered security flags or a slightly lower integrity grade. Cross-reference uploaded image details visually before processing."}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {isAwaitingAdminAction && (
                                <div className="flex gap-2 justify-end pt-1">
                                  <Button
                                    size="sm"
                                    className="h-8 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] px-3 flex items-center gap-1.5"
                                    onClick={() => handleUpdateStepStatus(idx, 'approved')}
                                  >
                                    <Check className="w-3.5 h-3.5" /> APPROVE STEP
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-rose-500/30 hover:bg-rose-500/10 text-rose-500 font-bold text-[10px] px-3 flex items-center gap-1.5"
                                    onClick={() => handleUpdateStepStatus(idx, 'rejected')}
                                  >
                                    <X className="w-3.5 h-3.5" /> REJECT & SEND BACK
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add New Checkpoint Form */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Create New Hold Checkpoint</h4>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 block">Verification Instructions / Prompt</label>
                        <input
                          type="text"
                          value={stepInst}
                          onChange={(e) => setStepInst(e.target.value)}
                          placeholder="e.g., Provide a photo selfie of you holding your ID card next to your face."
                          className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 block">Requested Inputs</label>
                          <select
                            value={stepInputType}
                            onChange={(e: any) => setStepInputType(e.target.value)}
                            className="w-full h-[38px] px-3 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                          >
                            <option value="both">Both (Image & Written text)</option>
                            <option value="image">Image Attachment Only</option>
                            <option value="text">Written Text Message Only</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 block">Required Completion</label>
                          <select
                            value={stepRequired}
                            onChange={(e) => setStepRequired(e.target.value)}
                            className="w-full h-[38px] px-3 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                          >
                            <option value="yes">Yes (Mandatory Milestone)</option>
                            <option value="no">No (Optional Checkpoint)</option>
                          </select>
                        </div>
                      </div>

                      <Button
                        onClick={handleAddVerificationStep}
                        disabled={isAddingStep || !stepInst.trim()}
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:from-slate-800 disabled:to-slate-900 text-slate-950 font-black uppercase tracking-widest text-[10px] h-10 rounded-xl transition-all"
                      >
                        {isAddingStep ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            Appending Milestone Hold...
                          </>
                        ) : (
                          "Add Verification Hold Step"
                        )}
                      </Button>
                    </div>
                  </div>

                </div>

                {/* Footer status notice */}
                <div className="p-4 bg-black/30 border-t border-white/5 text-center">
                  <p className="text-[10px] text-amber-500 font-bold">
                    💡 Real-time Active System: Changes apply instantly. Adding steps automatically places raw pending withdrawals on compliance hold status.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}

function PlansManagement({ plans, isModalOpen, setIsModalOpen, editingPlan, setEditingPlan }: any) {
  const [activeTab, setActiveTab] = useState<"all" | "standard" | "pro">("all");
  const { standardPlans, proPlans, availablePlans } = TradingEngineService.getPlanLists(plans);

  const seedDatabasePlans = async () => {
    toast.loading("Deploying standard system matrix to Firestore...");
    const defaultPlans = [
      { id: "starter", name: "STARTER", minPrice: 1000, maxPrice: 4999, step: 250, expectedReturn: 35, proReturnPct: 200, riskRating: "Low", statusLabel: "Ready", returns: "Projected Outcome", duration: 15, intervals: [1, 2, 3], engineUnlock: "Basic AI Trading Engine", level: "Level 1 Engine", complexity: "Low Complexity", levelDesc: "Basic AI market monitoring and automated capital distribution.", unlockedList: ["AI Trading Engine Access", "Smart Market Analysis"], lockedList: ["Automated Signal Monitoring", "Advanced Portfolio Tracking"], benefits: ["Automated trade execution", "Intelligent capital allocation"] },
      { id: "core", name: "CORE", minPrice: 5000, maxPrice: 9999, step: 500, expectedReturn: 45, proReturnPct: 220, riskRating: "Low", statusLabel: "Ready", returns: "Projected Outcome", duration: 15, intervals: [1, 2, 3, 4, 5], engineUnlock: "Advanced Market Intelligence", level: "Level 2 Engine", complexity: "Medium Complexity", levelDesc: "Advanced analytical modeling and accelerated execution systems.", unlockedList: ["AI Trading Engine Access", "Smart Market Analysis", "Multi-Asset Monitoring"], lockedList: ["Real-Time Event Adaptation"], benefits: ["Enhanced signal prioritization", "Accelerated dynamic execution"] },
      { id: "prime", name: "PRIME", minPrice: 10000, maxPrice: 49999, step: 2500, expectedReturn: 60, proReturnPct: 260, riskRating: "Medium", statusLabel: "Ready", returns: "Projected Outcome", duration: 21, intervals: [1, 2, 3, 4, 5], engineUnlock: "Multi-Market Analytics", level: "Level 3 Engine", complexity: "High Complexity", levelDesc: "Expanded coverage across international exchanges and arbitrage channels.", unlockedList: ["AI Trading Engine Access", "Smart Market Analysis", "Multi-Asset Monitoring", "Real-Time Event Adaptation"], lockedList: [], benefits: ["Cross-market arbitrage simulation", "Volatility adjustment algorithms"] },
      { id: "quantum", name: "QUANTUM", minPrice: 50000, maxPrice: 99999, step: 5000, expectedReturn: 75, proReturnPct: 300, riskRating: "Medium", statusLabel: "Optimized", returns: "Projected Outcome", duration: 30, intervals: [1, 2, 3, 4, 5], engineUnlock: "Institutional Trading Systems", level: "Level 4 Engine", complexity: "Deep Learning Neural", levelDesc: "Deep predictive logic utilizing recurrent networks and macro sentiment analyzers.", unlockedList: ["AI Trading Engine Access", "Smart Market Analysis", "Multi-Asset Monitoring", "Real-Time Event Adaptation"], lockedList: [], benefits: ["Macro sentiment stream analysis", "Predictive hedge simulations"] },
      { id: "apex", name: "APEX", minPrice: 100000, maxPrice: 499999, step: 25000, expectedReturn: 110, proReturnPct: 400, riskRating: "Evaluated", statusLabel: "Optimized", returns: "Projected Outcome", duration: 45, intervals: [1, 2, 3, 4, 5], engineUnlock: "Strategic Allocation Engine", level: "Level 5 Engine", complexity: "Reinforcement Adaptive", levelDesc: "Direct connection to private dark pools and multi-layered reinforcement learning.", unlockedList: ["AI Trading Engine Access", "Smart Market Analysis", "Multi-Asset Monitoring", "Real-Time Event Adaptation"], lockedList: [], benefits: ["Dark pool transaction liquidity", "Reinforcement routing models"] },
      { id: "ultra", name: "ULTRA", minPrice: 500000, maxPrice: 1000000, step: 50000, expectedReturn: 200, proReturnPct: 3400, riskRating: "Evaluated", statusLabel: "Elite", returns: "Projected Outcome", duration: 60, intervals: [1, 2, 3, 4, 5, 6, 7], engineUnlock: "Global Market Access", level: "Level 6 Engine", complexity: "Quantum Hybrid Architecture", levelDesc: "Full institutional custom allocation models with real-time risk hedging.", unlockedList: ["AI Trading Engine Access", "Smart Market Analysis", "Multi-Asset Monitoring", "Real-Time Event Adaptation"], lockedList: [], benefits: ["Bespoke execution pipelines", "Automated collateral rebalancing"] }
    ];

    try {
      for (const p of defaultPlans) {
        await setDoc(doc(db, "plans", p.id), {
          ...p,
          expectedReturn: p.expectedReturn,
          proReturnPct: p.proReturnPct,
          proExpectedReturn: p.proReturnPct,
          expectedOutcome: 1 + (p.expectedReturn / 100),
          minOutcome: 1 + (p.expectedReturn / 100),
          maxOutcome: 1 + (p.expectedReturn / 100),
          proMultiplier: p.proReturnPct >= 100 ? Math.round(p.proReturnPct / 100) : p.proReturnPct,
          min: p.minPrice,
          max: p.maxPrice,
          updatedAt: serverTimestamp()
        });
      }
      toast.dismiss();
      toast.success("Standard system matrix successfully written to Firestore.");
    } catch (e: any) {
      toast.dismiss();
      toast.error("Failed to seed standard plans.");
      console.error(e);
    }
  };

  const handleEdit = (p: any) => {
    const baseId = p.id.replace('_pro', '');
    const rawBasePlan = plans.find((x: any) => x.id === baseId || x.name?.toUpperCase() === baseId.toUpperCase());
    if (rawBasePlan) {
      setEditingPlan(rawBasePlan);
    } else {
      const fallbackStandard = standardPlans.find((sp: any) => sp.id === baseId);
      setEditingPlan(fallbackStandard || p);
    }
    setIsModalOpen(true);
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm("Are you sure you want to clear/reset custom parameters for this model? This action is irreversible on current Firestore document.")) {
      try {
        const baseId = id.replace('_pro', '');
        await deleteDoc(doc(db, "plans", baseId));
        toast.success("Custom parameters cleared. Resetting back to system hardcoded fallback.");
      } catch (e) {
        toast.error("Failed to erase custom configurations.");
      }
    }
  };

  const filteredPlans = availablePlans.filter((p: any) => {
    if (activeTab === "standard") return !p.isPro;
    if (activeTab === "pro") return !!p.isPro;
    return true;
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white flex items-center gap-2">
              <Activity className="w-8 h-8 text-primary" /> Plan Fabrication Unit
            </h2>
            <p className="text-sm text-muted-foreground font-medium">Configure global yield yields, intervals, pro metrics, and AI metadata.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button className="bg-primary hover:bg-primary/90 font-black h-12 px-6 uppercase text-xs tracking-wider" onClick={() => { setEditingPlan(null); setIsModalOpen(true); }}>
              New Custom Model
            </Button>
          </div>
       </div>

       {plans.length === 0 && (
         <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="space-y-1">
             <h4 className="text-base font-black text-amber-500 uppercase italic">Offline Hardcoded Fallback Detected</h4>
             <p className="text-xs font-bold text-muted-foreground uppercase">Firestore plans registry is empty. Deploy the standard matrix with one click to store them permanently in the database so you can edit all standard/pro percentages.</p>
           </div>
           <Button 
             className="bg-amber-500 hover:bg-amber-500/80 font-black text-black px-6 uppercase h-11 text-xs self-start md:self-auto shrink-0 transition-all hover:scale-[1.02]"
             onClick={seedDatabasePlans}
           >
             Deploy Standard Base Grid
           </Button>
         </div>
       )}

       <div className="flex gap-1.5 border-b border-white/5 pb-2">
         {(["all", "standard", "pro"] as const).map((tab) => (
           <Button
             key={tab}
             variant="ghost"
             size="sm"
             onClick={() => setActiveTab(tab)}
             className={`px-4 py-2 uppercase text-xs font-bold tracking-widest rounded-lg transition-all ${
               activeTab === tab
                 ? "bg-primary text-white"
                 : "text-muted-foreground hover:text-white hover:bg-white/5"
             }`}
           >
             {tab === "all" ? "All System Layouts" : tab === "standard" ? "Flex Models" : "Fixed Models"}
           </Button>
         ))}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((p: any) => (
            <Card key={p.id} className="relative bg-black/40 border-white/5 hover:border-primary/50 transition-all p-6 space-y-4 shadow-xl overflow-hidden group">
               <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
               <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                    p.isPro 
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}>
                    {p.isPro ? <Zap className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                  </div>
                  <div className="flex gap-1">
                     <Button variant="ghost" size="icon" className="hover:bg-white/5 text-muted-foreground hover:text-white h-8 w-8" onClick={() => handleEdit(p)} title="Edit Matrix">
                       <Edit className="w-4 h-4" />
                     </Button>
                     <Button variant="ghost" size="icon" className="hover:bg-red-500/10 text-muted-foreground hover:text-red-500 h-8 w-8" onClick={() => handleDeletePlan(p.id)} title="Reset Parameters">
                       <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
               </div>
               <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{p.name}</h3>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      p.isPro 
                        ? "bg-purple-950/40 border-purple-500/30 text-purple-400" 
                        : "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                    }`}>
                      {p.isPro ? "PRO YIELD" : "NORMAL YIELD"}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{p.returns || "Projected Outcome"}</p>
               </div>

               <div className="pt-4 border-t border-white/5 space-y-2.5">
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                    <span>Pricing Threshold</span>
                    <span className="text-white font-mono">{formatCurrency(p.min || p.minPrice)} - {formatCurrency(p.max || p.maxPrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                     <span>Projected Return</span>
                     <span className="text-white font-mono flex items-center gap-1.5">
                       {(() => {
                         const outcomes = TradingEngineService.getPlanOutcomes(p);
                         return (
                           <span className={`font-mono font-black flex items-center gap-1 ${p.isPro ? "text-purple-400" : "text-emerald-400"}`}>
                             +{outcomes.returnPercentage}%
                             <span className="text-[10px] text-cyan-300 font-normal">
                               ({formatCurrency(outcomes.estimatedFinalReturn)} est.)
                             </span>
                           </span>
                         );
                       })()}
                     </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                     <span>Target Cycles</span>
                     <span className="text-white font-mono text-[11px] max-w-[200px] truncate" title={p.cycles}>{p.cycles}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                     <span>Intervals Array</span>
                     <span className="text-white font-mono">{Array.isArray(p.intervals) ? p.intervals.join(", ") : p.intervals} {p.intervals[0] !== 0 ? "Days selection" : "Locked payout"}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                     <span>Completion Timeline</span>
                     <span className="text-white font-mono">{p.duration || 15} Days</span>
                  </div>
               </div>
            </Card>
          ))}
       </div>
    </div>
  );
}

function RewardsManagement({ users, rewards, milestones = [] }: any) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [customRefBalance, setCustomRefBalance] = useState<string>("");
  const [customRefEarnings, setCustomRefEarnings] = useState<string>("");
  const [updatingUser, setUpdatingUser] = useState<boolean>(false);

  // Milestone editing state
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState("");
  const [giftName, setGiftName] = useState("");
  const [giftEnabled, setGiftEnabled] = useState(true);
  const [cashValue, setCashValue] = useState("");
  const [cashEnabled, setCashEnabled] = useState(true);
  const [percentageValue, setPercentageValue] = useState("");
  const [percentageEnabled, setPercentageEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const pendingRewards = rewards.filter((r: any) => r.status === 'pending' || r.status === 'pending_dispatch');
  const pastRewards = rewards.filter((r: any) => r.status === 'completed' || r.status === 'rejected');

  const selectedUser = users.find((u: any) => u.id === selectedUserId || u.uid === selectedUserId);

  useEffect(() => {
    if (selectedUser) {
      setCustomRefBalance(String(selectedUser.referralBalance || 0));
      setCustomRefEarnings(String(selectedUser.total_referral_earnings || 0));
    } else {
      setCustomRefBalance("");
      setCustomRefEarnings("");
    }
  }, [selectedUserId, selectedUser]);

  const localFormatCurrency = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
  };

  const handleAction = async (reward: any, action: 'approve' | 'reject') => {
    try {
      setProcessingId(reward.id);
      const res = await fetch('/api/admin/process-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.id, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process reward');
      toast.success(data.message || `Reward ${action}d successfully`);
    } catch (err: any) {
      toast.error(err.message || 'Error processing reward');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveUserRewardBalances = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user first");
      return;
    }
    try {
      setUpdatingUser(true);
      const uRef = doc(db, 'users', selectedUserId);
      await updateDoc(uRef, {
        referralBalance: Number(customRefBalance) || 0,
        total_referral_earnings: Number(customRefEarnings) || 0,
        updated_at: new Date()
      });
      toast.success("User referral rewards and balances updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update user balances");
    } finally {
      setUpdatingUser(false);
    }
  };

  // Milestone CRUD
  const handleEditMilestone = (m: any) => {
    setEditingMilestoneId(m.id);
    setName(m.name || "");
    setThreshold(String(m.threshold || ""));
    setGiftName(m.giftName || m.t || "");
    setGiftEnabled(m.giftEnabled !== false);
    setCashValue(String(m.cashValue || ""));
    setCashEnabled(m.cashEnabled !== false);
    setPercentageValue(String(m.percentageValue || ""));
    setPercentageEnabled(m.percentageEnabled !== false);
  };

  const handleCancelEdit = () => {
    setEditingMilestoneId(null);
    setName("");
    setThreshold("");
    setGiftName("");
    setGiftEnabled(true);
    setCashValue("");
    setCashEnabled(true);
    setPercentageValue("");
    setPercentageEnabled(true);
  };

  const handleSubmitMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Milestone name is required");
      return;
    }
    if (!threshold.trim() || isNaN(Number(threshold))) {
      toast.error("Valid threshold amount is required");
      return;
    }

    setSaving(true);
    try {
      const milestoneData = {
        name: name.trim(),
        threshold: Number(threshold),
        giftName: giftName.trim(),
        giftEnabled,
        cashValue: cashValue.trim() ? Number(cashValue) : 0,
        cashEnabled,
        percentageValue: percentageValue.trim() ? Number(percentageValue) : 0,
        percentageEnabled,
        updatedAt: new Date()
      };

      if (editingMilestoneId) {
        await updateDoc(doc(db, "milestones", editingMilestoneId), milestoneData);
        toast.success("Milestone updated successfully!");
      } else {
        const nextOrder = milestones.length > 0 ? Math.max(...milestones.map((m: any) => m.order || 0)) + 1 : 1;
        await addDoc(collection(db, "milestones"), {
          ...milestoneData,
          order: nextOrder,
          createdAt: new Date()
        });
        toast.success("Milestone created successfully!");
      }
      handleCancelEdit();
    } catch (err: any) {
      toast.error("Error saving milestone: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    try {
      await deleteDoc(doc(db, "milestones", id));
      toast.success("Milestone deleted successfully!");
    } catch (err: any) {
      toast.error("Error deleting milestone: " + err.message);
    }
  };

  const moveMilestone = async (milestone: any, direction: 'up' | 'down') => {
    const currentIndex = milestones.findIndex((m: any) => m.id === milestone.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= milestones.length) return;

    const targetMilestone = milestones[targetIndex];
    const currentOrder = milestone.order || 0;
    const targetOrder = targetMilestone.order || 0;

    try {
      await updateDoc(doc(db, "milestones", milestone.id), { order: targetOrder });
      await updateDoc(doc(db, "milestones", targetMilestone.id), { order: currentOrder });
      toast.success("Milestone order swapped!");
    } catch (err: any) {
      toast.error("Failed to reorder milestones: " + err.message);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      // Clear existing first
      for (const m of milestones) {
        await deleteDoc(doc(db, "milestones", m.id));
      }

      const defaultMilestones = [
        { threshold: 1000, name: "Starter", giftName: "Smartwatch", cashValue: 100, percentageValue: 10, giftEnabled: true, cashEnabled: true, percentageEnabled: true, order: 1 },
        { threshold: 5000, name: "Core", giftName: "iPhone Pro", cashValue: 500, percentageValue: 10, giftEnabled: true, cashEnabled: true, percentageEnabled: true, order: 2 },
        { threshold: 10000, name: "Prime", giftName: "Resort Pass", cashValue: 1000, percentageValue: 10, giftEnabled: true, cashEnabled: true, percentageEnabled: true, order: 3 },
        { threshold: 50000, name: "Quantum", giftName: "Performance Auto", cashValue: 5000, percentageValue: 10, giftEnabled: true, cashEnabled: true, percentageEnabled: true, order: 4 },
        { threshold: 100000, name: "Apex", giftName: "Real Estate Grant", cashValue: 10000, percentageValue: 10, giftEnabled: true, cashEnabled: true, percentageEnabled: true, order: 5 },
        { threshold: 500000, name: "Ultra", giftName: "Private Jet Charter", cashValue: 50000, percentageValue: 10, giftEnabled: true, cashEnabled: true, percentageEnabled: true, order: 6 },
      ];

      for (const m of defaultMilestones) {
        await addDoc(collection(db, "milestones"), {
          ...m,
          createdAt: new Date()
        });
      }
      toast.success("Successfully seeded 6 system default milestones!");
    } catch (err: any) {
      toast.error("Failed to seed default milestones: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-12 mt-12">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
           <h2 className="text-2xl font-black tracking-tighter uppercase italic text-white flex items-center gap-2">
             Reward & Milestone Control <Trophy className="w-6 h-6 text-[#f59e0b]" />
           </h2>
           <p className="text-sm text-muted-foreground mt-1">
             Configure growth tiers, physical gifts, cash values, and track user claims in real-time.
           </p>
         </div>
         <div className="flex gap-3">
           <Button
             onClick={handleSeedDefaults}
             disabled={seeding}
             className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all border border-white/10"
           >
             {seeding ? "SEEDING CONFIG..." : "⚡ SEED 6-TIER DEFAULTS"}
           </Button>
           <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl text-primary font-bold flex items-center justify-center text-xs uppercase tracking-wider shadow-lg shadow-primary/5">
             {pendingRewards.length} Claims Pending
           </div>
         </div>
       </div>

       {/* MILESTONE CONVERGENCE BUILDER / MATRIX CONFIGURATOR */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Milestone Editor Form */}
         <div className="lg:col-span-5 space-y-6">
           <Card className="bg-black/40 border-white/5 p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl">
             <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-transparent" />
             <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2 mb-1">
               {editingMilestoneId ? "⚙️ Edit Milestone Goal" : "➕ Create Milestone Goal"}
             </h3>
             <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-6">
               Define targets, titles, and select multiple dynamic payout structures.
             </p>

             <form onSubmit={handleSubmitMilestone} className="space-y-5">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">Milestone Title / Level Name</label>
                 <input
                   type="text"
                   required
                   className="w-full bg-[#070b12] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary font-bold tracking-wide uppercase"
                   placeholder="e.g. Silver, Gold, Prime"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">Qualifying Target Amount ($)</label>
                 <input
                   type="number"
                   required
                   min="1"
                   className="w-full bg-[#070b12] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary font-mono font-bold"
                   placeholder="e.g. 5000"
                   value={threshold}
                   onChange={(e) => setThreshold(e.target.value)}
                 />
               </div>

               {/* Reward Toggle Cards */}
               <div className="space-y-4 pt-4 border-t border-white/5">
                 <div className="text-[10px] font-black uppercase text-slate-300 tracking-wider mb-2">Reward Configuration Options</div>

                 {/* PHYSICAL/DIGITAL GIFT */}
                 <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-black text-white uppercase italic flex items-center gap-2">
                       🎁 Physical/Digital Gift
                     </span>
                     <button
                       type="button"
                       onClick={() => setGiftEnabled(!giftEnabled)}
                       className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${giftEnabled ? 'bg-primary' : 'bg-white/10'}`}
                     >
                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${giftEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                     </button>
                   </div>
                   {giftEnabled && (
                     <input
                       type="text"
                       required
                       className="w-full bg-[#070b12]/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                       placeholder="e.g. Premium Gift, VIP Pass"
                       value={giftName}
                       onChange={(e) => setGiftName(e.target.value)}
                     />
                   )}
                 </div>

                 {/* CASH REWARD */}
                 <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-black text-white uppercase italic flex items-center gap-2">
                       💰 Alternative Cash Value ($)
                     </span>
                     <button
                       type="button"
                       onClick={() => setCashEnabled(!cashEnabled)}
                       className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${cashEnabled ? 'bg-primary' : 'bg-white/10'}`}
                     >
                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cashEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                     </button>
                   </div>
                   {cashEnabled && (
                     <input
                       type="number"
                       required
                       min="0"
                       className="w-full bg-[#070b12]/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
                       placeholder="e.g. 500"
                       value={cashValue}
                       onChange={(e) => setCashValue(e.target.value)}
                     />
                   )}
                 </div>

                 {/* PERCENTAGE REWARD */}
                 <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-black text-white uppercase italic flex items-center gap-2">
                       📊 Percentage Yield Bonus (%)
                     </span>
                     <button
                       type="button"
                       onClick={() => setPercentageEnabled(!percentageEnabled)}
                       className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${percentageEnabled ? 'bg-primary' : 'bg-white/10'}`}
                     >
                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${percentageEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                     </button>
                   </div>
                   {percentageEnabled && (
                     <input
                       type="number"
                       required
                       min="0"
                       max="100"
                       className="w-full bg-[#070b12]/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
                       placeholder="e.g. 5"
                       value={percentageValue}
                       onChange={(e) => setPercentageValue(e.target.value)}
                     />
                   )}
                 </div>
               </div>

               <div className="flex gap-3 pt-4">
                 {editingMilestoneId && (
                   <Button
                     type="button"
                     variant="outline"
                     className="flex-1 border-white/10 text-slate-300 hover:bg-white/5 rounded-xl font-bold uppercase tracking-wider text-xs"
                     onClick={handleCancelEdit}
                   >
                     Cancel
                   </Button>
                 )}
                 <Button
                   type="submit"
                   disabled={saving}
                   className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20"
                 >
                   {saving ? "SAVING PARAMETERS..." : editingMilestoneId ? "SAVE MILESTONE" : "CREATE MILESTONE"}
                 </Button>
               </div>
             </form>
           </Card>

           {/* LIVE PREVIEW BLOCK */}
           <Card className="bg-gradient-to-br from-indigo-950/20 to-black/60 border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono text-[9px] font-black uppercase rounded tracking-widest">
                LIVE USER PREVIEW
              </div>
              <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-4">Milestone Card Mockup</h4>
              <div className="bg-[#0b0f19] p-5 rounded-xl border border-white/5 space-y-4 shadow-xl">
                 <div className="flex justify-between items-start">
                   <div>
                     <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">GOAL REQUIREMENT</span>
                     <h5 className="text-lg font-black text-white uppercase italic tracking-tighter mt-0.5">{name || "Milestone Title"}</h5>
                   </div>
                   <div className="text-right">
                     <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">TARGET FUNDS</span>
                     <div className="text-sm font-extrabold text-primary font-mono mt-0.5">{localFormatCurrency(threshold || 0)}</div>
                   </div>
                 </div>

                 <div className="pt-3 border-t border-white/5 space-y-2">
                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">ACTIVATED REWARD MATRIX:</span>
                   <div className="grid grid-cols-1 gap-1.5">
                     {giftEnabled && giftName && (
                       <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5">
                         <span>🎁</span>
                         <span className="font-medium">{giftName}</span>
                         <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 border-none text-[8px] font-bold uppercase">PHYSICAL DISPATCH</Badge>
                       </div>
                     )}
                     {cashEnabled && cashValue && (
                       <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5">
                         <span>💰</span>
                         <span className="font-medium">Alternative Cash Conversion</span>
                         <span className="ml-auto font-mono text-green-400 font-bold">+{localFormatCurrency(cashValue)}</span>
                       </div>
                     )}
                     {percentageEnabled && percentageValue && (
                       <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5">
                         <span>📊</span>
                         <span className="font-medium">Yield Output Multiplier</span>
                         <span className="ml-auto font-mono text-blue-400 font-bold">+{percentageValue}%</span>
                       </div>
                     )}
                     {(!giftEnabled || !giftName) && (!cashEnabled || !cashValue) && (!percentageEnabled || !percentageValue) && (
                       <div className="text-xs text-muted-foreground italic text-center py-2">No rewards activated for this tier yet.</div>
                     )}
                   </div>
                 </div>
              </div>
           </Card>
         </div>

         {/* Milestones Configuration Grid list */}
         <div className="lg:col-span-7 space-y-6">
           <Card className="bg-black/40 border-white/5 p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl">
             <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-2 mb-1">
               📊 Active Goal Milestones ({milestones.length})
             </h3>
             <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-6">
               View, prioritize, delete, or quickly modify global goal milestones.
             </p>

             {milestones.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                   <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-bounce" />
                   <h4 className="text-sm font-black text-white uppercase tracking-wider">No Milestone Goals Loaded</h4>
                   <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-2">
                     Click "SEED 6-TIER DEFAULTS" at the top right to instantly configure the high-converting default milestone structure.
                   </p>
                </div>
             ) : (
                <div className="space-y-4">
                  {milestones.map((m: any, idx: number) => {
                    const isEditing = editingMilestoneId === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`p-5 rounded-2xl border transition-all relative group ${
                          isEditing 
                            ? 'bg-primary/10 border-primary/40 shadow-xl shadow-primary/5' 
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-black text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                                TIER #{String(idx + 1).padStart(2, "0")}
                              </span>
                              <h4 className="text-base font-black text-white uppercase italic tracking-tighter">{m.name}</h4>
                            </div>
                            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1.5 flex items-center gap-2">
                              Target Level: <span className="text-primary font-mono font-bold">{localFormatCurrency(m.threshold)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
                            {/* Reorder Up */}
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={idx === 0}
                              className="h-8 w-8 hover:bg-white/5 text-muted-foreground hover:text-white rounded-lg disabled:opacity-30"
                              onClick={() => moveMilestone(m, 'up')}
                              title="Move Tier Up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            {/* Reorder Down */}
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={idx === milestones.length - 1}
                              className="h-8 w-8 hover:bg-white/5 text-muted-foreground hover:text-white rounded-lg disabled:opacity-30"
                              onClick={() => moveMilestone(m, 'down')}
                              title="Move Tier Down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <div className="w-[1px] h-4 bg-white/10 mx-1" />
                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-white/5 text-muted-foreground hover:text-white rounded-lg"
                              onClick={() => handleEditMilestone(m)}
                              title="Edit Parameters"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg"
                              onClick={() => handleDeleteMilestone(m.id)}
                              title="Delete Goal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Configured Rewards badges list */}
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                          {m.giftEnabled && m.giftName ? (
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 uppercase tracking-wide">
                              🎁 Gift: {m.giftName}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-slate-500 bg-white/[0.01] border border-white/5 px-2.5 py-1 rounded-lg flex items-center gap-1 line-through uppercase tracking-wide opacity-50">
                              🎁 Gift (Disabled)
                            </span>
                          )}

                          {m.cashEnabled && m.cashValue ? (
                            <span className="text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 uppercase tracking-wide">
                              💰 Cash: {localFormatCurrency(m.cashValue)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-slate-500 bg-white/[0.01] border border-white/5 px-2.5 py-1 rounded-lg flex items-center gap-1 line-through uppercase tracking-wide opacity-50">
                              💰 Cash (Disabled)
                            </span>
                          )}

                          {m.percentageEnabled && m.percentageValue ? (
                            <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 uppercase tracking-wide">
                              📊 Percentage: {m.percentageValue}%
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-slate-500 bg-white/[0.01] border border-white/5 px-2.5 py-1 rounded-lg flex items-center gap-1 line-through uppercase tracking-wide opacity-50">
                              📊 Percentage (Disabled)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
             )}
           </Card>
         </div>
       </div>

       {/* ADMIN MANUAL REFERRAL REWARD ADJUSTER */}
       <Card className="bg-black/40 border-white/5 p-6 rounded-2xl backdrop-blur-xl">
         <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-tight italic">
           <DollarSign className="w-5 h-5 text-green-400 animate-pulse" /> Admin User Reward & Referral Balance Adjuster
         </h3>
         <p className="text-xs text-muted-foreground mb-6 uppercase tracking-wide font-semibold">
           Select any user to adjust what they receive in cash rewards or manually update their Referral Balance and Total Referral Earnings.
         </p>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
             <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block mb-1.5">Select User</label>
             <select
               className="w-full bg-[#0d121d] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary font-bold"
               value={selectedUserId}
               onChange={(e) => setSelectedUserId(e.target.value)}
             >
               <option value="">-- Choose User --</option>
               {users.map((u: any) => (
                 <option key={u.id || u.uid} value={u.id || u.uid}>
                   {u.username || u.fullName || u.email} ({u.email})
                 </option>
               ))}
             </select>
           </div>

           <div>
             <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block mb-1.5">Referral Balance ($)</label>
             <input
               type="number"
               className="w-full bg-[#0d121d] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
               placeholder="0.00"
               value={customRefBalance}
               onChange={(e) => setCustomRefBalance(e.target.value)}
               disabled={!selectedUserId}
             />
           </div>

           <div>
             <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider block mb-1.5">Total Referral Earnings ($)</label>
             <input
               type="number"
               className="w-full bg-[#0d121d] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
               placeholder="0.00"
               value={customRefEarnings}
               onChange={(e) => setCustomRefEarnings(e.target.value)}
               disabled={!selectedUserId}
             />
           </div>
         </div>

         <div className="mt-4 flex justify-end">
           <Button
             className="bg-green-500 hover:bg-green-600 text-black font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-widest shadow-lg shadow-green-500/15"
             disabled={!selectedUserId || updatingUser}
             onClick={handleSaveUserRewardBalances}
           >
             {updatingUser ? "Saving..." : "Save Adjustments"}
           </Button>
         </div>
       </Card>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Pending */}
         <Card className="bg-black/40 border-white/5 overflow-hidden flex flex-col backdrop-blur-xl">
           <div className="p-4 border-b border-white/5 bg-white/[0.02]">
             <h3 className="font-bold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-orange-400 animate-pulse" /> Pending Claims</h3>
           </div>
           <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[600px] custom-scrollbar">
             {pendingRewards.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground italic text-sm">No pending claims.</div>
             ) : (
                pendingRewards.map((reward: any) => (
                  <div key={reward.id} className="bg-[#0f1219] p-4 rounded-xl border border-white/5 relative">
                     <div className="flex items-start justify-between mb-2">
                        <div>
                           <div className="font-bold text-white">{reward.username}</div>
                           <div className="text-xs text-muted-foreground">{reward.userEmail}</div>
                        </div>
                        <Badge className={`${reward.claimType === 'cash' ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-blue-500/20 text-blue-400 border-blue-500/20'}`}>
                           {reward.claimType === 'cash' ? 'Cash Conversion' : 'Physical Delivery'}
                        </Badge>
                     </div>
                     <div className="text-sm text-slate-300 mt-3 mb-4">
                        <span className="text-white font-bold">{reward.tierLabel}</span>: {reward.rewardItem}
                        {reward.claimType === 'cash' && (
                           <div className="mt-1 text-green-400 font-bold flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> ${reward.cashValue} Cash
                           </div>
                        )}
                        {reward.claimType === 'physical' && (
                           <div className="mt-2 text-xs bg-black/40 p-2 rounded text-slate-400 font-mono">
                              {reward.deliveryAddress}
                           </div>
                        )}
                     </div>
                     <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 font-bold"
                          disabled={processingId === reward.id}
                          onClick={() => handleAction(reward, 'approve')}
                        >
                          {processingId === reward.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Approve</>}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold"
                          disabled={processingId === reward.id}
                          onClick={() => handleAction(reward, 'reject')}
                        >
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                     </div>
                  </div>
                ))
             )}
           </div>
         </Card>

         {/* History */}
         <Card className="bg-black/40 border-white/5 overflow-hidden flex flex-col backdrop-blur-xl">
           <div className="p-4 border-b border-white/5 bg-white/[0.02]">
             <h3 className="font-bold text-white flex items-center gap-2"><Database className="w-4 h-4 text-primary animate-pulse" /> Reward History</h3>
           </div>
           <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[600px] custom-scrollbar">
             {pastRewards.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground italic text-sm">No reward history.</div>
             ) : (
                pastRewards.map((reward: any) => (
                  <div key={reward.id} className="bg-white/[0.02] p-4 rounded-xl border border-white/5 opacity-70">
                     <div className="flex items-start justify-between">
                        <div>
                           <div className="font-bold text-white">{reward.username}</div>
                           <div className="text-xs text-muted-foreground">{reward.tierLabel} - {reward.rewardItem}</div>
                        </div>
                        <Badge className={`${reward.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                           {reward.status.toUpperCase()}
                        </Badge>
                     </div>
                     <div className="text-[10px] text-muted-foreground mt-2">
                        {reward.updatedAt ? new Date(reward.updatedAt.seconds ? reward.updatedAt.toDate() : reward.updatedAt).toLocaleString() : ''}
                     </div>
                  </div>
                ))
             )}
           </div>
         </Card>
       </div>
    </div>
  );
}




function PlanModal({ isOpen, setIsModalOpen, editingPlan }: any) {
  if (!isOpen) return null;

  return <PlanModalInner key={editingPlan?.id || "new"} isOpen={isOpen} setIsModalOpen={setIsModalOpen} editingPlan={editingPlan} />;
}

function PlanModalInner({ isOpen, setIsModalOpen, editingPlan }: any) {
  const [name, setName] = useState(editingPlan?.name || "STARTER");
  const [minPrice, setMinPrice] = useState<number>(editingPlan?.minPrice ?? editingPlan?.min ?? 1000);
  const [maxPrice, setMaxPrice] = useState<number>(editingPlan?.maxPrice ?? editingPlan?.max ?? 4999);
  const [step, setStep] = useState<number>(editingPlan?.step ?? 250);
  const [duration, setDuration] = useState<number>(editingPlan?.duration ?? 15);
  const [popular, setPopular] = useState<boolean>(editingPlan?.popular ?? false);
  const [intervalsStr, setIntervalsStr] = useState<string>(
    Array.isArray(editingPlan?.intervals) ? editingPlan.intervals.join(", ") : (editingPlan?.intervals || "1, 2, 3")
  );
  const [tag, setTag] = useState<string>(editingPlan?.planTag ?? editingPlan?.name?.toUpperCase() ?? "STARTER");

  // Percentage returns
  const getFlexDefault = () => {
    if (editingPlan?.expectedReturn !== undefined && editingPlan?.expectedReturn !== null) {
      return Number(editingPlan.expectedReturn);
    }
    if (editingPlan?.return_pct !== undefined && editingPlan?.return_pct !== null) {
      return Number(editingPlan.return_pct);
    }
    if (editingPlan?.expectedOutcome !== undefined && editingPlan?.expectedOutcome !== null) {
      const val = Number(editingPlan.expectedOutcome);
      return val > 10 ? val : Math.round((val - 1) * 100);
    }
    const nameUpper = (editingPlan?.name || "").toUpperCase();
    if (nameUpper.includes("CORE")) return 45;
    if (nameUpper.includes("PRIME")) return 60;
    if (nameUpper.includes("QUANTUM")) return 75;
    if (nameUpper.includes("APEX")) return 110;
    if (nameUpper.includes("ULTRA")) return 200;
    return 35;
  };

  const getFixedDefault = () => {
    if (editingPlan?.proReturnPct !== undefined && editingPlan?.proReturnPct !== null) {
      return Number(editingPlan.proReturnPct);
    }
    if (editingPlan?.proExpectedReturn !== undefined && editingPlan?.proExpectedReturn !== null) {
      return Number(editingPlan.proExpectedReturn);
    }
    if (editingPlan?.proMultiplier !== undefined && editingPlan?.proMultiplier !== null) {
      const pm = Number(editingPlan.proMultiplier);
      if (pm >= 10) return pm;
      if (pm === 7) return 3400;
    }
    const nameUpper = (editingPlan?.name || "").toUpperCase();
    if (nameUpper.includes("CORE")) return 220;
    if (nameUpper.includes("PRIME")) return 260;
    if (nameUpper.includes("QUANTUM")) return 300;
    if (nameUpper.includes("APEX")) return 400;
    if (nameUpper.includes("ULTRA")) return 3400;
    return 200;
  };

  const [flexReturnPct, setFlexReturnPct] = useState<number>(getFlexDefault());
  const [fixedReturnPct, setFixedReturnPct] = useState<number>(getFixedDefault());

  // Risk & Engine Config
  const [riskRating, setRiskRating] = useState<string>(editingPlan?.riskRating || "Low");
  const [statusLabel, setStatusLabel] = useState<string>(editingPlan?.statusLabel || "Ready");
  const [confidenceLevel, setConfidenceLevel] = useState<string>(editingPlan?.confidenceLevel || "High");
  const [level, setLevel] = useState<string>(editingPlan?.level || "");
  const [complexity, setComplexity] = useState<string>(editingPlan?.complexity || "");
  const [levelDesc, setLevelDesc] = useState<string>(editingPlan?.levelDesc || "");
  const [unlockedListStr, setUnlockedListStr] = useState<string>(
    Array.isArray(editingPlan?.unlockedList) ? editingPlan.unlockedList.join(", ") : (editingPlan?.unlockedList || "")
  );
  const [lockedListStr, setLockedListStr] = useState<string>(
    Array.isArray(editingPlan?.lockedList) ? editingPlan.lockedList.join(", ") : (editingPlan?.lockedList || "")
  );
  const [benefitsStr, setBenefitsStr] = useState<string>(
    Array.isArray(editingPlan?.benefits) ? editingPlan.benefits.join(", ") : (editingPlan?.benefits || "")
  );

  // Live Summary Calculations
  const parsedIntervals = intervalsStr
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => !isNaN(n) && n > 0);

  const validMin = Math.max(1, Number(minPrice) || 0);
  const flexProfit = Math.round(validMin * ((Number(flexReturnPct) || 0) / 100));
  const flexTotalReturn = validMin + flexProfit;

  const fixedProfit = Math.round(validMin * ((Number(fixedReturnPct) || 0) / 100));
  const fixedTotalReturn = validMin + fixedProfit;

  const handleSave = async () => {
    if (!name || isNaN(validMin) || isNaN(flexReturnPct)) {
      toast.error("Please enter valid plan name and return percentage");
      return;
    }

    const parsedIntervals = intervalsStr
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => !isNaN(n) && n > 0);

    const flexOutcomeVal = 1 + (Number(flexReturnPct) / 100);
    const fixedProMult = Number(fixedReturnPct) >= 100 ? Math.round(Number(fixedReturnPct) / 100) : Number(fixedReturnPct);

    const planData = {
      name: name.trim(),
      expectedReturn: Number(flexReturnPct),
      proReturnPct: Number(fixedReturnPct),
      proExpectedReturn: Number(fixedReturnPct),
      minPrice: Number(minPrice) || 1000,
      maxPrice: Number(maxPrice) || 4999,
      min: Number(minPrice) || 1000,
      max: Number(maxPrice) || 4999,
      step: Number(step) || 250,
      duration: Number(duration) || 15,
      popular: Boolean(popular),
      intervals: parsedIntervals.length > 0 ? parsedIntervals : [1, 2, 3],
      planTag: tag || name.toUpperCase(),
      riskRating: riskRating || "Low",
      statusLabel: statusLabel || "Ready",
      confidenceLevel: confidenceLevel || "High",
      level: level || "",
      complexity: complexity || "",
      levelDesc: levelDesc || "",
      unlockedList: unlockedListStr ? unlockedListStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      lockedList: lockedListStr ? lockedListStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      benefits: benefitsStr ? benefitsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      
      // Backward-compatible computed outcome multipliers
      expectedOutcome: flexOutcomeVal,
      minOutcome: flexOutcomeVal,
      maxOutcome: flexOutcomeVal,
      proMultiplier: fixedProMult,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingPlan) {
        await setDoc(doc(db, "plans", editingPlan.id), planData, { merge: true });
        toast.success("Plan matrix updated successfully!");
      } else {
        await addDoc(collection(db, "plans"), {
          ...planData,
          createdAt: serverTimestamp()
        });
        toast.success("New plan deployed successfully!");
      }
      setIsModalOpen(false);
    } catch (e: any) {
      console.error("Plan save error:", e);
      toast.error("Failed to save plan to database.");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={() => setIsModalOpen(false)}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl bg-[#0F172A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0d1322]">
            <div>
              <CardTitle className="text-xl font-black uppercase italic tracking-wider text-white">
                {editingPlan ? `Edit ${editingPlan.name} Plan` : "Create New Investment Plan"}
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Set exact percentage returns matching the frontend user dashboard summary.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsModalOpen(false)}
              className="hover:bg-white/5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
            {/* Basic Identification */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Plan Name</label>
                <input
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. STARTER"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">System Tag</label>
                <select
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                >
                  <option value="STARTER">STARTER</option>
                  <option value="CORE">CORE</option>
                  <option value="PRIME">PRIME</option>
                  <option value="QUANTUM">QUANTUM</option>
                  <option value="APEX">APEX</option>
                  <option value="ULTRA">ULTRA</option>
                </select>
              </div>
            </div>

            {/* Entry Capital Limits */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Min Capital ($)</label>
                <input
                  type="number"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Max Capital ($)</label>
                <input
                  type="number"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Step ($)</label>
                <input
                  type="number"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none"
                  value={step}
                  onChange={(e) => setStep(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Projected Percentage Returns Inputs */}
            <div className="bg-[#090d16] border border-cyan-500/30 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-400">
                  Projected Return Percentage Configuration
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block">
                    Flex Model Return (%)
                  </label>
                  <p className="text-[10px] text-slate-400">Used for recurring Flex cycles</p>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-black/60 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-base font-mono font-black text-emerald-400 focus:border-emerald-400 focus:outline-none pr-8"
                      value={flexReturnPct}
                      onChange={(e) => setFlexReturnPct(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-2.5 text-emerald-500 font-bold">%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-purple-400 uppercase tracking-wider block">
                    Fixed Pro Return (%)
                  </label>
                  <p className="text-[10px] text-slate-400">Used for one-time Fixed payouts</p>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-black/60 border border-purple-500/40 rounded-xl px-4 py-2.5 text-base font-mono font-black text-purple-400 focus:border-purple-400 focus:outline-none pr-8"
                      value={fixedReturnPct}
                      onChange={(e) => setFixedReturnPct(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-2.5 text-purple-500 font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Return Forecast Card Preview */}
              {(() => {
                const previewInterval = (parsedIntervals && parsedIntervals.length > 0) ? parsedIntervals[0] : 3;
                const flexProj = calculateInvestmentProjection({
                  principal: validMin,
                  returnPercentage: flexReturnPct,
                  durationDays: duration || 15,
                  recurringIntervalDays: previewInterval,
                  model: 'flex'
                });
                return (
                  <div className="bg-[#0f172a] border border-blue-500/30 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                      <span className="text-[11px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Live Dashboard Summary Forecast Preview
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Entry Capital: {formatCurrency(validMin)}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-[#090d16] border border-emerald-500/20 rounded-lg p-3 space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block border-b border-white/5 pb-1">
                          PLAN PERFORMANCE (Flex Model)
                        </span>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Capital Invested:</span>
                          <span className="text-white font-mono font-bold">{formatCurrency(flexProj.principal)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Recurring Allocation:</span>
                          <span className="text-white font-mono font-medium">{formatCurrency(flexProj.recurringAllocation)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Interval:</span>
                          <span className="text-white font-mono font-medium">Every {previewInterval} Days</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Profit Per Allocation:</span>
                          <span className="text-emerald-400 font-mono font-bold">+{formatCurrency(flexProj.profitPerAllocation)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Allocation + Profit:</span>
                          <span className="text-cyan-300 font-mono font-bold">{formatCurrency(flexProj.allocationValue)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Cumulative Forecast:</span>
                          <span className="text-white font-mono font-bold">{formatCurrency(flexProj.estimatedFinalReturn)}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                          <span className="text-slate-400">Progress:</span>
                          <span className="text-blue-400 font-mono font-bold">0/{flexProj.totalAllocations} Allocations</span>
                        </div>
                      </div>

                      <div className="bg-[#090d16] border border-purple-500/20 rounded-lg p-3 space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 block border-b border-white/5 pb-1">
                          Fixed Pro Summary
                        </span>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Capital Invested:</span>
                          <span className="text-white font-mono font-bold">{formatCurrency(validMin)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Projected Return ({fixedReturnPct}%):</span>
                          <span className="text-purple-400 font-mono font-bold">+{formatCurrency(fixedProfit)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Duration:</span>
                          <span className="text-white font-mono font-medium">{duration || 15} Days</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                          <span className="text-slate-300 font-bold">Est. Final Return:</span>
                          <span className="text-cyan-300 font-mono font-black">{formatCurrency(fixedTotalReturn)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Timeline & Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Total Duration (Days)</label>
                <input
                  type="number"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5 flex items-center pt-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 bg-black text-primary focus:ring-primary"
                    checked={popular}
                    onChange={(e) => setPopular(e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-slate-200">Mark as Popular</span>
                </label>
              </div>
            </div>

            {/* Risk, Status, Forecast Confidence */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Risk Rating</label>
                <input
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  value={riskRating}
                  onChange={(e) => setRiskRating(e.target.value)}
                  placeholder="Low, Medium..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Status Label</label>
                <input
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  value={statusLabel}
                  onChange={(e) => setStatusLabel(e.target.value)}
                  placeholder="Ready, Optimized..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Confidence</label>
                <input
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(e.target.value)}
                  placeholder="High, 99%..."
                />
              </div>
            </div>

            {/* Allowed Intervals */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase block">Allowed Intervals (Days)</label>
              <input
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                value={intervalsStr}
                onChange={(e) => setIntervalsStr(e.target.value)}
                placeholder="1, 3, 5, 7"
              />
            </div>

            {/* Aetheris Engine Details */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest">
                Aetheris AI Engine Architecture
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Engine Access Level</label>
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    placeholder="Level 1 Engine"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">System Complexity</label>
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    value={complexity}
                    onChange={(e) => setComplexity(e.target.value)}
                    placeholder="Low Complexity"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Level Description</label>
                <textarea
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white h-16 resize-none focus:border-cyan-500 focus:outline-none"
                  value={levelDesc}
                  onChange={(e) => setLevelDesc(e.target.value)}
                  placeholder="Basic AI market monitoring..."
                />
              </div>

              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Features Unlocked (Comma separated)</label>
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    value={unlockedListStr}
                    onChange={(e) => setUnlockedListStr(e.target.value)}
                    placeholder="AI Trading Access, Smart Market Analysis"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Features Locked (Comma separated)</label>
                  <input
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    value={lockedListStr}
                    onChange={(e) => setLockedListStr(e.target.value)}
                    placeholder="Automated Signal Monitoring..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Benefits (Comma separated)</label>
                  <textarea
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white h-16 resize-none focus:border-cyan-500 focus:outline-none"
                    value={benefitsStr}
                    onChange={(e) => setBenefitsStr(e.target.value)}
                    placeholder="Automated trade execution, Intelligent capital allocation"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-white/5 bg-[#0d1322] flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 hover:bg-white/5 border-white/10 text-slate-300 font-bold"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold shadow-lg"
              onClick={handleSave}
            >
              {editingPlan ? "Update Matrix" : "Deploy Plan"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function DatabaseWiper({ users = [] }: { users?: any[] }) {
  const [passcode, setPasscode] = useState("7777");
  const [isConfirming, setIsConfirming] = useState(false);
  const [preserveAdmins, setPreserveAdmins] = useState(true);

  // Targeted user database purge states
  const [activeTab, setActiveTab] = useState<"targeted" | "global">("targeted");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [customUserSearch, setCustomUserSearch] = useState<string>("");
  const [targetedMode, setTargetedMode] = useState<"keep_account" | "delete_account">("keep_account");
  const [targetedPasscode, setTargetedPasscode] = useState<string>("7777");
  const [isTargetedConfirming, setIsTargetedConfirming] = useState<boolean>(false);

  const handleGlobalWipe = async () => {
    if (!passcode) {
      toast.error("Please enter authority passcode");
      return;
    }
    toast.loading("Initiating global database wipe...");
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/admin/wipe-database`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, preserveAdmins })
      });
      if (!res.ok) {
         const d = await res.json();
         throw new Error(d.error || "API request failed");
      }
      toast.dismiss();
      toast.success("Database has been completely purged.");
      setIsConfirming(false);
      setPasscode("");
    } catch (error: any) {
      console.error(error);
      toast.dismiss();
      toast.error(error.message || "Failed to execute database purge.");
    }
  };

  const handleTargetedUserWipe = async () => {
     if (!targetedPasscode) {
        toast.error("Please enter authority passcode");
        return;
     }
     const selectedObj = users.find((u: any) => u.id === selectedUserId);
     const targetEmail = selectedObj?.email || customUserSearch;
     if (!selectedUserId && !customUserSearch) {
        toast.error("Please select a user or enter a user email/ID.");
        return;
     }

     toast.loading("Initiating targeted user database purge...");
     try {
       const baseUrl = (import.meta as any).env.VITE_API_URL || "";
       const res = await fetch(`${baseUrl}/api/admin/clear-user-database`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            targetUserId: selectedUserId,
            targetEmail: customUserSearch,
            passcode: targetedPasscode,
            mode: targetedMode
         })
       });
       let d: any = {};
       try {
         const text = await res.text();
         d = JSON.parse(text);
       } catch (e) {
         throw new Error("Server returned status " + res.status);
       }
       if (!res.ok || !d.success) {
          throw new Error(d.error || d.message || "Failed to clear user database");
       }
       toast.dismiss();
       toast.success(`User database purged successfully (${d.deletedRecordsCount || 0} records deleted).`);
       setIsTargetedConfirming(false);
       setTargetedPasscode("");
       setSelectedUserId("");
       setCustomUserSearch("");
     } catch (error: any) {
        toast.dismiss();
        toast.error(error.message || "Failed to clear user database.");
     }
  };

  return (
    <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-xl mt-12">
      <CardHeader>
        <CardTitle className="flex items-center text-red-500 uppercase font-black tracking-tighter text-xl italic">
          <Trash2 className="w-6 h-6 mr-3" /> Database Purge Protocol
        </CardTitle>
        <CardDescription className="uppercase font-bold tracking-widest text-[10px] text-red-500/60">
          Clear specific user database records or execute global database deletion.
        </CardDescription>

        <div className="flex gap-2 mt-4 p-1 bg-black/40 rounded-xl border border-white/10 w-fit">
           <button
              type="button"
              onClick={() => setActiveTab("targeted")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === "targeted" ? "bg-red-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
           >
              <User className="w-3.5 h-3.5" /> Targeted User Purge
           </button>
           <button
              type="button"
              onClick={() => setActiveTab("global")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === "global" ? "bg-red-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
           >
              <Database className="w-3.5 h-3.5" /> Global System Purge
           </button>
        </div>
      </CardHeader>
      <CardContent>
         {activeTab === "targeted" ? (
            <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20 space-y-4">
               <div>
                  <h4 className="text-base font-black text-white uppercase italic">Clear Specific User Database</h4>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                     Wipe trades, investments, payments, withdrawals, support tickets, notifications, and logs for a selected user.
                  </p>
               </div>

               <div className="space-y-4 pt-2">
                  <div>
                     <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">Select User</label>
                     <select
                        value={selectedUserId}
                        onChange={(e) => {
                           setSelectedUserId(e.target.value);
                           if (e.target.value) {
                              const found = users.find((u: any) => u.id === e.target.value);
                              if (found) setCustomUserSearch(found.email || "");
                           }
                        }}
                        className="w-full bg-black/70 border border-red-500/30 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-red-500"
                     >
                        <option value="">-- Select from user list --</option>
                        {users.map((u: any) => (
                           <option key={u.id} value={u.id}>
                              {u.email || u.id} ({u.name || u.unique_tag || 'User'})
                           </option>
                        ))}
                     </select>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">Or Manual User Email / ID Search</label>
                     <input
                        type="text"
                        placeholder="e.g. user@example.com or user_uid_123"
                        value={customUserSearch}
                        onChange={(e) => setCustomUserSearch(e.target.value)}
                        className="w-full bg-black/70 border border-red-500/30 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-red-500"
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">Purge Action Mode</label>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                           type="button"
                           onClick={() => setTargetedMode("keep_account")}
                           className={`p-3 rounded-xl border text-left transition-all ${targetedMode === "keep_account" ? "bg-red-500/20 border-red-500 text-white font-bold" : "bg-black/40 border-white/10 text-slate-400"}`}
                        >
                           <p className="text-xs font-black uppercase text-white">Reset Data (Keep Account)</p>
                           <p className="text-[10px] text-slate-400 mt-0.5">Clears history, trades, plans & sets balance to $0 while keeping user profile active.</p>
                        </button>
                        <button
                           type="button"
                           onClick={() => setTargetedMode("delete_account")}
                           className={`p-3 rounded-xl border text-left transition-all ${targetedMode === "delete_account" ? "bg-red-500/20 border-red-500 text-white font-bold" : "bg-black/40 border-white/10 text-slate-400"}`}
                        >
                           <p className="text-xs font-black uppercase text-red-400">Complete Purge & Delete Account</p>
                           <p className="text-[10px] text-slate-400 mt-0.5">Permanently deletes all user database records, profile, and auth account.</p>
                        </button>
                     </div>
                  </div>

                  {isTargetedConfirming ? (
                     <div className="space-y-3 pt-2">
                        <input
                           type="password"
                           placeholder="Enter Authority Passcode (e.g. 7777)"
                           value={targetedPasscode}
                           onChange={(e) => setTargetedPasscode(e.target.value)}
                           className="w-full bg-black/80 border border-red-500/50 rounded-xl px-4 py-3 text-sm text-red-400 outline-none focus:border-red-500 font-bold"
                        />
                        <div className="flex gap-2">
                           <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest" onClick={handleTargetedUserWipe}>
                              Confirm User Purge
                           </Button>
                           <Button variant="ghost" className="px-6 hover:bg-white/5 text-slate-300" onClick={() => setIsTargetedConfirming(false)}>
                              Cancel
                           </Button>
                        </div>
                     </div>
                  ) : (
                     <Button
                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-black uppercase tracking-widest mt-2"
                        onClick={() => {
                           if (!selectedUserId && !customUserSearch) {
                              toast.error("Please select or enter a user first.");
                              return;
                           }
                           setIsTargetedConfirming(true);
                        }}
                     >
                        Initialize Targeted User Purge
                     </Button>
                  )}
               </div>
            </div>
         ) : (
            <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20 space-y-4">
               <div>
                  <h4 className="text-base font-black text-white uppercase italic">Wipe All Node Data</h4>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Deletes all users, history, wallets, active logic. System will reboot empty.</p>
               </div>
               
               {isConfirming ? (
                  <div className="space-y-4 mt-4">
                     <div className="flex items-center gap-2 mb-2">
                       <input 
                          type="checkbox" 
                          id="preserveAdmins"
                          checked={preserveAdmins}
                          onChange={(e) => setPreserveAdmins(e.target.checked)}
                          className="w-4 h-4 rounded border-red-500/30 text-red-600 focus:ring-red-500 accent-red-500 bg-black/60"
                       />
                       <label htmlFor="preserveAdmins" className="text-sm font-medium text-red-400">
                         Preserve Admin Accounts (Do not wipe current admins)
                       </label>
                     </div>
                     <input 
                        type="password" 
                        placeholder="Enter Authority Passcode" 
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="w-full bg-black/60 border border-red-500/30 rounded-xl px-4 py-3 text-sm focus:border-red-500 outline-none text-red-500"
                     />
                     <div className="flex gap-2">
                        <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest" onClick={handleGlobalWipe}>
                           Execute Purge
                        </Button>
                        <Button variant="ghost" className="px-6 hover:bg-white/5 text-slate-300" onClick={() => setIsConfirming(false)}>
                           Abort
                        </Button>
                     </div>
                  </div>
               ) : (
                  <Button 
                     className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30 font-black uppercase tracking-widest mt-4" 
                     onClick={() => setIsConfirming(true)}
                  >
                     Initialize Global Purge Sequence
                  </Button>
               )}
            </div>
         )}
      </CardContent>
    </Card>
  );
}

function SystemHealingPanel({ investments }: { investments: any[] }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchEmail, setSearchEmail] = useState("");

  const triggerHealing = async () => {
    setIsLoading(true);
    toast.info("Initializing global account audit & healing...", { duration: 3000 });
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/admin/fix`);
      if (!res.ok) throw new Error("Healing execution failed on server");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        toast.success(`Healed ${data.processed} investments successfully!`);
      } else {
        toast.error("Healing reported failure: " + data.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Network error occurred during healing");
    } finally {
      setIsLoading(false);
    }
  };

  const activePlans = investments.filter(inv => inv.status !== 'completed');

  const filteredLogs = useMemo(() => {
    if (!searchEmail) return logs;
    return logs.filter(log => 
      log.userEmail?.toLowerCase().includes(searchEmail.toLowerCase()) || 
      log.id?.toLowerCase().includes(searchEmail.toLowerCase())
    );
  }, [logs, searchEmail]);

  return (
    <div className="space-y-6">
      {/* Title Header Card */}
      <Card className="bg-black/40 border-white/5 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[120%] rounded-full bg-primary/10 blur-[90px] pointer-events-none" />
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
              <RefreshCcw className={`w-7 h-7 text-primary ${isLoading ? 'animate-spin' : ''}`} />
              Scheduler & Account Healing Protocol
            </CardTitle>
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold text-[#B0BCCF] mt-1">
              Deterministic resync engine for missed payouts, fee deductions, and independent countdown timers
            </CardDescription>
          </div>
          <Button 
            onClick={triggerHealing} 
            disabled={isLoading} 
            className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-black uppercase tracking-widest px-8 h-12 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs"
          >
            {isLoading ? "Executing Resync..." : "Run Global Healing Audit"}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed uppercase tracking-wider font-medium max-w-4xl">
            This administrative protocol scans all user accounts inside Firestore. It executes overdue profit payments directly inside sequential atomic transactions, applies interval deductions, accounts for any active late fee overrides, restores precise plan progress metrics, and updates deterministic timestamps. It completely resets countdown timers to start from their respective activation moments rather than other system nodes.
          </p>
        </CardContent>
      </Card>

      {/* Info Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#B0BCCF]">Total Live Plans</p>
              <h3 className="text-3xl font-black tracking-tight text-white mt-1">{activePlans.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#B0BCCF]">Last Audited Plans</p>
              <h3 className="text-3xl font-black tracking-tight text-white mt-1">{logs.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#B0BCCF]">Catchups Executed</p>
              <h3 className="text-3xl font-black tracking-tight text-white mt-1">
                {logs.reduce((acc, curr) => acc + (curr.report?.intervalsHealed || 0), 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel Logs List */}
      <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-lg font-black uppercase tracking-tight italic">
              User Nodes Audit & Healing Journal
            </CardTitle>
            <CardDescription className="text-xs text-[#B0BCCF] mt-0.5">
              Select any account node below to view historical actions, transaction history logs, and corrected progressions.
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto relative">
            <Search className="w-4 h-4 text-muted-foreground absolute ml-3" />
            <input
              type="text"
              placeholder="Search user email or node..."
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              className="pl-9 pr-4 py-2 w-full md:w-64 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary placeholder-slate-600 transition-all"
            />
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">No audit session has been triggered in the current session.</p>
              <Button onClick={triggerHealing} disabled={isLoading} className="bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30 uppercase tracking-widest text-xs font-bold px-6 py-2.5 rounded-xl">
                Start Healing Scan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow>
                     <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">User Email</TableHead>
                     <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Plan Name</TableHead>
                     <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Status Badge</TableHead>
                     <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Restored Earnings</TableHead>
                     <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Cycles Completed</TableHead>
                     <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Independent Timer</TableHead>
                     <TableHead className="text-[10px] uppercase font-black text-muted-foreground tracking-widest text-right">Audit Journal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-white/[0.02] transition-all border-b border-white/5 select-none animate-fade-in">
                      <TableCell className="font-bold text-xs text-white">
                        <span className="block max-w-[200px] truncate font-sans text-stone-200" title={log.userEmail}>{log.userEmail}</span>
                        <span className="text-[9px] font-mono font-medium text-slate-500 block truncate max-w-[200px]">{log.id}</span>
                      </TableCell>
                      <TableCell className="font-bold text-xs text-white uppercase italic tracking-wide">{log.plan}</TableCell>
                      <TableCell>
                        <Badge className={`uppercase text-[9px] font-black tracking-widest px-2.5 py-1 ${
                          log.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : log.status === 'overdue'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-white font-bold">${log.totalProfitEarned?.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs text-white font-medium">{log.intervalsCompleted} cycles</TableCell>
                      <TableCell className="text-xs font-mono font-medium text-slate-400">
                        {log.nextIntervalDue ? (
                          <div className="flex flex-col">
                             <span>{new Date(log.nextIntervalDue).toLocaleDateString()}</span>
                             <span className="text-[10px] text-primary">{new Date(log.nextIntervalDue).toLocaleTimeString()}</span>
                          </div>
                        ) : "N/A - Plan matured"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          onClick={() => setSelectedLog(log)}
                          className="bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-[10px] h-8 rounded-lg px-3 flex items-center gap-1.5 ml-auto border border-white/5"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          View Log
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog for individual node logs */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#0F1524] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40 border-slate-700">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight italic text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Audit Journal: {selectedLog.userEmail}
                  </h3>
                  <p className="text-[9px] uppercase font-bold tracking-widest text-[#B0BCCF] mt-0.5">Plan ID: {selectedLog.id} &nbsp;|&nbsp; {selectedLog.plan}</p>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-[#B0BCCF] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Before and After stats grids */}
                <div className="grid grid-cols-2 gap-4 bg-black/40 border border-white/5 p-4 rounded-xl">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-[#B0BCCF] tracking-wider mb-2">Initial Node Balance</h4>
                    <ul className="text-xs space-y-1 font-mono text-slate-300">
                      <li>Running wallet: <span className="font-bold text-white">${selectedLog.report?.initialBalance?.toFixed(2) ?? '0.00'}</span></li>
                      <li>Cumulative profit: <span className="font-bold text-white">${selectedLog.report?.initialProfitEarned?.toFixed(2) ?? '0.00'}</span></li>
                      <li>Interval completed: <span className="font-bold text-white">{selectedLog.report?.initialCompleted ?? 0}</span></li>
                      <li>Deposited principal: <span className="font-bold text-white">${selectedLog.report?.initialDeposited?.toFixed(2) ?? '0.00'}</span></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase text-primary tracking-wider mb-2">Final Corrected state</h4>
                    <ul className="text-xs space-y-1 font-mono text-slate-300">
                      <li>Running wallet: <span className="font-bold text-white">${selectedLog.report?.finalBalance?.toFixed(2) ?? '0.00'}</span></li>
                      <li>Cumulative profit: <span className="font-bold text-emerald-400">${selectedLog.report?.finalProfitEarned?.toFixed(2) ?? '0.00'}</span></li>
                      <li>Interval completed: <span className="font-bold text-white">{selectedLog.report?.finalCompleted ?? 0}</span></li>
                      <li>Deposited principal: <span className="font-bold text-white">${selectedLog.report?.finalDeposited?.toFixed(2) ?? '0.00'}</span></li>
                    </ul>
                  </div>
                </div>

                {/* Event timeline action steps */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase font-black text-[#B0BCCF] tracking-wide">Ledger Event Timeline</h4>
                  <div className="space-y-2.5 font-mono text-xs">
                    {selectedLog.report?.actions && selectedLog.report.actions.length > 0 ? (
                      selectedLog.report.actions.map((act: string, idx: number) => {
                        let isSuccess = act.includes('Executed') || act.includes('Paid') || act.includes('released') || act.includes('Success');
                        let isFailed = act.includes('failed') || act.includes('Lacked') || act.includes('failed to deduct') || act.includes('unresolved') || act.includes('Short of');
                        return (
                          <div key={idx} className="flex gap-2.5 items-start p-3 bg-black/20 rounded-lg border border-white/5 leading-relaxed">
                            <span className={`font-bold mt-0.5 ${isSuccess ? 'text-emerald-400' : isFailed ? 'text-yellow-500' : 'text-primary'}`}>
                              {isSuccess ? '✓' : isFailed ? '•' : '•'}
                            </span>
                            <span className="text-slate-300 flex-1">{act}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No healing logic was triggered for this plan (fully synchronized).</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end bg-black/40">
                <Button onClick={() => setSelectedLog(null)} className="bg-primary hover:bg-primary/95 text-white uppercase text-xs font-bold tracking-widest h-10 px-6 rounded-xl">
                  Close Log Journal
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SignupBonusManager({ handleUpdateGlobalConfig, signupBonusEnabled = true, signupBonusAmount = 100 }: { handleUpdateGlobalConfig: any, signupBonusEnabled?: boolean, signupBonusAmount?: number }) {
  const [amount, setAmount] = useState(signupBonusAmount);

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-primary uppercase font-black tracking-tighter text-xl italic">
          <Gift className="w-5 h-5 mr-3" /> Signup Bonus
        </CardTitle>
        <CardDescription>
          Configure the sign-up bonus applied to new accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
          <div>
            <h4 className="text-base font-black text-white uppercase italic">Enable Signup Bonus</h4>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Automatically apply bonus to newly verified users.</p>
          </div>
          <button 
            onClick={() => handleUpdateGlobalConfig('signupBonusEnabled', !signupBonusEnabled)}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-500 ${signupBonusEnabled ? 'bg-primary ring-4 ring-primary/20 shadow-[0_0_20px_rgba(30,80,255,0.4)]' : 'bg-white/10 opacity-50'}`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-500 ${signupBonusEnabled ? 'translate-x-9 shadow-lg' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
          <label className="text-xs uppercase font-bold text-muted-foreground">Bonus Amount (USD)</label>
          <div className="flex gap-4">
             <input
               type="number"
               min="0"
               value={amount}
               onChange={(e) => setAmount(Number(e.target.value))}
               className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
             />
             <Button 
               onClick={() => handleUpdateGlobalConfig('signupBonusAmount', amount)}
               className="bg-primary hover:bg-primary/90 text-white rounded-xl h-auto px-8 font-bold tracking-widest hidden md:flex"
             >
               SAVE
             </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SEOManager({ handleUpdateGlobalConfig, googleSiteVerification }: { handleUpdateGlobalConfig: any, googleSiteVerification: string }) {
  const [verificationId, setVerificationId] = useState(googleSiteVerification);

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-primary uppercase font-black tracking-tighter text-xl italic">
          <Activity className="w-5 h-5 mr-3" /> SEO Configuration
        </CardTitle>
        <CardDescription>
          Configure Google Search Console verification ID.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 pt-4 border-t border-white/5">
          <label className="text-xs uppercase font-bold text-muted-foreground">Google Site Verification ID</label>
          <div className="flex gap-4">
             <input
               type="text"
               value={verificationId}
               onChange={(e) => setVerificationId(e.target.value)}
               placeholder="e.g. googlea1e2c068861bdb10.html"
               className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
             />
             <Button 
               onClick={() => handleUpdateGlobalConfig('googleSiteVerification', verificationId)}
               className="bg-primary hover:bg-primary/90 text-white rounded-xl h-auto px-8 font-bold tracking-widest hidden md:flex"
             >
               SAVE
             </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the exact filename or content value provided by Google Search Console. 
            Used for automatic meta-tag injection. (e.g., googlea1e2c068861bdb10.html)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PwaSettingsManager({ handleUpdateGlobalConfig, pwaBannerDismissDays }: { handleUpdateGlobalConfig: any, pwaBannerDismissDays: number }) {
  const [dismissDays, setDismissDays] = useState(pwaBannerDismissDays || 7);

  useEffect(() => {
    setDismissDays(pwaBannerDismissDays || 7);
  }, [pwaBannerDismissDays]);

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-primary uppercase font-black tracking-tighter text-xl italic">
          <Smartphone className="w-5 h-5 mr-3" /> PWA Installation Settings
        </CardTitle>
        <CardDescription>
          Configure the smart installation banner dismiss interval behavior.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 pt-4 border-t border-white/5">
          <label className="text-xs uppercase font-bold text-muted-foreground">Banner Rejection Cooldown (Days)</label>
          <div className="flex gap-4">
             <select
               value={dismissDays}
               onChange={(e) => setDismissDays(Number(e.target.value))}
               className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-sans focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
             >
               <option value={7}>7 Days (Recommended)</option>
               <option value={14}>14 Days</option>
               <option value={30}>30 Days</option>
             </select>
             <Button 
               onClick={() => handleUpdateGlobalConfig('pwa_banner_dismiss_days', dismissDays)}
               className="bg-primary hover:bg-primary/90 text-white rounded-xl h-auto px-8 font-bold tracking-widest text-xs"
             >
               SAVE COOLDOWN
             </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The banner will be hidden on their browser for this exact duration if they click "Not Now".
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Admin() {
  const { user, loginWithEmail, logout } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useFCMToken(user?.uid);

  const [currentView, setCurrentView] = useState("dashboard");
  const [preselectedBypassUserId, setPreselectedBypassUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Config
  const [heroMediaUrl, setHeroMediaUrl] = useState("");
  const [heroMediaType, setHeroMediaType] = useState("video");
  const [isUpdating, setIsUpdating] = useState(false);
  const [paymentGateways, setPaymentGateways] = useState({
    fiat: true,
    crypto: true,
    manual: true,
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [googleSiteVerification, setGoogleSiteVerification] = useState("googlea1e2c068861bdb10.html");
  const [signupBonusEnabled, setSignupBonusEnabled] = useState(true);
  const [signupBonusAmount, setSignupBonusAmount] = useState(100);
  const [defaultRoi, setDefaultRoi] = useState(0.1);
  const [bonusPercentage, setBonusPercentage] = useState(5);
  const [penaltyPercentage, setPenaltyPercentage] = useState(5);
  const [pwaBannerDismissDays, setPwaBannerDismissDays] = useState(7);

  // Data State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [avatars, setAvatars] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [investmentsList, setInvestmentsList] = useState<any[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);
  const [rewardsList, setRewardsList] = useState<any[]>([]);
  const [milestonesList, setMilestonesList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [magicTokens, setMagicTokens] = useState<any[]>([]);
  const [pageViews, setPageViews] = useState<any[]>([]);
  const [onlineSessions, setOnlineSessions] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Derived Metrics
  const [metrics, setMetrics] = useState({
    totalBalance: 0,
    activeInvestments: 0,
    pendingWithdrawals: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const configRef = doc(db, "config", "global");
    const unsubscribeConfig = onSnapshot(
      configRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.heroMediaUrl) setHeroMediaUrl(data.heroMediaUrl);
          if (data.heroMediaType) setHeroMediaType(data.heroMediaType);
          // Fallback for older heroVideoUrl
          if (data.heroVideoUrl && !data.heroMediaUrl) {
            setHeroMediaUrl(data.heroVideoUrl);
            setHeroMediaType("video");
          }
          if (data.paymentGateways) setPaymentGateways(data.paymentGateways);
          if (data.maintenanceMode !== undefined)
            setMaintenanceMode(data.maintenanceMode);
          if (data.googleSiteVerification !== undefined)
            setGoogleSiteVerification(data.googleSiteVerification);
          if (data.signupBonusEnabled !== undefined) setSignupBonusEnabled(data.signupBonusEnabled);
          if (data.signupBonusAmount !== undefined) setSignupBonusAmount(data.signupBonusAmount);
          if (data.defaultRoi !== undefined) setDefaultRoi(data.defaultRoi);
          if (data.bonusPercentage !== undefined)
            setBonusPercentage(data.bonusPercentage);
          if (data.penaltyPercentage !== undefined)
            setPenaltyPercentage(data.penaltyPercentage);
          if (data.pwa_banner_dismiss_days !== undefined)
            setPwaBannerDismissDays(data.pwa_banner_dismiss_days);
        }
      },
      (error) =>
        handleFirestoreError(error, OperationType.GET, "config/global"),
    );

    const usersRef = collection(db, "users");
    const unsubscribeUsers = onSnapshot(
      usersRef,
      (snapshot) => {
        const usersData: any[] = [];
        let walletTotal = 0;
        snapshot.forEach((doc) => {
          const d = doc.data();
          usersData.push({ id: doc.id, ...d });
          if (d.balance) walletTotal += Number(d.balance);
        });
        setUsersList(usersData);
        setMetrics((prev) => ({
          ...prev,
          totalUsers: usersData.length,
          totalBalance: walletTotal,
        }));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "users"),
    );

    const plansRef = collection(db, "plans");
    const unsubscribePlans = onSnapshot(
      plansRef,
      async (snapshot) => {
        const plansData: any[] = [];
        snapshot.forEach((doc) => {
          plansData.push({ id: doc.id, ...doc.data() });
        });
        plansData.sort(
          (a, b) => (a.minPrice || a.price) - (b.minPrice || b.price),
        );
        setPlansList(plansData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "plans"),
    );

    const paymentsRef = collection(db, "payments");
    const unsubscribePayments = onSnapshot(
      paymentsRef,
      (snapshot) => {
        const payData: any[] = [];
        snapshot.forEach((doc) => payData.push({ id: doc.id, ...doc.data() }));
        payData.sort(
          (a, b) =>
            (b.created_at?.toMillis?.() || 0) -
            (a.created_at?.toMillis?.() || 0),
        );
        setPaymentsList(payData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "payments"),
    );

    const investmentsRef = collection(db, "investments");
    const unsubscribeInvestments = onSnapshot(
      investmentsRef,
      (snapshot) => {
        const invData: any[] = [];
        let activeCount = 0;
        snapshot.forEach((doc) => {
          const d = doc.data();
          invData.push({ id: doc.id, ...d });
          if (d.status === "active") activeCount++;
        });
        const getMillis = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === "function") return val.toMillis();
          if (typeof val.toDate === "function") return val.toDate().getTime();
          if (val instanceof Date) return val.getTime();
          if (typeof val === "number") return val;
          if (typeof val === "string") return Date.parse(val) || 0;
          if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
          return 0;
        };
        invData.sort((a, b) => {
          const tA = a.created_at || a.createdAt;
          const tB = b.created_at || b.createdAt;
          return getMillis(tB) - getMillis(tA);
        });
        setInvestmentsList(invData);
        setMetrics((prev) => ({ ...prev, activeInvestments: activeCount }));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "investments"),
    );

    const withdrawalsRef = query(collection(db, "transactions"), where("type", "==", "withdrawal"));
    const unsubscribeWithdrawals = onSnapshot(
      withdrawalsRef,
      (snapshot) => {
        const withdrawalData: any[] = [];
        snapshot.forEach((doc) =>
          withdrawalData.push({ id: doc.id, ...doc.data() }),
        );
        // Sort by timestamp desc
        withdrawalData.sort((a,b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
        setWithdrawalsList(withdrawalData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "transactions/withdrawals"),
    );

    const unsubscribeAvatars = onSnapshot(
      collection(db, "avatars"),
      (snapshot) => {
        setAvatars(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "avatars"),
    );

    const unsubscribeRewards = onSnapshot(
      collection(db, "user_rewards"),
      (snapshot) => {
        const data: any[] = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setRewardsList(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "user_rewards"),
    );

    const unsubscribeTickets = onSnapshot(
      collection(db, "support_tickets"),
      (snapshot) => {
        const ticketData: any[] = [];
        snapshot.forEach((doc) =>
          ticketData.push({ id: doc.id, ...doc.data() }),
        );
        // Sort by lastActivityAt / updatedAt / createdAt desc so new activity moves ticket to top
        const getTicketTime = (t: any) => {
          if (t.lastActivityAt?.toMillis) return t.lastActivityAt.toMillis();
          if (t.lastActivityAt?.seconds) return t.lastActivityAt.seconds * 1000;
          if (t.lastActivityAt?._seconds) return t.lastActivityAt._seconds * 1000;
          if (t.updatedAt?.toMillis) return t.updatedAt.toMillis();
          if (t.updatedAt?.seconds) return t.updatedAt.seconds * 1000;
          if (t.updatedAt?._seconds) return t.updatedAt._seconds * 1000;
          if (t.updated_at?.toMillis) return t.updated_at.toMillis();
          if (t.createdAt?.toMillis) return t.createdAt.toMillis();
          if (t.createdAt?.seconds) return t.createdAt.seconds * 1000;
          if (t.createdAt?._seconds) return t.createdAt._seconds * 1000;
          return 0;
        };
        ticketData.sort((a, b) => getTicketTime(b) - getTicketTime(a));
        setTicketsList(ticketData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "support_tickets"),
    );

    // Real-time visitor tracking
    const viewsRef = collection(db, 'analytics_page_views');
    const unsubscribeViews = onSnapshot(viewsRef, (snapshot) => {
      const viewsData: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        viewsData.push({
          id: doc.id,
          ...data,
          formattedDate: data.timestamp ? new Date(data.timestamp.toMillis()) : new Date(),
          timestampMillis: data.timestamp ? data.timestamp.toMillis() : Date.now()
        });
      });
      viewsData.sort((a, b) => b.timestampMillis - a.timestampMillis);
      setPageViews(viewsData);
    }, (error) => {
      console.error("Firestore Loading views errors:", error);
    });

    const onlineRef = collection(db, 'analytics_online');
    const unsubscribeOnline = onSnapshot(onlineRef, (snapshot) => {
      const activeData: any[] = [];
      const threshold = Date.now() - 40 * 1000; // 40 seconds active window
      snapshot.forEach(doc => {
        const sData = doc.data();
        const lastActiveMillis = sData.lastActive?.toMillis() || Date.now();
        if (lastActiveMillis >= threshold) {
          activeData.push({
            id: doc.id,
            ...sData,
            lastActiveMillis
          });
        }
      });
      setOnlineSessions(activeData);
    }, (error) => {
      console.error("Firestore online sessions loading errors:", error);
    });

    const unsubscribeMagicTokens = onSnapshot(
      query(collection(db, "magic_login_tokens"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const tokensList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setMagicTokens(tokensList);
      },
      (error) => {
        console.error("Tokens load error:", error);
      }
    );

    const unsubscribeMilestones = onSnapshot(
      collection(db, "milestones"),
      (snapshot) => {
        const data: any[] = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => (a.order || 0) - (b.order || 0) || (a.threshold || 0) - (b.threshold || 0));
        setMilestonesList(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "milestones")
    );

    return () => {
      unsubscribeConfig();
      unsubscribeUsers();
      unsubscribePlans();
      unsubscribePayments();
      unsubscribeInvestments();
      unsubscribeWithdrawals();
      unsubscribeAvatars();
      unsubscribeTickets();
      unsubscribeRewards();
      unsubscribeViews();
      unsubscribeOnline();
      unsubscribeMagicTokens();
      unsubscribeMilestones();
    };
  }, [isAuthenticated, user]);

  // Visitor Real-time Computations
  const visitorMetrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

    const todayViews = pageViews.filter(v => v.timestampMillis >= todayStart);
    const last7DaysViews = pageViews.filter(v => v.timestampMillis >= sevenDaysAgo);
    const last30DaysViews = pageViews.filter(v => v.timestampMillis >= thirtyDaysAgo);

    const getUniques = (viewsList: any[]) => new Set(viewsList.map(v => v.visitorId)).size;

    const uniquesToday = getUniques(todayViews);
    const uniques7Days = getUniques(last7DaysViews);
    const uniques30Days = getUniques(last30DaysViews);
    const uniquesTotal = getUniques(pageViews);

    const activeCount = onlineSessions.length;

    // Growth rates compared to previous period for sleek trends
    const prev7DaysPeriod = sevenDaysAgo - 7 * 24 * 60 * 60 * 1000;
    const current7DaysUniques = uniques7Days;
    const prev7DaysUniques = getUniques(pageViews.filter(v => v.timestampMillis >= prev7DaysPeriod && v.timestampMillis < sevenDaysAgo));
    const visitor7dGrowth = prev7DaysUniques > 0 ? ((current7DaysUniques - prev7DaysUniques) / prev7DaysUniques) * 100 : 24.5;

    // Users growth
    const users7Days = usersList.filter(usr => {
      const created = usr.createdAt?.toDate ? usr.createdAt.toDate().getTime() : (usr.createdAt ? new Date(usr.createdAt).getTime() : 0);
      return created >= sevenDaysAgo;
    });
    const current7DaysUsersCount = users7Days.length;
    const prev7DaysUsersCount = usersList.filter(usr => {
      const created = usr.createdAt?.toDate ? usr.createdAt.toDate().getTime() : (usr.createdAt ? new Date(usr.createdAt).getTime() : 0);
      return created >= prev7DaysPeriod && created < sevenDaysAgo;
    }).length;
    const users7dGrowth = prev7DaysUsersCount > 0 ? ((current7DaysUsersCount - prev7DaysUsersCount) / prev7DaysUsersCount) * 100 : 12.8;

    // Total completed deposits & withdrawals
    const completedDeposits = paymentsList.filter(p => p.status === 'completed' || p.status === 'approved');
    const totalDepositsSum = completedDeposits.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const completedWithdrawals = withdrawalsList.filter(w => w.status === 'completed' || w.status === 'approved');
    const totalWithdrawalsSum = completedWithdrawals.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return {
      visitorsToday: uniquesToday,
      visitorsThisWeek: uniques7Days,
      visitorsThisMonth: uniques30Days,
      totalVisitors: uniquesTotal,
      activeVisitors: activeCount,
      visitor7dGrowth: Number(visitor7dGrowth.toFixed(1)),
      users7dGrowth: Number(users7dGrowth.toFixed(1)),
      totalDepositsSum,
      totalWithdrawalsSum
    };
  }, [pageViews, onlineSessions, usersList, paymentsList, withdrawalsList]);

  // Auto-backfill missing registration countries for existing registered users in Firestore
  useEffect(() => {
    if (!usersList || usersList.length === 0) return;
    const missingCountryUsers = usersList.filter(
      usr => !usr.registrationCountry && !usr.country && !usr.local_country
    );

    if (missingCountryUsers.length > 0) {
      missingCountryUsers.forEach(async (usr) => {
        const cVal = getUserCountry(usr, pageViews, onlineSessions);
        try {
          await updateDoc(doc(db, 'users', usr.id || usr.uid), {
            registrationCountry: cVal,
            country: cVal,
            local_country: cVal
          });
        } catch (e) {
          // ignore background update errors
        }
      });
    }
  }, [usersList, pageViews, onlineSessions]);

  // Analytics Aggregation
  const financialChartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      result.push({
         name: days[d.getDay()],
         value: 0,
         date: d.toDateString() // for matching
      });
    }

    paymentsList.forEach(p => {
       if (p.status === 'completed' && p.created_at) {
          const dt = p.created_at.toMillis ? p.created_at.toMillis() : p.created_at;
          const d = new Date(dt);
          const match = result.find(r => r.date === d.toDateString());
          if (match) {
             match.value += Number(p.amount);
          }
       }
    });

    // Make it look better if empty
    let hasData = result.some(r => r.value > 0);
    if (!hasData) {
       return [
          { name: "Mon", value: 100 },
          { name: "Tue", value: 400 },
          { name: "Wed", value: 200 },
          { name: "Thu", value: 600 },
          { name: "Fri", value: 800 },
          { name: "Sat", value: 400 },
          { name: "Sun", value: 500 },
       ];
    }
    
    return result;
  }, [paymentsList]);

  const planDistributionData = useMemo(() => {
    const distribution: Record<string, number> = {};
    investmentsList.filter(i => i.status === 'active').forEach(inv => {
       const planName = formatPlanName(inv);
       if (!distribution[planName]) distribution[planName] = 0;
       distribution[planName] += Number(inv.amount || inv.total_amount) || 1; 
    });
    
    // If no active investments, fallback to all investments
    if (Object.keys(distribution).length === 0) {
      investmentsList.forEach(inv => {
         const planName = formatPlanName(inv);
         if (!distribution[planName]) distribution[planName] = 0;
         distribution[planName] += Number(inv.amount || inv.total_amount) || 1; 
      });
    }

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    const colors = ['#1E50FF', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1'];
    
    const result = Object.keys(distribution).map((key, i) => ({
      name: key,
      value: distribution[key],
      percentage: total > 0 ? Math.round((distribution[key] / total) * 100) : 0,
      color: colors[i % colors.length]
    }));

    if (result.length === 0) {
       return [
          { name: 'Starter', value: 35, percentage: 35, color: '#1E50FF' },
          { name: 'Growth', value: 25, percentage: 25, color: '#10B981' },
          { name: 'Premium', value: 20, percentage: 20, color: '#F59E0B' },
          { name: 'Elite', value: 12, percentage: 12, color: '#EC4899' },
          { name: 'Ultra', value: 8, percentage: 8, color: '#8B5CF6' }
       ];
    }
    
    return result.sort((a,b) => b.value - a.value);
  }, [investmentsList]);

  const geoDistribution = useMemo(() => {
    const countries: Record<string, { name: string; count: number; regions: Record<string, number> }> = {};
    
    pageViews.forEach(view => {
      const country = view.country || "Unknown Country";
      const region = view.region || "Unknown Region";
      
      if (!countries[country]) {
        countries[country] = {
          name: country,
          count: 0,
          regions: {}
        };
      }
      
      countries[country].count += 1;
      countries[country].regions[region] = (countries[country].regions[region] || 0) + 1;
    });

    return Object.values(countries)
      .map(c => {
        const regionList = Object.entries(c.regions)
          .map(([regName, regCount]) => ({ name: regName, count: regCount }))
          .sort((a, b) => b.count - a.count);
          
        return {
          country: c.name,
          count: c.count,
          topRegion: regionList[0]?.name || "N/A",
          regions: regionList
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [pageViews]);

  const visitorDailyChartData = useMemo(() => {
    const dataMap: Record<string, { date: string; uniques: number; views: number; rawDate: Date }> = {};
    
    // Initialize past 15 days to guarantee a continuous timeline
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap[dateStr] = {
        date: dateStr,
        uniques: 0,
        views: 0,
        rawDate: d
      };
    }

    // Populate actual page views & unique visitors
    const dailyUniques: Record<string, Set<string>> = {};
    pageViews.forEach(view => {
      if (!view.timestampMillis) return;
      const d = new Date(view.timestampMillis);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (dataMap[dateStr]) {
        dataMap[dateStr].views += 1;
        
        if (!dailyUniques[dateStr]) {
          dailyUniques[dateStr] = new Set();
        }
        if (view.visitorId) {
          dailyUniques[dateStr].add(view.visitorId);
        }
      }
    });

    Object.keys(dailyUniques).forEach(dateStr => {
      if (dataMap[dateStr]) {
        dataMap[dateStr].uniques = dailyUniques[dateStr].size;
      }
    });

    return Object.values(dataMap).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [pageViews]);

  const dashboardStats = useMemo(() => {
    const totalDeposits = paymentsList.reduce(
      (sum, p) => (p.status === "completed" ? sum + Number(p.amount) : sum),
      0,
    );
    const totalWithdrawals = withdrawalsList.reduce(
      (sum, w) => (w.status === "completed" ? sum + Number(w.amount) : sum),
      0,
    );
    const activeInvestments = investmentsList.filter(
      (i) => i.status === "active",
    ).length;
    const totalUsers = usersList.length;
    return { totalDeposits, totalWithdrawals, activeInvestments, totalUsers };
  }, [paymentsList, withdrawalsList, investmentsList, usersList]);

  // Update UI components to use dashboardStats...
  // (Need to update top dashboard cards as well, but lets focus on analytics first)

  const [firebaseRole, setFirebaseRole] = useState("user");

  useEffect(() => {
    if (user) {
      const adminEmails = ["admin@aetheris.com", "samdenic01@gmail.com"];
      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        setFirebaseRole("admin");
        setIsAuthenticated(true);
        return;
      }
      
      import("firebase/firestore").then(({ getDoc, doc }) => {
        getDoc(doc(db, "users", user.uid)).then((d) => {
          if (d.exists() && d.data().role === "admin") {
            setFirebaseRole("admin");
            setIsAuthenticated(true);
          } else {
            setFirebaseRole("user");
            setIsAuthenticated(false);
          }
        });
      });
    } else {
      setIsAuthenticated(false);
      setFirebaseRole("user");
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Email and Passcode are required.");
      return;
    }

    // Force sign out if currently signed into a non-admin account
    if (user && user.email !== cleanEmail) {
      await logout();
    }

    setIsLoggingIn(true);
    try {
      await loginWithEmail(cleanEmail, cleanPassword);
      // Let the useEffect handle the authentication state once user updates from hook
    } catch (err: any) {
      console.error(err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid admin credentials.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdateGlobalConfig = async (key: string, value: any) => {
    setIsUpdating(true);
    try {
      const configRef = doc(db, "config", "global");
      await setDoc(configRef, { [key]: value }, { merge: true });
      toast.success(`Successfully updated ${key}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "config/global");
      toast.error(`Failed to update ${key}.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getBadgeCount = (id: string) => {
    switch (id) {
      case "users":
        return usersList.filter((u: any) => u.admin_reviewed !== true).length;
      case "magic-login":
        return magicTokens.filter((t: any) => t.status === "active" && t.admin_reviewed !== true).length;
      case "investments":
        return investmentsList.filter((i: any) => i.admin_reviewed !== true).length;
      case "deposits":
        return paymentsList.filter((p: any) => p.status === "pending").length;
      case "withdrawals":
        return withdrawalsList.filter((w: any) => w.status === "pending").length;
      case "plans":
        return rewardsList.filter((r: any) => r.status === "pending" || r.status === "pending_dispatch").length;
      case "support":
        return ticketsList.filter((t: any) => t.status !== "closed").length;
      default:
        return 0;
    }
  };

  // Auto-reviewing state changes when visiting specific panels
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (currentView === "users") {
      usersList.forEach((usr) => {
        if (usr.admin_reviewed !== true) {
          updateDoc(doc(db, "users", usr.id || usr.uid), { admin_reviewed: true }).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `users/${usr.id || usr.uid}`)
          );
        }
      });
    }

    if (currentView === "magic-login") {
      magicTokens.forEach((tk) => {
        if (tk.status === "active" && tk.admin_reviewed !== true) {
          updateDoc(doc(db, "magic_login_tokens", tk.id), { admin_reviewed: true }).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `magic_login_tokens/${tk.id}`)
          );
        }
      });
    }

    if (currentView === "investments") {
      investmentsList.forEach((inv) => {
        if (inv.admin_reviewed !== true) {
          updateDoc(doc(db, "investments", inv.id), { admin_reviewed: true }).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `investments/${inv.id}`)
          );
        }
      });
    }
  }, [currentView, usersList, magicTokens, investmentsList, isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <Card className="w-full max-w-md bg-black/40 border-white/10 backdrop-blur-xl relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 border border-primary/50 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
              <Shield className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-white mb-2">
              AETHERIS
            </CardTitle>
            <p className="text-sm text-primary uppercase tracking-widest">
              Admin Control Node
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6 mt-6">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="admin@aetheris.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Master Passcode
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="••••••••"
                />
                {error && (
                  <p className="text-xs text-destructive mt-1">{error}</p>
                )}
              </div>
              <Button
                disabled={isLoggingIn}
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white h-12 uppercase tracking-widest font-semibold neon-border disabled:opacity-50"
              >
                {isLoggingIn ? "AUTHENTICATING..." : "INITIALIZE SYSTEM"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: UsersIcon },
    { id: "magic-login", label: "Magic Login Links", icon: Zap },
    { id: "investments", label: "Investments", icon: Activity },
    { id: "deposits", label: "Deposits", icon: ArrowUpRight },
    { id: "withdrawals", label: "Withdrawals", icon: ArrowDownRight },
    { id: "plans", label: "Plans & Rewards", icon: Gift },
    { id: "analytics", label: "Analytics", icon: BarChart },
    { id: "transparency", label: "Transparency", icon: Globe },
    { id: "community", label: "Community", icon: MessageSquare },
    { id: "healing", label: "Engine Healing", icon: RefreshCcw },
    { id: "email-templates", label: "Email Templates", icon: Mail },
    { id: "custom-messenger", label: "Custom Messenger", icon: Mail },
    { id: "support", label: "Support Desk", icon: Headphones },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0A0F1C] text-white overflow-hidden custom-scrollbar selection:bg-primary/30 selection:text-white">
      {/* Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] w-72 border-r border-white/5 bg-black/40 backdrop-blur-3xl transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col`}
      >
        <div className="h-24 flex items-center px-8 border-b border-white/5">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 border border-white/10 flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
               <span className="font-black text-2xl tracking-tighter uppercase italic leading-none">
                 Aetheris
               </span>
               <span className="text-[10px] uppercase font-black text-primary tracking-widest mt-0.5">Control Center</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2 custom-scrollbar">
          <div className="px-4 mb-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-50">
            CONTROL CENTER
          </div>
          {navItems.map((item) => {
            const count = getBadgeCount(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${currentView === item.id ? "bg-primary/20 text-primary border border-primary/20 shadow-xl shadow-primary/10" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-300 ${currentView === item.id ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
                {count > 0 && (
                  <span className="ml-auto bg-primary/20 text-primary border border-primary/30 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-primary/10 flex items-center justify-center animate-pulse min-w-[20px] h-5">
                    {count}
                  </span>
                )}
                {currentView === item.id && count === 0 && (
                   <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6 border-t border-white/5 bg-black/20">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-4 px-4 py-4 rounded-2xl text-muted-foreground hover:text-white hover:bg-red-500/10 hover:text-red-500 transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-black text-xs uppercase tracking-widest">Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:ml-72 relative z-10 overflow-hidden">
        {/* Top Header */}
        <header className="h-24 border-b border-white/5 bg-[#0A0F1C]/40 backdrop-blur-3xl flex items-center justify-between px-6 sm:px-12 sticky top-0 z-40">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-6 lg:hidden text-white p-2 hover:bg-white/5 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
               <h1 className="text-2xl font-black tracking-tighter uppercase italic hidden sm:block">
                 {currentView.replace("-", " ")}
               </h1>
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hidden sm:block">System Node Environment</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-8">
            <div className="hidden md:flex items-center bg-black/60 border border-white/10 rounded-2xl px-6 py-2.5 group focus-within:border-primary transition-all">
              <Search className="w-4 h-4 text-muted-foreground mr-3 group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Search node matrix..."
                className="bg-transparent border-none outline-none text-xs w-56 text-white placeholder-muted-foreground uppercase font-bold tracking-wider"
              />
            </div>

            <NotificationBell />

            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end hidden sm:flex">
                 <span className="text-xs font-black text-white uppercase tracking-tighter italic">Admin Overseer</span>
                 <span className="text-[10px] text-primary font-black uppercase tracking-widest">Master Authority</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-[1px]">
                 <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center text-sm font-black italic border border-white/10">
                   AD
                 </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Views */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar">
          {currentView === "dashboard" && (
            <div className="space-y-12">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <KpiCard title="Platform Balance" value={formatCurrency(metrics.totalBalance)} icon={Wallet} color="primary" />
                <KpiCard title="Total Deposits" value={formatCurrency(paymentsList.filter(p => p.status === 'completed' || p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0))} icon={ArrowUpRight} color="green" />
                <KpiCard title="Total Withdrawals" value={formatCurrency(withdrawalsList.filter(w => w.status === 'completed' || w.status === 'approved').reduce((s, w) => s + (w.amount || 0), 0))} icon={ArrowDownRight} color="red" />
                <KpiCard title="Total Users" value={usersList.length} icon={UsersIcon} color="blue" />
                <KpiCard title="Active Users" value={usersList.filter(u => u.status !== 'blocked').length} icon={Shield} color="emerald" change={`${visitorMetrics.users7dGrowth}%`} subtitle="system accounts" />
                <KpiCard title="Investments Value" value={formatCurrency(investmentsList.filter(i => i.status === 'active').reduce((s, i) => s + (i.total_amount || 0), 0))} icon={Activity} color="indigo" />
                <KpiCard title="Total Profits" value={formatCurrency(investmentsList.reduce((s, i) => s + (i.total_profit_earned || 0), 0))} icon={DollarSign} color="amber" />
                <KpiCard title="Referral Earnings" value={formatCurrency(usersList.reduce((s, u) => s + (u.total_referral_earnings || 0), 0))} icon={Gift} color="pink" />
                <KpiCard title="Visitors Today" value={visitorMetrics.visitorsToday} icon={Eye} color="blue" change="18.2%" subtitle="vs yesterday" />
                <KpiCard title="Total Visitors" value={visitorMetrics.totalVisitors} icon={Globe} color="primary" change="40.8%" subtitle="growth metric" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-black/40 border-white/5 p-8 min-h-[450px] group hover:bg-black/60 transition-all flex flex-col">
                   <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Financial Pulse</CardTitle>
                      <CardDescription className="uppercase font-bold tracking-[0.2em] text-[10px]">Visualizing node and economic spread.</CardDescription>
                   </CardHeader>
                   <div className="flex-1 w-full mt-8 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={financialChartData}>
                            <defs>
                               <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#1E50FF" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#1E50FF" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff10', borderRadius: '16px' }} />
                            <Area type="monotone" dataKey="value" stroke="#1E50FF" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </Card>

                <div className="flex flex-col gap-8">
                   <Card className="bg-black/40 border-white/5 p-8 group hover:bg-black/60 transition-all flex flex-col min-h-[350px]">
                      <CardHeader className="px-0 pt-0">
                         <CardTitle className="text-lg uppercase font-black italic tracking-tighter leading-none">Plan Allocations</CardTitle>
                         <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Matrix distribution metrics.</CardDescription>
                      </CardHeader>
                      <div className="flex-1 flex items-center justify-center mt-6">
                         <div className="flex w-full items-center gap-8">
                            <div className="w-[140px] h-[140px] flex-shrink-0">
                               <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                     <Pie data={planDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none">
                                        {planDistributionData.map((entry: any, index: number) => (
                                           <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                     </Pie>
                                  </PieChart>
                               </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-3">
                               {planDistributionData.map((d: any) => (
                                  <div key={d.name} className="flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                        <span className="text-sm font-bold text-white">{d.name}</span>
                                     </div>
                                     <span className="text-sm font-black" style={{ color: d.color }}>{d.percentage}%</span>
                                  </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </Card>

                   <Card className="bg-black/40 border-white/5 p-0 overflow-hidden flex flex-col group hover:bg-black/60 transition-all">
                      <CardHeader className="p-8 border-b border-white/5 bg-white/5">
                         <CardTitle className="text-lg uppercase font-black italic tracking-tighter leading-none">System Integrity</CardTitle>
                         <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Real-time node matrix status.</CardDescription>
                      </CardHeader>
                      <div className="p-8 space-y-4 flex-1">
                         <StatusIndicator label="Active Plans" value={investmentsList.filter(i => i.status === 'active').length} color="bg-emerald-500" />
                         <StatusIndicator label="Paused Yields" value={investmentsList.filter(i => i.status === 'paused').length} color="bg-amber-500" />
                         <StatusIndicator label="Pending Assets" value={paymentsList.filter(p => p.status === 'pending').length} color="bg-blue-500" />
                         <StatusIndicator label="Pending Release" value={withdrawalsList.filter(w => w.status === 'pending').length} color="bg-pink-500" />
                      </div>
                      <NotificationBroadcaster />
                   </Card>
                </div>
              </div>

              {/* Visitor Pulse & Geographic Distribution Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Geographic Distribution Card */}
                <Card className="lg:col-span-1 bg-black/40 border-white/5 p-8 flex flex-col h-[450px] group hover:bg-black/60 transition-all duration-300">
                  <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between shrink-0">
                     <div>
                        <CardTitle className="text-lg uppercase font-black italic tracking-tighter flex items-center gap-2">
                           <Globe className="w-5 h-5 text-primary shrink-0" />
                           Geographic Matrix
                        </CardTitle>
                        <CardDescription className="uppercase font-bold tracking-[0.2em] text-[10px]">Real-time regional terminal node spread.</CardDescription>
                     </div>
                  </CardHeader>
                  <div className="flex-1 overflow-y-auto custom-scrollbar mt-6 pr-1 space-y-4">
                     {geoDistribution.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 rounded-2xl">
                           <MapPin className="w-6 h-6 text-neutral-600 mb-2 animate-pulse" />
                           <div className="text-muted-foreground font-black text-xs uppercase tracking-wider">Awaiting Regional Views</div>
                           <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Node geo-position streams will populate here as sessions resolve.</p>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {geoDistribution.map((item, index) => {
                             const totalViewsCount = pageViews.length || 1;
                             const pct = Math.round((item.count / totalViewsCount) * 100);
                             return (
                                <div key={item.country || index} className="space-y-1.5 p-3.5 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.02] hover:border-white/10 transition duration-200">
                                   <div className="flex justify-between items-center text-xs font-bold text-white">
                                      <div className="flex items-center gap-2">
                                         <span className="w-2.5 h-2.5 rounded-full bg-primary/40 flex items-center justify-center text-[7px] font-mono text-white">
                                            {index + 1}
                                         </span>
                                         <span className="text-xs font-black uppercase tracking-tight">{item.country}</span>
                                      </div>
                                      <span className="font-mono text-[9px] text-primary">{item.count} views ({pct}%)</span>
                                   </div>
                                   
                                   {/* Progress bar */}
                                   <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                      <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                   </div>

                                   {/* Regions split info */}
                                   <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-white/[0.03] mt-2">
                                      <span className="uppercase tracking-widest font-bold">Top region: <span className="text-white normal-case font-black">{item.topRegion}</span></span>
                                      <span className="font-mono text-[9px] uppercase">Regions ({item.regions.length})</span>
                                   </div>
                                </div>
                             );
                           })}
                        </div>
                     )}
                  </div>
                </Card>

                {/* Visitor Pulse & Traffic Matrix Chart (lg:col-span-2) */}
                <Card className="lg:col-span-2 bg-black/40 border-white/5 p-8 h-[450px] group hover:bg-black/60 transition-all flex flex-col">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                     <CardHeader className="p-0">
                        <CardTitle className="text-lg uppercase font-black italic tracking-tighter flex items-center gap-2">
                           <Activity className="w-5 h-5 text-emerald-500 shrink-0" />
                           Visitor Trends Matrix
                        </CardTitle>
                        <CardDescription className="uppercase font-bold tracking-[0.2em] text-[10px]">Unique visitor paths mapped over monthly visit days.</CardDescription>
                     </CardHeader>
                     
                     {/* Horizontal list of metrics ("the rest") */}
                     <div className="flex items-center gap-4 border-l border-white/10 pl-4 shrink-0">
                        <div className="text-left">
                           <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none">Active Pulse</span>
                           <div className="text-xs font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5 leading-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              {visitorMetrics.activeVisitors} LIVE
                           </div>
                        </div>
                        <div className="text-left border-l border-white/5 pl-4">
                           <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none">Weekly</span>
                           <div className="text-xs font-black text-white font-mono mt-0.5 leading-none">
                              {visitorMetrics.visitorsThisWeek} <span className="text-[9px] text-emerald-400 font-bold">↑{visitorMetrics.visitor7dGrowth}%</span>
                           </div>
                        </div>
                        <div className="text-left border-l border-white/5 pl-4">
                           <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none">Monthly</span>
                           <div className="text-xs font-black text-white font-mono mt-0.5 leading-none">
                              {visitorMetrics.visitorsThisMonth} <span className="text-[9px] text-emerald-400 font-bold">↑32.1%</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Chart Representation */}
                  <div className="flex-1 w-full mt-6 h-full min-h-[250px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={visitorDailyChartData}>
                           <defs>
                              <linearGradient id="visitorColorVal" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                 <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="viewsColorVal" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#1E50FF" stopOpacity={0.25}/>
                                 <stop offset="95%" stopColor="#1E50FF" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                           <XAxis dataKey="date" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                           <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                           <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff10', borderRadius: '16px' }} />
                           
                           {/* Page views line */}
                           <Area type="monotone" name="Page Views" dataKey="views" stroke="#1E50FF" strokeWidth={3} fillOpacity={1} fill="url(#viewsColorVal)" />
                           {/* Unique visitors line */}
                           <Area type="monotone" name="Unique Visitors" dataKey="uniques" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#visitorColorVal)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                   <LiveActivityFeed 
                     payments={paymentsList} 
                     withdrawals={withdrawalsList} 
                     investments={investmentsList} 
                     users={usersList} 
                   />
                </div>
                
                <div className="flex flex-col gap-8 lg:col-span-1">
                   {/* Live Visitor Tracker Console */}
                   <Card className="bg-black/40 border-white/5 p-8 flex flex-col h-[380px] group hover:bg-black/60 transition-all duration-300">
                      <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                         <div>
                            <CardTitle className="text-lg uppercase font-black italic tracking-tighter leading-none flex items-center gap-2">
                               <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                               Active Terminal Sessions
                            </CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Live visitor console.</CardDescription>
                         </div>
                         <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[9px] font-mono tracking-widest font-black">
                            REAL-TIME
                         </Badge>
                      </CardHeader>
                      <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 pr-1 space-y-4">
                         {onlineSessions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 rounded-2xl">
                               <UsersIcon className="w-6 h-6 text-neutral-600 mb-2 animate-pulse" />
                               <div className="text-muted-foreground font-black text-xs uppercase tracking-wider">Awaiting Active Nodes</div>
                               <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Keep application tabs active to receive real-time streams.</p>
                            </div>
                         ) : (
                            <div className="space-y-3">
                               {onlineSessions.slice(0, 8).map((session, index) => (
                                  <div key={session.id || index} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-3 hover:border-primary/20 hover:bg-white/[0.03] transition duration-200">
                                     <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-[#1e50ff]/10 border border-[#1e50ff]/20 flex items-center justify-center text-[#1E50FF] font-black shrink-0 font-mono text-xs capitalize">
                                           {session.username?.substring(0, 2) || "S"}
                                        </div>
                                        <div className="min-w-0">
                                           <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-xs font-black text-white truncate max-w-[90px]">{session.username || 'Guest'}</span>
                                              <Badge className={`text-[8px] font-black uppercase font-mono px-1.5 py-px shrink-0 ${
                                                 session.role === 'admin' ? 'bg-red-500/20 text-red-300 border-red-500/20' :
                                                 session.role === 'user' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                              }`}>
                                                 {session.role || 'guest'}
                                              </Badge>
                                           </div>
                                           <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                                              <MapPin className="w-3 h-3 text-primary shrink-0" />
                                              <span className="truncate max-w-[100px]">{session.city || "Unknown"}, {session.country || "Unknown"}</span>
                                           </div>
                                        </div>
                                     </div>

                                     <div className="text-right shrink-0">
                                        <div className="text-[9px] text-muted-foreground flex items-center justify-end gap-1 font-mono uppercase">
                                           {session.deviceType === "Mobile" ? <Smartphone className="w-3 h-3 text-zinc-400" /> :
                                            session.deviceType === "Tablet" ? <Tablet className="w-3 h-3 text-zinc-400" /> :
                                            <Laptop className="w-3 h-3 text-zinc-400" />}
                                           <span>{session.browser || 'Browser'}</span>
                                        </div>
                                        <div className="text-[10px] text-primary font-bold mt-0.5 uppercase tracking-tighter truncate max-w-[100px]">
                                           On: {session.path || '/'}
                                        </div>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         )}
                      </div>
                   </Card>

                   <SupportTicketsPreview tickets={ticketsList} onViewAll={() => setCurrentView('support')} />
                </div>
              </div>
            </div>
          )}

          {currentView === "users" && (
            <UsersManagement 
              users={usersList} 
              investments={investmentsList} 
              pageViews={pageViews}
              onlineSessions={onlineSessions}
              onBypassUser={(uid: string) => {
                setPreselectedBypassUserId(uid);
                setCurrentView("magic-login");
              }}
            />
          )}
          {currentView === "magic-login" && (
            <AdminMagicLogin 
              users={usersList} 
              preselectedUserId={preselectedBypassUserId} 
              onClearPreselected={() => setPreselectedBypassUserId(null)} 
              magicTokens={magicTokens}
            />
          )}
          {currentView === "investments" && <InvestmentsManagement investments={investmentsList} users={usersList} />}
          {currentView === "deposits" && <DepositsManagement payments={paymentsList} users={usersList} />}
          {currentView === "withdrawals" && <WithrawalsManagement withdrawals={withdrawalsList} users={usersList} />}
          {currentView === "plans" && (
            <div className="space-y-12">
               <QuickTradeSettingsManager />
               <PlansManagement plans={plansList} isModalOpen={isPlanModalOpen} setIsModalOpen={setIsPlanModalOpen} editingPlan={editingPlan} setEditingPlan={setEditingPlan} />
               <RewardsManagement users={usersList} rewards={rewardsList} milestones={milestonesList} />
            </div>
          )}
          {currentView === "analytics" && <DeepAnalytics users={usersList} payments={paymentsList} withdrawals={withdrawalsList} financialChartData={financialChartData} planDistributionData={planDistributionData} />}
          {currentView === "transparency" && <AdminTransparency />}
          {currentView === "community" && <AdminCommunity />}
          {currentView === "healing" && <SystemHealingPanel investments={investmentsList} />}
          {currentView === "email-templates" && <EmailTemplatesManager />}
          {currentView === "custom-messenger" && <CustomMessenger users={usersList} />}
          {currentView === "settings" && (
            <div className="space-y-12 max-w-5xl">
               <DepositWithdrawalSettingsManager />
               <QuickTradeSettingsManager />
               <HeroMediaManager heroMediaUrl={heroMediaUrl} heroMediaType={heroMediaType} handleUpdateGlobalConfig={handleUpdateGlobalConfig} />
               <BachsSettingsManager />
               <AiRatesManager />
               <PaymentGatewayManager paymentGateways={paymentGateways} handleUpdateGlobalConfig={handleUpdateGlobalConfig} />
               <BrandingManager />
               <SEOManager handleUpdateGlobalConfig={handleUpdateGlobalConfig} googleSiteVerification={googleSiteVerification} />
               <PwaSettingsManager handleUpdateGlobalConfig={handleUpdateGlobalConfig} pwaBannerDismissDays={pwaBannerDismissDays} />
               <SignupBonusManager handleUpdateGlobalConfig={handleUpdateGlobalConfig} signupBonusEnabled={signupBonusEnabled} signupBonusAmount={signupBonusAmount} />
               <WalletPoolManager />
               <AvatarManager avatars={avatars} />
               <WorkersManager />
               <ReferralSettings />
               <AdminEmailSettings />
               {/* Emergency Protocol Switch */}
               <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-xl">
                 <CardHeader>
                   <CardTitle className="flex items-center text-red-500 uppercase font-black tracking-tighter text-xl italic">
                     <Lock className="w-6 h-6 mr-3" /> Sentinel Protocol
                   </CardTitle>
                   <CardDescription className="uppercase font-bold tracking-widest text-[10px] text-red-500/60">Global Emergency Intercept Switch</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <div className="flex items-center justify-between p-6 bg-red-500/10 rounded-2xl border border-red-500/20">
                       <div>
                          <h4 className="text-base font-black text-white uppercase italic">Maintenance Intercept</h4>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Force redirect all nodes to maintenance pulse.</p>
                       </div>
                       <button 
                         onClick={() => handleUpdateGlobalConfig('maintenanceMode', !maintenanceMode)}
                         className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-500 ${maintenanceMode ? 'bg-red-500 ring-4 ring-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-white/10 opacity-50'}`}
                       >
                         <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-500 ${maintenanceMode ? 'translate-x-9 shadow-lg' : 'translate-x-1'}`} />
                       </button>
                    </div>
                 </CardContent>
               </Card>
               <DatabaseWiper users={usersList} />
            </div>
          )}
          {currentView === "support" && <AdminSupportView tickets={ticketsList} onClearInbox={() => setTicketsList([])} />}
        </div>
      </main>

      {/* Plan Engineering Modal */}
      {isPlanModalOpen && (
        <PlanModal
          isOpen={isPlanModalOpen}
          setIsModalOpen={setIsPlanModalOpen}
          editingPlan={editingPlan}
        />
      )}
    </div>
  );
}
