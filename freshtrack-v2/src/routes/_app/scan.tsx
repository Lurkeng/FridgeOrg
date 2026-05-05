import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useFoodItems } from "@/hooks/useFoodItems";
import { AddItemForm } from "@/components/items/AddItemForm";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScanLine, Camera, AlertTriangle, Hash, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { NutritionInfo } from "@/types";
import { useAppPreferences } from "@/lib/app-preferences";

export const Route = createFileRoute("/_app/scan")({
  component: ScanPage,
});

function ManualBarcodeEntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState("");
  const { t } = useAppPreferences();
  return (
    <div className="flex gap-2">
      <input
        type="text" value={code} onChange={(e) => setCode(e.target.value)}
        placeholder={t("scan.barcodePlaceholder")}
        className="flex-1 border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-4 py-3 font-mono text-sm tracking-[0.18em] text-[var(--ft-ink)] placeholder:text-[rgba(21,19,15,0.32)] placeholder:tracking-[0.22em] outline-none transition-all duration-150 focus:bg-[var(--ft-bone)] focus:shadow-[2px_2px_0_var(--ft-ink)] focus:-translate-y-px hover:bg-[var(--ft-bone)]"
        onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) { onSubmit(code.trim()); setCode(""); } }}
      />
      <button
        onClick={() => { if (code.trim()) { onSubmit(code.trim()); setCode(""); } }}
        disabled={!code.trim()}
        className="border border-[var(--ft-ink)] bg-[var(--ft-ink)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ft-bone)] shadow-[3px_3px_0_var(--ft-pickle)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ft-pickle)] active:translate-y-0 active:shadow-[2px_2px_0_var(--ft-pickle)] disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
      >
        {t("scan.lookUp")}
      </button>
    </div>
  );
}

