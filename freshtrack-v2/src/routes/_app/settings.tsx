import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useHousehold, useHouseholdMembers, useCreateHousehold, useJoinHousehold, useRegenerateInviteCode } from "@/hooks/useHousehold";
import { useNotificationPreferences, type NotificationPreferencesInput } from "@/hooks/useNotificationPreferences";
import { useAppPreferences, type AppLanguage, type AppTheme } from "@/lib/app-preferences";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Settings, Home, Users, Copy, RefreshCw, Plus, LogIn, Crown, User, Shield, Download, Bell, Languages, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportAllData } from "@/server/export";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

// Editorial parchment input — sharp 1px ink border, brutalist focus offset.
const baseInput =
  "w-full border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-4 py-2.5 text-sm text-[var(--ft-ink)] " +
  "placeholder:text-[rgba(21,19,15,0.42)] " +
  "transition-all duration-150 outline-none " +
  "focus:bg-[var(--ft-bone)] focus:shadow-[2px_2px_0_var(--ft-ink)] focus:-translate-y-px " +
  "hover:bg-[var(--ft-bone)]";

const fieldLabel =
  "mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)]";

// Editorial panel — sharp ink border on parchment, optional top accent strip.
function Panel({
  children,
  className,
  accent = "ink",
}: {
  children: React.ReactNode;
  className?: string;
  accent?: "ink" | "pickle" | "signal" | "amber";
}) {
  const accentColor: Record<string, string> = {
    ink:    "bg-[var(--ft-ink)]",
    pickle: "bg-[var(--ft-pickle)]",
    signal: "bg-[var(--ft-signal)]",
    amber:  "bg-[#d97706]",
  };
  return (
    <div className={cn("relative overflow-hidden border border-[var(--ft-ink)] bg-[var(--ft-paper)]", className)}>
      <span aria-hidden className={cn("pointer-events-none absolute left-0 right-0 top-0 h-[2px]", accentColor[accent])} />
      {children}
    </div>
  );
}

// Section header — eyebrow rule + Lora display title with icon
function SectionHeader({ kicker, title, icon: Icon }: { kicker: string; title: string; icon: React.ElementType }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden className="h-px w-6 bg-[var(--ft-ink)]" />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--ft-signal)]">{kicker}</p>
      </div>
      <h2 className="flex items-center gap-2.5 font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-[var(--ft-ink)]">
        <Icon className="h-5 w-5 text-[var(--ft-pickle)]" strokeWidth={1.75} />
        {title}
      </h2>
    </div>
  );
}

