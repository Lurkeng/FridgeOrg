import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useHousehold, useHouseholdMembers, useCreateHousehold, useJoinHousehold, useRegenerateInviteCode } from "@/hooks/useHousehold";
import { PageHeader } from "@/components/layout/PageHeader";
import GlassCard from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Settings, Home, Users, Copy, RefreshCw, Plus, LogIn, Crown, User, Shield, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportAllData } from "@/server/export";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const baseInput =
  "w-full glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 " +
  "transition-all duration-200 outline-none " +
  "focus:ring-2 focus:ring-frost-400/50 focus:bg-white/80 hover:bg-white/75";

function NoHouseholdPanel() {
  const { toast } = useToast();
  const createHousehold = useCreateHousehold();
  const joinHousehold   = useJoinHousehold();
  const [mode, setMode]               = useState<"create" | "join">("create");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode]       = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) return;
    try {
      await createHousehold.mutateAsync({ name: householdName.trim() });
      toast(`Household "${householdName.trim()}" created!`, "success");
      setHouseholdName("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create household", "error");
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim().length !== 6) return;
    try {
      await joinHousehold.mutateAsync({ inviteCode: inviteCode.trim().toUpperCase() });
      toast("Joined household!", "success");
      setInviteCode("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Invalid invite code", "error");
    }
  };

  return (
    <GlassCard className="p-6 max-w-md animate-fade-in-up" hover={false}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-frost-400 to-frost-600 flex items-center justify-center mx-auto mb-3 shadow-glow-frost">
          <Home className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Join or Create a Household</h2>
        <p className="text-sm text-slate-500">A household lets you share your food inventory with family or housemates.</p>
      </div>

      <div className="flex gap-1 glass rounded-2xl p-1.5 mb-5">
        <button type="button" onClick={() => setMode("create")}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200", mode === "create" ? "glass-heavy text-slate-800 shadow-glass" : "text-slate-500 hover:text-slate-700 hover:bg-white/30")}>
          <Plus className="w-3.5 h-3.5" />Create New
        </button>
        <button type="button" onClick={() => setMode("join")}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200", mode === "join" ? "glass-heavy text-slate-800 shadow-glass" : "text-slate-500 hover:text-slate-700 hover:bg-white/30")}>
          <LogIn className="w-3.5 h-3.5" />Join Existing
        </button>
      </div>

      {mode === "create" ? (
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="e.g. Smith Family, Flat 4B…"
            className={baseInput} maxLength={100} required
          />
          <button type="submit" disabled={createHousehold.isPending || !householdName.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all disabled:opacity-50 disabled:pointer-events-none">
            {createHousehold.isPending ? "Creating…" : "Create Household"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-3">
          <input
            type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="6-character invite code (e.g. AB3XY7)"
            className={cn(baseInput, "uppercase tracking-widest font-mono")}
            maxLength={6} required
          />
          <button type="submit" disabled={joinHousehold.isPending || inviteCode.trim().length !== 6}
            className="w-full py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all disabled:opacity-50 disabled:pointer-events-none">
            {joinHousehold.isPending ? "Joining…" : "Join Household"}
          </button>
        </form>
      )}
    </GlassCard>
  );
}

function HouseholdPanel() {
  const { toast }                            = useToast();
  const { data: household }                  = useHousehold();
  const { data: members = [] }               = useHouseholdMembers();
  const regenerateCode                       = useRegenerateInviteCode();

  if (!household) return null;
  const { household: hh, role } = household;
  const isOwner = role === "owner";

  const copyInviteCode = () => {
    navigator.clipboard.writeText(hh.inviteCode).then(
      () => toast("Invite code copied!", "success"),
      () => toast("Failed to copy", "error"),
    );
  };

  const handleRegenerate = async () => {
    try {
      await regenerateCode.mutateAsync();
      toast("Invite code regenerated", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to regenerate", "error");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up max-w-lg">
      {/* Household info */}
      <GlassCard className="p-5" hover={false}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-frost-400 to-frost-600 flex items-center justify-center shadow-sm">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{hh.name}</h3>
            <p className="text-xs text-slate-500 capitalize">{role} · {members.length} member{members.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Invite Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 glass rounded-xl px-4 py-2.5 font-mono text-lg font-bold tracking-widest text-slate-800 text-center">
              {hh.inviteCode}
            </div>
            <button type="button" onClick={copyInviteCode}
              className="p-2.5 glass rounded-xl text-slate-500 hover:text-frost-600 hover:bg-white/60 transition-all" title="Copy invite code">
              <Copy className="w-4 h-4" />
            </button>
            {isOwner && (
              <button type="button" onClick={handleRegenerate} disabled={regenerateCode.isPending}
                className="p-2.5 glass rounded-xl text-slate-500 hover:text-warning-600 hover:bg-white/60 transition-all disabled:opacity-50" title="Regenerate invite code">
                <RefreshCw className={cn("w-4 h-4", regenerateCode.isPending && "animate-spin")} />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">Share this code with anyone you want to invite to your household.</p>
        </div>
      </GlassCard>

      {/* Members list */}
      <GlassCard className="p-5" hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-frost-500" />
          <h3 className="font-bold text-slate-800">Members</h3>
        </div>
        <div className="space-y-2">
          {members.map(({ member, user }) => (
            <div key={member.id} className="flex items-center gap-3 p-3 glass rounded-xl">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center flex-shrink-0">
                {member.role === "owner"
                  ? <Crown className="w-4 h-4 text-white" />
                  : <User className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize",
                member.role === "owner" ? "bg-frost-100 text-frost-700" : "bg-slate-100 text-slate-500")}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ExportDataPanel() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split("T")[0];

      const a = document.createElement("a");
      a.href = url;
      a.download = `freshtrack-export-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast("Data exported successfully!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to export data", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up max-w-lg">
      <GlassCard className="p-5" hover={false}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-frost-400 to-frost-600 flex items-center justify-center shadow-sm">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Export My Data</h3>
            <p className="text-xs text-slate-500">Download all your data as a JSON file. Includes inventory, shopping lists, and waste logs.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="w-full py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export Data
            </>
          )}
        </button>
      </GlassCard>
    </div>
  );
}

function SettingsPage() {
  const { data: household, isLoading } = useHousehold();

  if (isLoading) {
    return <PageSkeleton cards={3} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Manage your household and preferences"
        icon={<Settings className="w-5 h-5 text-frost-600" />}
      />

      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-4 h-4 text-frost-500" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Household</h2>
        </div>
        {household ? <HouseholdPanel /> : <NoHouseholdPanel />}
      </div>

      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-frost-500" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Data & Privacy</h2>
        </div>
        <ExportDataPanel />
      </div>
    </div>
  );
}
