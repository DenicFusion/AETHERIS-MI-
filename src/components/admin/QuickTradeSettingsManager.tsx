import React, { useState, useEffect } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Save, RefreshCcw, Check, Sparkles, Sliders } from "lucide-react";
import { toast } from "sonner";

export function QuickTradeSettingsManager() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [minUsd, setMinUsd] = useState<number>(100);
  const [maxUsd, setMaxUsd] = useState<number>(999);
  const [defaultUsd, setDefaultUsd] = useState<number>(450);
  const [returnPct, setReturnPct] = useState<number>(8.4);
  const [cycleDays, setCycleDays] = useState<number>(3);
  const [presetsStr, setPresetsStr] = useState<string>("100, 250, 450, 750, 999");
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.quickTradeEnabled !== undefined) setEnabled(!!data.quickTradeEnabled);
        if (data.quickTradeMin !== undefined) setMinUsd(Number(data.quickTradeMin));
        if (data.quickTradeMax !== undefined) setMaxUsd(Number(data.quickTradeMax));
        if (data.quickTradeDefault !== undefined) setDefaultUsd(Number(data.quickTradeDefault));
        if (data.quickTradeReturnPct !== undefined) setReturnPct(Number(data.quickTradeReturnPct));
        if (data.quickTradeCycleDays !== undefined) setCycleDays(Number(data.quickTradeCycleDays));
        if (Array.isArray(data.quickTradePresets)) {
          setPresetsStr(data.quickTradePresets.join(", "));
        }
      }
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedPresets = presetsStr
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      await setDoc(
        doc(db, "config", "global"),
        {
          quickTradeEnabled: enabled,
          quickTradeMin: minUsd,
          quickTradeMax: maxUsd,
          quickTradeDefault: defaultUsd,
          quickTradeReturnPct: returnPct,
          quickTradeCycleDays: cycleDays,
          quickTradePresets: parsedPresets.length > 0 ? parsedPresets : [100, 250, 450, 750, 999],
        },
        { merge: true }
      );
      toast.success("Quick Trade configuration updated successfully!");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update Quick Trade settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setEnabled(true);
    setMinUsd(100);
    setMaxUsd(999);
    setDefaultUsd(450);
    setReturnPct(8.4);
    setCycleDays(3);
    setPresetsStr("100, 250, 450, 750, 999");
    toast.info("Reset to default Quick Trade values. Click 'Save Changes' to apply.");
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase italic tracking-tighter text-white">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" /> Quick Trade Control Hub
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Configure parameters, limits, returns, and quick trade options for all platform users.
            </CardDescription>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              enabled ? "bg-amber-500" : "bg-white/10"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
              Minimum Trade ($ USD)
            </label>
            <input
              type="number"
              value={minUsd}
              onChange={(e) => setMinUsd(Number(e.target.value))}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
              Maximum Trade ($ USD)
            </label>
            <input
              type="number"
              value={maxUsd}
              onChange={(e) => setMaxUsd(Number(e.target.value))}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
              Default Input Amount ($ USD)
            </label>
            <input
              type="number"
              value={defaultUsd}
              onChange={(e) => setDefaultUsd(Number(e.target.value))}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
              Estimated Return Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={returnPct}
                onChange={(e) => setReturnPct(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                %{returnPct}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
              Cycle Duration (Days)
            </label>
            <input
              type="number"
              value={cycleDays}
              onChange={(e) => setCycleDays(Number(e.target.value))}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
            Preset Selection Amounts (comma-separated $ USD)
          </label>
          <input
            type="text"
            value={presetsStr}
            onChange={(e) => setPresetsStr(e.target.value)}
            placeholder="100, 250, 450, 750, 999"
            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetDefaults}
            className="border-white/10 text-slate-300 hover:bg-white/5 text-xs uppercase font-bold"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Reset Defaults
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-xs tracking-wider px-6 h-10 shadow-lg shadow-amber-500/20"
          >
            {isSaving ? "Saving..." : "Save Quick Trade Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export default QuickTradeSettingsManager;