// Sharp ink-bordered icon tile with brutalist offset
function IconTile({ icon: Icon, accent = "ink" }: { icon: React.ElementType; accent?: "ink" | "pickle" | "signal" | "amber" }) {
  const tone: Record<string, string> = {
    ink:    "bg-[var(--ft-ink)] text-[var(--ft-bone)]",
    pickle: "bg-[var(--ft-pickle)] text-[var(--ft-ink)]",
    signal: "bg-[var(--ft-signal)] text-[var(--ft-bone)]",
    amber:  "bg-[#d97706] text-[var(--ft-bone)]",
  };
  return (
    <span className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[var(--ft-ink)] shadow-[2px_2px_0_var(--ft-ink)]", tone[accent])}>
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </span>
  );
}

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
    <Panel accent="pickle" className="max-w-md p-6 animate-fade-in-up">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-pickle)] text-[var(--ft-ink)] shadow-[3px_3px_0_var(--ft-ink)]">
          <Home className="h-8 w-8" strokeWidth={1.5} />
        </span>
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--ft-signal)]">Onboarding · 01</p>
        <h2 className="mb-2 font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-[var(--ft-ink)]">Join or create a household.</h2>
        <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-[rgba(21,19,15,0.62)]">
          A household lets you share inventory, lists, and waste with the people you actually cook with.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 border border-[var(--ft-ink)]" role="tablist">
        {([
          { value: "create", label: "Create new", icon: Plus },
          { value: "join",   label: "Join existing", icon: LogIn },
        ] as const).map((tab, i) => {
          const active = mode === tab.value;
          const Icon = tab.icon;
          const isLast = i === 1;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(tab.value)}
              className={cn(
                "relative flex items-center justify-center gap-1.5 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-150",
                !isLast && "border-r border-[var(--ft-ink)]",
                active
                  ? "bg-[var(--ft-ink)] text-[var(--ft-bone)]"
                  : "bg-[var(--ft-paper)] text-[rgba(21,19,15,0.62)] hover:bg-[var(--ft-bone)] hover:text-[var(--ft-ink)]",
              )}
            >
              {active && (
                <span aria-hidden className="absolute -top-px left-1/2 h-1 w-8 -translate-x-1/2 bg-[var(--ft-pickle)]" />
              )}
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {mode === "create" ? (
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="The Thursday Fridge"
            className={baseInput} maxLength={100} required
          />
          <Button type="submit" variant="primary" fullWidth disabled={createHousehold.isPending || !householdName.trim()} loading={createHousehold.isPending}>
            {createHousehold.isPending ? "Creating" : "Create household"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-3">
          <input
            type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="A B 3 X Y 7"
            className={cn(baseInput, "text-center font-mono text-base font-bold uppercase tracking-[0.32em]")}
            maxLength={6} required
          />
          <Button type="submit" variant="primary" fullWidth disabled={joinHousehold.isPending || inviteCode.trim().length !== 6} loading={joinHousehold.isPending}>
            {joinHousehold.isPending ? "Joining" : "Join household"}
          </Button>
        </form>
      )}
    </Panel>
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
    <div className="max-w-lg space-y-4 animate-fade-in-up">
      {/* Household masthead */}
      <Panel accent="pickle" className="p-5">
        <div className="mb-5 flex items-start gap-3">
          <IconTile icon={Home} accent="pickle" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ft-signal)]">Household</p>
            <h3 className="mt-1 font-display text-[20px] font-bold leading-tight tracking-[-0.015em] text-[var(--ft-ink)] [text-wrap:balance]">{hh.name}</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(21,19,15,0.55)]">
              <span className="capitalize">{role}</span> · {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div>
          <p className={fieldLabel}>Invite code</p>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 border border-[var(--ft-ink)] bg-[var(--ft-bone)] px-4 py-3 text-center font-mono text-lg font-bold uppercase tracking-[0.32em] text-[var(--ft-ink)]">
              {hh.inviteCode}
            </div>
            <button
              type="button"
              onClick={copyInviteCode}
              title="Copy invite code"
              className="flex w-11 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] transition-all hover:bg-[var(--ft-bone)] hover:-translate-y-px hover:shadow-[2px_2px_0_var(--ft-ink)]"
            >
              <Copy className="h-4 w-4" strokeWidth={2} />
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerateCode.isPending}
                title="Regenerate invite code"
                className="flex w-11 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] transition-all hover:bg-[#fef3c7] hover:text-[#7c4a00] hover:-translate-y-px hover:shadow-[2px_2px_0_var(--ft-ink)] disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", regenerateCode.isPending && "animate-spin")} strokeWidth={2} />
              </button>
            )}
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.50)]">
            Share with anyone you want at the table.
          </p>
        </div>
      </Panel>

      {/* Members ledger */}
      <Panel accent="ink" className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--ft-pickle)]" strokeWidth={2} />
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)]">Members · ledger</h3>
        </div>
        <ul className="divide-y divide-[rgba(21,19,15,0.18)] border border-[var(--ft-ink)]">
          {members.map(({ member, user }) => (
            <li key={member.id} className="flex items-center gap-3 bg-[var(--ft-paper)] px-3 py-2.5 transition-colors hover:bg-[var(--ft-bone)]">
              <span className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[var(--ft-ink)]",
                member.role === "owner" ? "bg-[var(--ft-pickle)] text-[var(--ft-ink)]" : "bg-[var(--ft-paper)] text-[var(--ft-ink)]",
              )}>
                {member.role === "owner"
                  ? <Crown className="h-4 w-4" strokeWidth={2} />
                  : <User  className="h-4 w-4" strokeWidth={1.75} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[14px] font-semibold tracking-[-0.005em] text-[var(--ft-ink)]">{user.name}</p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.55)]">{user.email}</p>
              </div>
              <span className={cn(
                "border px-2 py-px font-mono text-[9px] font-bold uppercase tracking-[0.16em]",
                member.role === "owner"
                  ? "border-[var(--ft-ink)] bg-[var(--ft-pickle)] text-[var(--ft-ink)]"
                  : "border-[rgba(21,19,15,0.30)] bg-[var(--ft-paper)] text-[rgba(21,19,15,0.62)]",
              )}>
                {member.role}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
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
    <div className="max-w-lg space-y-4 animate-fade-in-up">
      <Panel accent="ink" className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <IconTile icon={Download} accent="ink" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ft-signal)]">Take it with you</p>
            <h3 className="mt-1 font-display text-[20px] font-bold leading-tight tracking-[-0.015em] text-[var(--ft-ink)]">Export your data</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[rgba(21,19,15,0.62)]">
              Download a JSON archive — inventory, shopping lists, waste logs. Yours to keep.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="primary"
          fullWidth
          onClick={handleExport}
          disabled={isExporting}
          loading={isExporting}
          icon={!isExporting && <Download className="h-4 w-4" />}
        >
          {isExporting ? "Exporting" : "Export archive"}
        </Button>
      </Panel>
    </div>
  );
}