function ScanPage() {
  const { addItem, items } = useFoodItems();
  const { toast } = useToast();
  const { t } = useAppPreferences();
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning]       = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [productNutrition, setProductNutrition] = useState<NutritionInfo | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lookingUp, setLookingUp]     = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setScanning(true);
      }
    } catch {
      setError(t("scan.cameraError"));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
    setCameraReady(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let animId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = "BarcodeDetector" in window ? new (window as any).BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39"] }) : null;
    const detect = async () => {
      if (!videoRef.current || !scanning) return;
      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) { setScannedCode(barcodes[0].rawValue); setScanning(false); lookupProduct(barcodes[0].rawValue); return; }
        } catch {}
      }
      animId = requestAnimationFrame(detect);
    };
    detect();
    return () => { if (animId) cancelAnimationFrame(animId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const lookupProduct = async (barcode: string) => {
    setLookingUp(true);
    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await resp.json() as any;
      if (data.status === 1 && data.product) {
        const p = data.product;
        if (p.product_name) setProductName(p.product_name);

        const n = p.nutriments;
        if (n) {
          const calories = n["energy-kcal_100g"] ?? n["energy-kcal"] ?? null;
          const protein  = n["proteins_100g"]    ?? n["proteins"]    ?? null;
          const carbs    = n["carbohydrates_100g"] ?? n["carbohydrates"] ?? null;
          const fat      = n["fat_100g"]          ?? n["fat"]          ?? null;
          if (calories != null && protein != null && carbs != null && fat != null) {
            setProductNutrition({
              calories: Math.round(calories),
              protein:  Math.round(protein * 10) / 10,
              carbs:    Math.round(carbs * 10) / 10,
              fat:      Math.round(fat * 10) / 10,
              fiber:    n["fiber_100g"]  != null ? Math.round(n["fiber_100g"]  * 10) / 10 : undefined,
              sugar:    n["sugars_100g"] != null ? Math.round(n["sugars_100g"] * 10) / 10 : undefined,
              sodium:   n["sodium_100g"] != null ? Math.round(n["sodium_100g"] * 1000)    : undefined,
              servingSize: p.serving_size || undefined,
            });
          }
        }
      }
    } catch {}
    setLookingUp(false);
    setShowAddForm(true);
  };

  const resetScan = () => { setShowAddForm(false); setScannedCode(null); setProductName(null); setProductNutrition(null); };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader title={t("scan.title")} subtitle={t("scan.subtitle")} icon={<ScanLine className="w-5 h-5 text-[var(--ft-pickle)]" />} />

      {/* Camera viewfinder — kept dark for contrast against the live feed; pickle-green optical accents */}
      <div className="relative mb-6 border border-[var(--ft-ink)] bg-[var(--ft-ink)] shadow-[4px_4px_0_var(--ft-ink)] animate-fade-in-up stagger-1">
        <div className="grid grid-cols-[1fr_auto] border-b border-[rgba(242,234,220,0.20)] font-mono text-[10px] uppercase tracking-[0.20em] text-[rgba(242,234,220,0.78)]">
          <div className="px-4 py-2">{t("scan.opticalKicker")}</div>
          <div className="border-l border-[rgba(242,234,220,0.20)] px-4 py-2 text-[var(--ft-pickle)]">
            {scanning && cameraReady ? t("scan.statusLive") : cameraReady ? t("scan.statusReady") : error ? t("scan.statusFault") : t("scan.statusIdle")}
          </div>
        </div>
        <div className="relative overflow-hidden bg-[#0c0a06]">
          <video ref={videoRef} className={`w-full aspect-video object-cover${!cameraReady ? " hidden" : ""}`} playsInline muted />

          {/* Active scanning overlay */}
          {scanning && cameraReady && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30" />

              <div className="relative h-40 w-64">
                {/* Sharp registration corners — no rounding, pickle accent */}
                <div className="absolute -top-0.5 -left-0.5 h-10 w-10" style={{ borderWidth: "2px 0 0 2px", borderColor: "var(--ft-pickle)", borderStyle: "solid" }} />
                <div className="absolute -top-0.5 -right-0.5 h-10 w-10" style={{ borderWidth: "2px 2px 0 0", borderColor: "var(--ft-pickle)", borderStyle: "solid" }} />
                <div className="absolute -bottom-0.5 -left-0.5 h-10 w-10" style={{ borderWidth: "0 0 2px 2px", borderColor: "var(--ft-pickle)", borderStyle: "solid" }} />
                <div className="absolute -bottom-0.5 -right-0.5 h-10 w-10" style={{ borderWidth: "0 2px 2px 0", borderColor: "var(--ft-pickle)", borderStyle: "solid" }} />
                {/* Scan line */}
                <div className="absolute left-1 right-1 h-px bg-[var(--ft-pickle)] shadow-[0_0_8px_var(--ft-pickle)] animate-scan-line" />
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-2 border border-[var(--ft-pickle)] bg-[rgba(12,10,6,0.85)] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-[var(--ft-pickle)]">
                  <span className="h-1.5 w-1.5 bg-[var(--ft-pickle)] animate-pulse" />
                  {t("scan.scanning")}
                </span>
              </div>
            </div>
          )}

          {/* Camera off state */}
          {!cameraReady && !error && (
            <div className="flex aspect-video flex-col items-center justify-center gap-5 p-8 text-[var(--ft-bone)]">
              <div className="flex h-20 w-20 items-center justify-center border border-[rgba(242,234,220,0.32)] bg-[rgba(242,234,220,0.06)]">
                <Camera className="h-9 w-9 text-[var(--ft-pickle)]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="font-display text-[15px] font-semibold leading-snug">{t("scan.cameraPreview")}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(242,234,220,0.55)]">{t("scan.aimAtBarcode")}</p>
              </div>
              <button
                type="button"
                onClick={startCamera}
                className="border border-[var(--ft-bone)] bg-[var(--ft-pickle)] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)] shadow-[3px_3px_0_var(--ft-bone)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ft-bone)] active:translate-y-0 active:shadow-[2px_2px_0_var(--ft-bone)]"
              >
                {t("scan.startCamera")}
              </button>
            </div>
          )}

          {/* Camera error state */}
          {error && (
            <div className="flex aspect-video flex-col items-center justify-center gap-4 p-8">
              <div className="flex h-16 w-16 items-center justify-center border border-[var(--ft-signal)] bg-[rgba(184,50,30,0.16)]">
                <AlertTriangle className="h-7 w-7 text-[var(--ft-signal)]" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="font-display text-[15px] font-semibold text-[var(--ft-bone)]">{t("scan.cameraUnavailable")}</p>
                <p className="mx-auto mt-1 max-w-xs font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(242,234,220,0.62)]">{error}</p>
              </div>
              <button type="button" onClick={startCamera}
                className="border border-[var(--ft-bone)] bg-transparent px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--ft-bone)] transition-all hover:bg-[rgba(242,234,220,0.08)]">
                {t("scan.tryAgain")}
              </button>
            </div>
          )}

          {/* Stop button */}
          {scanning && cameraReady && (
            <div className="absolute top-3 right-3">
              <button type="button" onClick={stopCamera}
                className="border border-[var(--ft-bone)] bg-[rgba(12,10,6,0.85)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-[var(--ft-bone)] transition-all hover:bg-[var(--ft-signal)] hover:border-[var(--ft-signal)]">
                {t("scan.stop")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product lookup spinner */}
      {lookingUp && (
        <div className="mb-4 flex items-center gap-3 border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-3 shadow-[2px_2px_0_var(--ft-ink)] animate-fade-in">
          <span className="h-3.5 w-3.5 flex-shrink-0 animate-spin border border-[var(--ft-ink)] border-t-transparent" />
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ft-ink)]">
            {t("scan.barcodePrefix")} <strong className="text-[var(--ft-signal)]">{scannedCode}</strong> · {t("scan.lookingUp")}
          </p>
        </div>
      )}

      {/* Divider — editorial rule */}
      <div className="mb-4 flex items-center gap-4 animate-fade-in-up stagger-2">
        <span className="h-px flex-1 bg-[var(--ft-ink)]" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--ft-signal)]">{t("scan.orEnterManually")}</span>
        <span className="h-px flex-1 bg-[var(--ft-ink)]" />
      </div>

      {/* Manual barcode entry */}
      <div className="mb-4 border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-6 animate-fade-in-up stagger-3">
        <div className="mb-4 flex items-center gap-2">
          <Hash className="h-4 w-4 text-[var(--ft-pickle)]" strokeWidth={2} />
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)]">{t("scan.typeBarcode")}</h3>
        </div>
        <ManualBarcodeEntry onSubmit={(code) => { setScannedCode(code); lookupProduct(code); }} />
        <div className="mt-5 border-t border-dashed border-[rgba(21,19,15,0.30)] pt-4">
          <button type="button" onClick={() => { setScannedCode(null); setProductName(null); setShowAddForm(true); }}
            className="group inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ft-ink)] underline decoration-[var(--ft-pickle)] underline-offset-4 transition-colors hover:text-[var(--ft-signal)] hover:decoration-[var(--ft-signal)]">
            {t("scan.skipManual")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      <Modal isOpen={showAddForm} onClose={resetScan} title={scannedCode ? t("scan.addScannedItem") : t("scan.addItemManually")} subtitle={scannedCode ? `${t("scan.barcodePrefix")}: ${scannedCode}` : undefined} size="lg">
        <AddItemForm
          existingItems={items}
          onSubmit={async (item) => { try { await addItem(item); resetScan(); stopCamera(); toast(`${item.name} added!`, "success"); } catch (err) { toast(err instanceof Error ? err.message : t("scan.toastFailedAdd"), "error"); } }}
          onCancel={resetScan}
          initialBarcode={scannedCode || undefined}
          initialName={productName || undefined}
          initialNutrition={productNutrition || undefined}
        />
      </Modal>
    </div>
  );
}
