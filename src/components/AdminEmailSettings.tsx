import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertTriangle, Play, RefreshCw, Layers, ShieldCheck, Database, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminEmailSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);

  const baseUrl = ''; // Relative path, same origin

  const fetchData = async () => {
    try {
      const settingsRes = await fetch(`${baseUrl}/api/mail/settings`);
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setSettings(settingsData.settings);
      }

      const statsRes = await fetch(`${baseUrl}/api/mail/stats`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      const queueRes = await fetch(`${baseUrl}/api/mail/queue`);
      const queueData = await queueRes.json();
      if (queueData.success) {
        setQueue(queueData);
      }
    } catch (err: any) {
      console.error('Failed to load email configurations:', err);
      toast.error('Error fetching email telemetry data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/mail/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setSettings(data.settings);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to update configurations.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a recipient email.');
      return;
    }
    setTesting(true);
    const toastId = toast.loading('Initiating mail delivery diagnostic test...');
    try {
      const res = await fetch(`${baseUrl}/api/mail/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail, useQueue: false })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Diagnostic test successful! Gateway: ${data.provider.toUpperCase()}`, { id: toastId });
        fetchData();
      } else {
        toast.error(data.error || 'Diagnostic delivery failed.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Diagnostic abort.', { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  const handleForceProcessQueue = async () => {
    setProcessingQueue(true);
    const toastId = toast.loading('Forcing instant queue processing cycle...');
    try {
      const res = await fetch(`${baseUrl}/api/mail/queue/process`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Success! Processed ${data.processed} pending background email tasks.`, { id: toastId });
        fetchData();
      } else {
        toast.error('Queue processing cycle encountered errors.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error.', { id: toastId });
    } finally {
      setProcessingQueue(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-12 bg-black/40 border border-white/5 rounded-2xl">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mr-3" />
        <span className="text-sm font-black text-muted-foreground uppercase tracking-wider">Decoding transaction routing matrix...</span>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-5xl">
      {/* Configuration Form Panel */}
      <div className="bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center">
              <Mail className="w-6 h-6 mr-3 text-primary animate-pulse" /> Unified Mail Infrastructure
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mt-1">
              Secure transactional and notification delivery systems routed via Resend API.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleForceProcessQueue}
              disabled={processingQueue}
              className="px-4 py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white rounded-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${processingQueue ? 'animate-spin' : ''}`} /> Sync Queue
            </button>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="p-8 space-y-8">
          {/* Resend API Key */}
          <div className="grid grid-cols-1 gap-6 pb-6 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-black text-primary uppercase tracking-wider italic">1. Resend API Authentication</h4>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resend Private Key</label>
              <input
                type="password"
                value={settings.resendApiKey}
                onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
                placeholder="re_••••••••••••••••••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Senders and Throttling */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider italic flex items-center">
                <Database className="w-4 h-4 mr-2" /> 3. Sender Routing Addresses & Spam Shields
              </h4>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Support Sender</label>
              <input
                type="text"
                value={settings.systemEmailSender}
                onChange={(e) => setSettings({ ...settings, systemEmailSender: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Welcome / Onboard Sender</label>
              <input
                type="text"
                value={settings.welcomeEmailSender}
                onChange={(e) => setSettings({ ...settings, welcomeEmailSender: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Noreply Notification Sender</label>
              <input
                type="text"
                value={settings.noreplyEmailSender}
                onChange={(e) => setSettings({ ...settings, noreplyEmailSender: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anti-Spam Cooldown (Sec)</label>
              <input
                type="number"
                value={settings.otpCooldownSeconds}
                onChange={(e) => setSettings({ ...settings, otpCooldownSeconds: parseInt(e.target.value, 10) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Max OTP Resends (Count)</label>
              <input
                type="number"
                value={settings.maxResendAttempts}
                onChange={(e) => setSettings({ ...settings, maxResendAttempts: parseInt(e.target.value, 10) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lockout Period (Min)</label>
              <input
                type="number"
                value={settings.lockoutDurationMinutes}
                onChange={(e) => setSettings({ ...settings, lockoutDurationMinutes: parseInt(e.target.value, 10) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary hover:bg-primary/95 text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-[0_0_20px_rgba(30,80,255,0.3)] transition-all hover:scale-[1.02] cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Config Updates'}
            </button>
          </div>
        </form>
      </div>

      {/* Diagnostics Panel - Send Test Email */}
      <div className="bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl p-8 space-y-6 shadow-xl">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tighter italic flex items-center">
            <Play className="w-5 h-5 text-emerald-500 mr-2" /> Upstream Gateway Delivery Diagnostics
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mt-1">
            Dispatch diagnostic verification emails instantly to test Resend API delivery connections.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="diagnostics-recipient@gmail.com"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testing}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-xs font-black uppercase tracking-widest text-black rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
          >
            {testing ? 'Verifying...' : 'Dispatch Test Mail'}
          </button>
        </div>
      </div>

      {/* DNS Domain Verification Panel */}
      <div className="bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl p-8 space-y-6 shadow-xl">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tighter italic flex items-center">
            <ShieldCheck className="w-5 h-5 text-blue-500 mr-2" /> SPF, DKIM & DMARC DNS Records
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mt-1">
            Required records for maximum inbox reputation and deliverability on domain <strong className="text-white">update.aetheriss.online</strong>.
          </p>
        </div>

        <div className="space-y-4">
          {/* SPF */}
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">SPF (TXT)</span>
              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">RECOMMENDED</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
              <div className="text-muted-foreground font-semibold">Host / Name:</div>
              <div className="md:col-span-3 font-mono bg-black/60 p-2 rounded text-white overflow-x-auto select-all">@</div>
              <div className="text-muted-foreground font-semibold">TXT Value:</div>
              <div className="md:col-span-3 font-mono bg-black/60 p-2 rounded text-blue-400 overflow-x-auto select-all">v=spf1 include:feedback-spf.resend.com ~all</div>
            </div>
          </div>

          {/* DKIM */}
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">DKIM (TXT)</span>
              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">RECOMMENDED</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
              <div className="text-muted-foreground font-semibold">Host / Name:</div>
              <div className="md:col-span-3 font-mono bg-black/60 p-2 rounded text-white overflow-x-auto select-all">mail._domainkey.update.aetheriss.online</div>
              <div className="text-muted-foreground font-semibold">TXT Value:</div>
              <div className="md:col-span-3 font-mono bg-black/60 p-2 rounded text-blue-400 overflow-x-auto select-all">k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3YI3Y8cM...</div>
            </div>
          </div>

          {/* DMARC */}
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">DMARC (TXT)</span>
              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">RECOMMENDED</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
              <div className="text-muted-foreground font-semibold">Host / Name:</div>
              <div className="md:col-span-3 font-mono bg-black/60 p-2 rounded text-white overflow-x-auto select-all">_dmarc.update.aetheriss.online</div>
              <div className="text-muted-foreground font-semibold">TXT Value:</div>
              <div className="md:col-span-3 font-mono bg-black/60 p-2 rounded text-blue-400 overflow-x-auto select-all">v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@update.aetheriss.online</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Email Analytics & Queue Logs */}
      {stats && queue && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Active Queue State */}
          <div className="bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl p-8 space-y-6 shadow-xl">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tighter italic flex items-center">
                <Layers className="w-5 h-5 text-indigo-400 mr-2" /> Active Task Persistence Queue
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#64748b] mt-1">
                Background worker tasks holding for backoff limits or cooldown retries.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                <span className="text-2xl font-black text-indigo-400">{queue.pendingCount}</span>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-1">Pending Mail Jobs</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                <span className="text-2xl font-black text-red-400">{queue.failedAttemptsCount}</span>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-1">Max Retries Exhausted</p>
              </div>
            </div>

            {queue.pendingJobs && queue.pendingJobs.length > 0 ? (
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground">Recent Buffered Queue Items</h4>
                {queue.pendingJobs.map((job: any) => (
                  <div key={job.id} className="p-2 bg-black/60 rounded border border-white/5 text-[10px] flex items-center justify-between gap-2">
                    <span className="font-mono text-indigo-400 truncate">{job.to}</span>
                    <span className="text-white/60 shrink-0 font-bold">{job.attempts} attempt(s)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground font-semibold uppercase italic text-center">Continuous queue status: pristine empty.</p>
            )}
          </div>

          {/* Delivery Logs Analytics */}
          <div className="bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl p-8 space-y-6 shadow-xl">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tighter italic flex items-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-2" /> Live Analytics & logs
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#64748b] mt-1">
                System telemetry tracking delivery percentages from active nodes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-center">
                <span className="text-2xl font-black text-emerald-400">{stats.estimatedSent}</span>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-1">Delivered via SMTP/API</p>
              </div>
              <div className="p-4 bg-red-500/5 border border-red-500/15 rounded-xl text-center">
                <span className="text-2xl font-black text-red-400">{stats.estimatedFailed}</span>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-1">Total Delivery Rejections</p>
              </div>
            </div>

            {stats.recentFailures && stats.recentFailures.length > 0 ? (
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                <h4 className="text-[10px] font-black uppercase text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Recent Outbound Failures
                </h4>
                {stats.recentFailures.map((log: any) => (
                  <div key={log.id} className="p-2 bg-red-500/10 border border-red-500/20 rounded text-[9px] text-red-200">
                    <div className="flex justify-between font-bold">
                      <span className="truncate">{log.to}</span>
                      <span>({log.provider})</span>
                    </div>
                    <p className="text-red-400 italic truncate mt-0.5">{log.error}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground font-semibold uppercase italic text-center">Outbound system status: perfect health.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