function ReminderPreferencesPanel() {
  const { toast } = useToast();
  const { preferences, preview, isLoading, savePreferences, isSaving } = useNotificationPreferences();
  const [form, setForm] = useState<NotificationPreferencesInput>({
    enabled: true,
    daysBefore: 2,
    channel: "in_app",
    digestCadence: "daily",
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  });

  useEffect(() => {
    if (!preferences) return;
    setForm({
      enabled: Boolean(preferences.enabled),
      daysBefore: Number(preferences.daysBefore ?? 2),
      channel: preferences.channel ?? "in_app",
      digestCadence: preferences.digestCadence ?? "daily",
      quietHoursStart: preferences.quietHoursStart ?? "22:00",
      quietHoursEnd: preferences.quietHoursEnd ?? "07:00",
    });
  }, [preferences]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await savePreferences(form);
      toast("Reminder preferences saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save reminders", "error");
    }
  };

  if (isLoading) return null;

  return (
    <div className="max-w-lg space-y-4 animate-fade-in-up">
      <Panel accent="amber" className="p-5">
        <div className="mb-5 flex items-start gap-3">
          <IconTile icon={Bell} accent="amber" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#7c4a00]">Reminders desk</p>
            <h3 className="mt-1 font-display text-[20px] font-bold leading-tight tracking-[-0.015em] text-[var(--ft-ink)]">Expiry watch</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[rgba(21,19,15,0.62)]">
              In-app reminders are live. Email-ready settings stored for a future delivery provider.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Enable toggle as a brutalist switch row */}
          <label className="flex cursor-pointer items-center justify-between gap-4 border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-3 transition-colors hover:bg-[var(--ft-bone)]">
            <span>
              <span className="block font-display text-[14px] font-semibold text-[var(--ft-ink)]">Enable reminders</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.55)]">In-app expiry alerts</span>
            </span>
            <span
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 items-center border border-[var(--ft-ink)] transition-colors",
                form.enabled ? "bg-[var(--ft-pickle)]" : "bg-[var(--ft-bone)]",
              )}
            >
              <span
                className={cn(
                  "absolute top-px h-[18px] w-[18px] border border-[var(--ft-ink)] bg-[var(--ft-paper)] transition-transform",
                  form.enabled ? "translate-x-[22px]" : "translate-x-px",
                )}
              />
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Enable reminders"
              />
            </span>
          </label>

          <label className="block">
            <span className={fieldLabel}>Days before expiry</span>
            <input
              type="number"
              min={0}
              max={30}
              value={form.daysBefore}
              onChange={(event) => setForm((current) => ({ ...current, daysBefore: Number(event.target.value) }))}
              className={baseInput}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={fieldLabel}>Digest</span>
              <select
                value={form.digestCadence}
                onChange={(event) => setForm((current) => ({ ...current, digestCadence: event.target.value as NotificationPreferencesInput["digestCadence"] }))}
                className={cn(baseInput, "cursor-pointer appearance-none")}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label className="block">
              <span className={fieldLabel}>Channel</span>
              <select
                value={form.channel}
                onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value as NotificationPreferencesInput["channel"] }))}
                className={cn(baseInput, "cursor-pointer appearance-none")}
              >
                <option value="in_app">In app</option>
                <option value="email_ready">Email-ready</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={fieldLabel}>Quiet from</span>
              <input type="time" value={form.quietHoursStart} onChange={(event) => setForm((current) => ({ ...current, quietHoursStart: event.target.value }))} className={baseInput} />
            </label>
            <label className="block">
              <span className={fieldLabel}>Quiet until</span>
              <input type="time" value={form.quietHoursEnd} onChange={(event) => setForm((current) => ({ ...current, quietHoursEnd: event.target.value }))} className={baseInput} />
            </label>
          </div>

          <div className="flex items-start gap-2 border border-dashed border-[var(--ft-ink)] bg-[var(--ft-bone)] p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ft-ink)]">
            <span className="mt-0.5 inline-block h-1.5 w-1.5 flex-shrink-0 bg-[var(--ft-pickle)]" />
            <span>
              <strong className="font-bold text-[var(--ft-signal)]">Preview ·</strong>{" "}
              {preview?.items?.length
                ? `${preview.items.length} item${preview.items.length === 1 ? "" : "s"} would surface in the next reminder.`
                : "No expiring items match your reminder window."}
            </span>
          </div>

          <Button type="submit" variant="primary" fullWidth disabled={isSaving} loading={isSaving}>
            {isSaving ? "Saving" : "Save reminder settings"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}

