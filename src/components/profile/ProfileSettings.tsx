import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Shield, Globe, UsersIcon, Bell, CreditCard, HelpCircle, ChevronRight, CheckCircle2, ChevronLeft, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonalInformation, SecuritySettings, CurrencySettings, NotificationSettings, SupportSettings } from "./ProfileViews";
import { ReferralSettings, PaymentMethodsSettings } from "./ProfileExtras";
import { useTheme } from '@/contexts/ThemeContext';
import { LevelBadge } from "@/components/ui/LevelBadge";

interface ProfileSettingsProps {
  user: any;
  preferredCurrency: string;
  avatarUrl: string;
  onBack: () => void;
  onLogout: () => void;
  setAvatarModalOpen: (val: boolean) => void;
  navigateTab?: (tab: string) => void;
}

export function ProfileSettings({ user, preferredCurrency, avatarUrl, onBack, onLogout, setAvatarModalOpen, navigateTab }: ProfileSettingsProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  if (activeSection === 'personal') {
    return <PersonalInformation user={user} onBack={() => setActiveSection(null)} setAvatarModalOpen={setAvatarModalOpen} />;
  }
  if (activeSection === 'security') {
    return <SecuritySettings user={user} onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === 'currency') {
    return <CurrencySettings user={user} onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === 'notifications') {
    return <NotificationSettings user={user} onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === 'support') {
    if (navigateTab) navigateTab("support");
    return null;
  }
  if (activeSection === 'referral') {
    if (navigateTab) navigateTab("referrals");
    return null;
  }
  if (activeSection === 'payments') {
    return <PaymentMethodsSettings user={user} onBack={() => setActiveSection(null)} />;
  }

  const getMemberTierName = (deposits: number = 0) => {
    if (deposits >= 500000) return "Ultra Member";
    if (deposits >= 100000) return "Apex Member";
    if (deposits >= 50000) return "Quantum Member";
    if (deposits >= 10000) return "Prime Member";
    if (deposits >= 5000) return "Core Member";
    if (deposits >= 1000) return "Starter Member";
    return "Member";
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(user?.fullName || "User");
  const memberTier = getMemberTierName(user?.total_deposits || 0);

  const accountItems = [
    { id: 'personal', icon: User, label: "Personal Information" },
    { id: 'security', icon: Shield, label: "Security Settings" },
    { id: 'currency', icon: Globe, label: "Currency Preference", value: preferredCurrency || user?.currency || "GBP" },
  ];

  const activityItems = [
    { id: 'referral', icon: UsersIcon, label: "Referral & Earnings", value: `$${(user?.total_referral_earnings || 0).toFixed(2)}`, valueColor: "text-[#38bdf8]" },
    { id: 'notifications', icon: Bell, label: "Notification Settings" },
    { id: 'payments', icon: CreditCard, label: "Payment Methods" },
  ];

  const supportItems = [
    { id: 'support', icon: HelpCircle, label: "Support & Help" },
  ];

  return (
    <div className="pb-28 max-w-lg mx-auto w-full pt-4 px-4 h-full overflow-y-auto font-sans">
      <div className="flex items-center justify-between mt-2 mb-4">
        <ChevronLeft
          className="w-6 h-6 text-foreground cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onBack}
        />
        <h2 className="text-base font-bold text-foreground tracking-tight">Profile</h2>
        <div className="w-6" />
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-6 text-center shadow-xl relative overflow-hidden mb-6">
        <div className="flex flex-col items-center">
          <div
            onClick={() => setAvatarModalOpen(true)}
            className="w-24 h-24 rounded-full bg-[#0284c7] flex items-center justify-center text-white font-black text-2xl cursor-pointer hover:opacity-90 transition-opacity shadow-lg mb-3 border-2 border-[#38bdf8]/40"
          >
            {avatarUrl && !avatarUrl.includes('dicebear') && !avatarUrl.includes('avataaars') ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <h2 className="text-xl font-bold text-white flex items-center justify-center gap-1.5 tracking-tight">
            {user?.fullName || "User"}
            <CheckCircle2 className="w-5 h-5 text-[#38bdf8] fill-[#38bdf8] text-[#0c142b] shrink-0" />
          </h2>

          <p className="text-sm text-slate-400 mt-0.5 mb-4">{user?.email}</p>

          <div className="flex items-center justify-center gap-2.5">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold border border-[#f59e0b]/60 text-[#f59e0b] bg-[#f59e0b]/10 tracking-wide">
              {memberTier}
            </span>
            <span className="px-3.5 py-1 rounded-full text-xs font-bold border border-[#10b981]/60 text-[#10b981] bg-[#10b981]/10 flex items-center gap-1 tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
              Verified
            </span>
          </div>
        </div>
      </div>

      {/* ACCOUNT SECTION */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">ACCOUNT</h3>
        <div className="bg-[#0c142b] border border-[#182344] rounded-2xl overflow-hidden divide-y divide-[#182344]">
          {accountItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className="flex justify-between items-center p-4 hover:bg-[#111c3a] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#172554] flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-[#38bdf8]" />
                </div>
                <span className="text-sm text-white font-semibold">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.value && (
                  <span className="text-xs text-slate-400 font-bold tracking-wide">
                    {item.value}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVITY SECTION */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">ACTIVITY</h3>
        <div className="bg-[#0c142b] border border-[#182344] rounded-2xl overflow-hidden divide-y divide-[#182344]">
          {activityItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.id === 'referral') {
                  if (navigateTab) navigateTab('referrals');
                } else {
                  setActiveSection(item.id);
                }
              }}
              className="flex justify-between items-center p-4 hover:bg-[#111c3a] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#172554] flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-[#38bdf8]" />
                </div>
                <span className="text-sm text-white font-semibold">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.value && (
                  <span className={`text-xs font-bold tracking-wide ${item.valueColor || "text-slate-400"}`}>
                    {item.value}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SUPPORT SECTION */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">SUPPORT</h3>
        <div className="bg-[#0c142b] border border-[#182344] rounded-2xl overflow-hidden divide-y divide-[#182344]">
          {supportItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.id === 'support') {
                  if (navigateTab) navigateTab('support');
                } else {
                  setActiveSection(item.id);
                }
              }}
              className="flex justify-between items-center p-4 hover:bg-[#111c3a] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#172554] flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-[#38bdf8]" />
                </div>
                <span className="text-sm text-white font-semibold">
                  {item.label}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      </div>

      {/* LOG OUT BUTTON */}
      <button
        type="button"
        onClick={onLogout}
        className="w-full bg-[#0c142b] border border-red-500/60 hover:bg-red-500/10 text-red-500 font-bold h-12 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        Log Out
      </button>
    </div>
  );
}
