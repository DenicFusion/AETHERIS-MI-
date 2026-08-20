import React, { useState, useEffect } from 'react';
import { ChevronLeft, Camera, CheckCircle2, Shield, Lock, Smartphone, Globe, UserCheck, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { doc, updateDoc, onSnapshot, collection, addDoc, deleteDoc, getDocs, query, where, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";

function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Active Device';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'System';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) os = 'iOS';

  return `${browser} on ${os}`;
}

interface ViewProps {
  user: any;
  onBack: () => void;
  setAvatarModalOpen?: (open: boolean) => void;
}

export function PersonalInformation({ user, onBack, setAvatarModalOpen }: ViewProps) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || "");
  const [country, setCountry] = useState(user?.country || "United Kingdom");
  const [avatarUrl, setAvatarUrl] = useState(user?.profile_avatar || user?.avatarUrl || user?.avatar_url || user?.photoURL || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);

  // Real-time Firestore user listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.fullName) setFullName(data.fullName);
        if (data.email) setEmail(data.email);
        if (data.phone_number) setPhoneNumber(data.phone_number);
        if (data.country) setCountry(data.country);
        const av = data.profile_avatar || data.avatarUrl || data.avatar_url || data.photoURL;
        if (av) setAvatarUrl(av);
      }
    }, (err) => {
      console.warn("Profile overview snapshot listener error:", err);
    });
    return () => unsub();
  }, [user?.uid]);

  // Load custom avatars strictly from Firestore avatars collection uploaded by admin panel ONLY
  useEffect(() => {
    getDocs(collection(db, "avatars"))
      .then((snap) => {
        const fetched = snap.docs.map((d) => d.data().image_url).filter(Boolean);
        setAvailableAvatars(fetched);
      })
      .catch((err) => {
        console.error("Error fetching avatars:", err);
        setAvailableAvatars([]);
      });
  }, []);

  const getMemberTierName = (deposits: number = 0) => {
    if (user?.tier) return user.tier;
    if (user?.member_tier) return user.member_tier;
    if (deposits >= 500000) return "Ultra Member";
    if (deposits >= 100000) return "Apex Member";
    if (deposits >= 50000) return "Quantum Member";
    if (deposits >= 10000) return "Prime Member";
    if (deposits >= 5000) return "Core Member";
    if (deposits >= 1000) return "Starter Member";
    return "Apex Member";
  };

  const memberTier = getMemberTierName(user?.total_deposits || 0);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSelectAvatar = async (url: string) => {
    setAvatarUrl(url);
    setShowAvatarPicker(false);
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        profile_avatar: url,
        avatarUrl: url,
        avatar_url: url,
        photoURL: url
      });
      toast.success("Avatar updated");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to save avatar: " + e.message);
    }
  };

  const handleOpenAvatarSelector = () => {
    if (setAvatarModalOpen) {
      setAvatarModalOpen(true);
    } else {
      setShowAvatarPicker(true);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        fullName,
        phone_number: phoneNumber,
        country,
        profile_avatar: avatarUrl,
        avatarUrl,
        avatar_url: avatarUrl,
        photoURL: avatarUrl
      });
      toast.success("Personal information saved");
      onBack();
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-in slide-in-from-right duration-300 h-full p-4 max-w-lg mx-auto w-full font-sans relative">
      <div className="flex items-center mt-1 mb-1">
        <ChevronLeft className="w-6 h-6 text-foreground cursor-pointer mr-2 hover:opacity-80 transition-opacity" onClick={onBack} />
        <h2 className="text-base font-bold text-foreground">Personal Information</h2>
      </div>

      {/* Profile Header & Avatar Editor */}
      <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-5 text-center shadow-lg relative overflow-hidden flex flex-col items-center">
        <div className="relative group mb-3 cursor-pointer" onClick={handleOpenAvatarSelector}>
          <div className="w-24 h-24 rounded-full bg-[#0284c7] flex items-center justify-center text-white font-black text-2xl shadow-xl overflow-hidden border-2 border-[#38bdf8]/40 hover:opacity-90 transition-opacity">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{getInitials(fullName || "User")}</span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAvatarSelector();
            }}
            className="absolute bottom-0 right-0 bg-[#0284c7] hover:bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-[#0c142b] transition-transform active:scale-95"
            title="Select Avatar"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-mono mb-2">Tap avatar or camera button to change avatar</p>

        {/* Member Status & Verified Badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="px-3.5 py-1 rounded-full text-[11px] font-extrabold border border-[#f59e0b]/50 text-[#f59e0b] bg-[#f59e0b]/10 uppercase tracking-wide">
            {memberTier.toUpperCase()}
          </span>
          <span className="px-3.5 py-1 rounded-full text-[11px] font-extrabold border border-[#10b981]/50 text-[#10b981] bg-[#10b981]/10 flex items-center gap-1 uppercase tracking-wide">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
            Verified
          </span>
        </div>
      </div>

      {/* Input Form Fields */}
      <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full name</label>
          <input
            type="text"
            className="w-full bg-[#070b13] border border-[#182344] focus:border-primary rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Master Admin"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</label>
          <input
            type="email"
            className="w-full bg-[#070b13] border border-[#182344] rounded-xl px-4 py-3 text-sm text-slate-300 opacity-70 cursor-not-allowed"
            value={email}
            disabled
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</label>
          <input
            type="text"
            className="w-full bg-[#070b13] border border-[#182344] focus:border-primary rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            placeholder="+44 7700 900123"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Country</label>
          <input
            type="text"
            className="w-full bg-[#070b13] border border-[#182344] focus:border-primary rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="e.g. United Kingdom"
          />
        </div>
      </div>

      <Button
        className="mt-2 bg-primary hover:bg-blue-600 h-12 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 transition-all"
        onClick={handleSave}
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>

      {/* Avatar Selection Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-[12000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c142b] border border-[#182344] rounded-3xl w-full max-w-md p-6 relative max-h-[85vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setShowAvatarPicker(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">
              Select Your Avatar
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Choose an avatar uploaded from the admin panel.
            </p>
            {availableAvatars.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-[#070b13] border border-[#182344] rounded-2xl p-4">
                No avatars have been uploaded by the admin yet.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3.5">
                {availableAvatars.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectAvatar(url)}
                    className={`aspect-square rounded-2xl cursor-pointer overflow-hidden border-2 transition-all hover:scale-105 relative group bg-[#070b13] ${
                      avatarUrl === url
                        ? "border-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-105"
                        : "border-[#182344] hover:border-[#38bdf8]/50"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`avatar-${i}`}
                      className="w-full h-full object-cover"
                    />
                    {avatarUrl === url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white bg-primary rounded-full p-0.5 shadow-md" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SecuritySettings({ user, onBack }: ViewProps) {
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsSavingPassword(true);
    try {
      if (auth.currentUser && auth.currentUser.email) {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, cred);
        await updatePassword(auth.currentUser, newPassword);
        toast.success("Password updated successfully");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        throw new Error("No authenticated user session found");
      }
    } catch (err: any) {
      console.error("Password update error:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error("Current password is incorrect");
      } else {
        toast.error(err.message || "Failed to update password. Please check your current password.");
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-in slide-in-from-right duration-300 h-full p-4 max-w-lg mx-auto w-full font-sans">
      <div className="flex items-center mt-1 mb-1">
        <ChevronLeft className="w-6 h-6 text-foreground cursor-pointer mr-2 hover:opacity-80 transition-opacity" onClick={onBack} />
        <h2 className="text-base font-bold text-foreground">Security Settings</h2>
      </div>

      {/* Change Password Card */}
      <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-5 shadow-lg space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">CHANGE PASSWORD</h3>
        <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full bg-[#070b13] border border-[#182344] focus:border-primary rounded-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors"
          />
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full bg-[#070b13] border border-[#182344] focus:border-primary rounded-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors"
          />
          <input
            type="password"
            value={confirmNewPassword}
            onChange={e => setConfirmNewPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full bg-[#070b13] border border-[#182344] focus:border-primary rounded-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors"
          />
          <p className="text-[10px] text-slate-400 pl-1">Minimum 8 characters, one number, one symbol.</p>
          <Button
            type="submit"
            disabled={isSavingPassword || !newPassword}
            className="w-full bg-primary hover:bg-blue-600 h-11 rounded-xl text-xs font-bold transition-all mt-2"
          >
            {isSavingPassword ? "Updating..." : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function CurrencySettings({ user, onBack }: ViewProps) {
  const { localCurrency } = useCurrency();
  const [currency, setCurrency] = useState(user?.preferredCurrency || "USD");
  const [isLoading, setIsLoading] = useState(false);

  // Real-time listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const val = snap.data().preferredCurrency || snap.data().currency;
        if (val) setCurrency(val);
      }
    }, (err) => console.warn("Currency settings snapshot error:", err));
    return () => unsub();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        preferredCurrency: currency,
        currency: currency
      });
      toast.success("Currency updated");
      onBack();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currencyOptions = ['USD', 'EUR', 'GBP'];
  if (localCurrency && !currencyOptions.includes(localCurrency)) {
    currencyOptions.push(localCurrency);
  }

  return (
    <div className="flex flex-col gap-5 animate-in slide-in-from-right duration-300 h-full p-4 max-w-lg mx-auto w-full font-sans">
      <div className="flex items-center mt-1 mb-1">
        <ChevronLeft className="w-6 h-6 text-foreground cursor-pointer mr-2 hover:opacity-80 transition-opacity" onClick={onBack} />
        <h2 className="text-base font-bold text-foreground">Currency Preference</h2>
      </div>
      <div className="space-y-3">
        {currencyOptions.map((c) => {
          const symbolMap: Record<string, string> = {
            'USD': '$', 'GBP': '£', 'EUR': '€',
            'NGN': '₦', 'ZAR': 'R', 'GHS': 'GH₵',
            'KES': 'KSh', 'SEK': 'kr', 'AED': 'AED'
          };
          const sym = symbolMap[c] || c;

          return (
            <div
              key={c}
              onClick={() => setCurrency(c)}
              className={`p-4 rounded-2xl border flex justify-between items-center cursor-pointer transition-all ${
                currency === c ? 'border-primary bg-primary/10' : 'border-[#182344] bg-[#0c142b] hover:border-primary/40'
              }`}
            >
              <span className="font-bold text-sm text-white">{c} ({sym})</span>
              {currency === c && <div className="w-4 h-4 rounded-full bg-primary" />}
            </div>
          );
        })}
      </div>
      <Button className="mt-auto bg-primary hover:bg-blue-600 h-12 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 transition-all" onClick={handleSave} disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

export function NotificationSettings({ user, onBack }: ViewProps) {
  const [pushEnabled, setPushEnabled] = useState(user?.push_enabled !== false);
  const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications !== false);

  const [notifs, setNotifs] = useState(user?.notification_preferences || {
    deposit: true,
    withdrawal: true,
    referral_earning: true,
    plan_activated: true,
    plan_completed: true,
    profit: true,
    interval: true,
    security: true,
    support_reply: true,
    system_alert: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Real-time listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.push_enabled !== undefined) setPushEnabled(data.push_enabled);
        if (data.email_notifications !== undefined) setEmailNotifications(data.email_notifications);
        if (data.notification_preferences) setNotifs(data.notification_preferences);
      }
    }, (err) => console.warn("Notification settings snapshot error:", err));
    return () => unsub();
  }, [user?.uid]);

  const toggle = (key: string) => setNotifs({ ...notifs, [key]: !notifs[key as keyof typeof notifs] });

  const handleSave = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        notification_preferences: notifs,
        push_enabled: pushEnabled,
        email_notifications: emailNotifications
      });
      toast.success("Notification settings saved");
      onBack();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const notificationOptions = [
    { key: "deposit", label: "Deposits", desc: "When your deposits are approved" },
    { key: "withdrawal", label: "Withdrawals", desc: "When withdrawals are processed" },
    { key: "referral_earning", label: "Referral Rewards", desc: "When you earn from referrals" },
    { key: "plan_activated", label: "Program Activations", desc: "When a trading engine is activated" },
    { key: "plan_completed", label: "Program Completions", desc: "When trading operations complete" },
    { key: "profit", label: "Cycle Distributions", desc: "When trading outcome distributions process" },
    { key: "security", label: "Security Alerts", desc: "Important account security warnings" },
    { key: "support_reply", label: "Support Replies", desc: "When support replies to your ticket" },
    { key: "system_alert", label: "System Announcements", desc: "Platform updates and news" },
  ];

  return (
    <div className="flex flex-col gap-5 animate-in slide-in-from-right duration-300 h-full p-4 max-w-lg mx-auto w-full font-sans">
      <div className="flex items-center mt-1 mb-1">
        <ChevronLeft className="w-6 h-6 text-foreground cursor-pointer mr-2 hover:opacity-80 transition-opacity" onClick={onBack} />
        <h2 className="text-base font-bold text-foreground">Notification Settings</h2>
      </div>

      {/* Delivery Channels */}
      <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-5 shadow-lg space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-[#182344] pb-2">DELIVERY METHODS</h3>

        <div className="flex justify-between items-center py-1">
          <div className="space-y-0.5 pr-2">
            <div className="font-bold text-sm text-white">Push Notifications</div>
            <div className="text-xs text-slate-400">Receive real-time alerts on this device</div>
          </div>
          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            onClick={() => setPushEnabled(!pushEnabled)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              pushEnabled ? 'bg-primary' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                pushEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex justify-between items-center py-1">
          <div className="space-y-0.5 pr-2">
            <div className="font-bold text-sm text-white">Email Backups</div>
            <div className="text-xs text-slate-400">Get important alerts sent to your email</div>
          </div>
          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={emailNotifications}
            onClick={() => setEmailNotifications(!emailNotifications)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              emailNotifications ? 'bg-primary' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                emailNotifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Alert Topics */}
      <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-5 shadow-lg space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-[#182344] pb-2">ALERT TOPICS</h3>
        <div className="space-y-3.5">
          {notificationOptions.map((n) => {
            const isChecked = !!(notifs as any)[n.key];
            return (
              <div key={n.key} className="flex justify-between items-center py-0.5">
                <div className="space-y-0.5 pr-3">
                  <div className="font-bold text-sm text-white">{n.label}</div>
                  <div className="text-xs text-slate-400">{n.desc}</div>
                </div>
                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isChecked}
                  onClick={() => toggle(n.key)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isChecked ? 'bg-primary' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isChecked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Button className="mt-auto bg-primary hover:bg-blue-600 h-12 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 transition-all" onClick={handleSave} disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

export function SupportSettings({ user, onBack }: ViewProps) {
  return (
    <div className="flex flex-col gap-5 animate-in slide-in-from-right duration-300 h-full p-4 max-w-lg mx-auto w-full font-sans">
      <div className="flex items-center mt-1 mb-1">
        <ChevronLeft className="w-6 h-6 text-foreground cursor-pointer mr-2 hover:opacity-80 transition-opacity" onClick={onBack} />
        <h2 className="text-base font-bold text-foreground">Support & Help</h2>
      </div>

      <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-5 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white">Need Assistance?</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          You can launch the AI Chatbot or connect directly with live technical support officers in our dedicated Support Hub.
        </p>
      </div>
    </div>
  );
}