function AppPreferencesPanel() {
  const { language, theme, resolvedTheme, setLanguage, setTheme, t } = useAppPreferences();

  return (
    <div className="max-w-lg space-y-4 animate-fade-in-up">
      <Panel accent="ink" className="p-5">
        <div className="mb-5 flex items-start gap-3">
          <IconTile icon={Languages} accent="ink" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ft-signal)]">Masthead controls</p>
            <h3 className="mt-1 font-display text-[20px] font-bold leading-tight tracking-[-0.015em] text-[var(--ft-ink)]">{t("settings.appearanceTitle")}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[rgba(21,19,15,0.62)]">
              {t("settings.appearanceDescription")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={fieldLabel}>{t("settings.language")}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as AppLanguage)}
              className={cn(baseInput, "cursor-pointer appearance-none")}
            >
              <option value="en">{t("settings.languageEnglish")}</option>
              <option value="nb">{t("settings.languageNorwegian")}</option>
            </select>
          </label>

          <label className="block">
            <span className={fieldLabel}>{t("settings.theme")}</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as AppTheme)}
              className={cn(baseInput, "cursor-pointer appearance-none")}
            >
              <option value="system">{t("settings.themeSystem")}</option>
              <option value="light">{t("settings.themeLight")}</option>
              <option value="dark">{t("settings.themeDark")}</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2 border border-dashed border-[var(--ft-ink)] bg-[var(--ft-bone)] p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ft-ink)]">
          <Moon className="h-3.5 w-3.5 flex-shrink-0 text-[var(--ft-pickle)]" strokeWidth={2} />
          <span>
            {t("settings.savedLocally")} · {t("settings.theme")}{" "}
            <strong className="text-[var(--ft-signal)]">
              {resolvedTheme === "dark" ? t("settings.themeDark") : t("settings.themeLight")}
            </strong>
          </span>
        </div>
      </Panel>
    </div>
  );
}

function SettingsPage() {
  const { data: household, isLoading } = useHousehold();
  const { t } = useAppPreferences();

  if (isLoading) {
    return <PageSkeleton cards={3} />;
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader
        eyebrow="Section · Settings"
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        icon={<Settings className="h-5 w-5 text-[var(--ft-pickle)]" />}
      />

      <div className="mb-10">
        <SectionHeader kicker="Sub · 01" title={t("settings.appearanceLanguage")} icon={Languages} />
        <AppPreferencesPanel />
      </div>

      <div className="mb-10">
        <SectionHeader kicker="Sub · 02" title="Household" icon={Home} />
        {household ? <HouseholdPanel /> : <NoHouseholdPanel />}
      </div>

      {household && (
        <div className="mb-10">
          <SectionHeader kicker="Sub · 03" title="Reminders" icon={Bell} />
          <ReminderPreferencesPanel />
        </div>
      )}

      <div className="mb-10">
        <SectionHeader kicker="Sub · 04" title="Data & privacy" icon={Shield} />
        <ExportDataPanel />
      </div>
    </div>
  );
}
