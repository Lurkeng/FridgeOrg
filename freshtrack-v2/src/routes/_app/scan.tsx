import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useFoodItems } from "@/hooks/useFoodItems";
import { AddItemForm } from "@/components/items/AddItemForm";
import { Modal } from "@/components/ui/Modal";
import GlassCard from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScanLine, Camera, AlertTriangle, Hash, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { NutritionInfo } from "@/types";

export const Route = createFileRoute("/_app/scan")({
  component: ScanPage,
});

function ManualBarcodeEntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <div className="flex gap-2">
      <input
        type="text" value={code} onChange={(e) => setCode(e.target.value)}
        placeholder="Enter barcode number..."
        className="flex-1 glass rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-frost-400/50 focus:bg-white/80 transition-all"
        onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) { onSubmit(code.trim()); setCode(""); } }}
      />
      <button
        onClick={() => { if (code.trim()) { onSubmit(code.trim()); setCode(""); } }}
        disabled={!code.trim()}
        className="px-6 py-3 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_24px_rgba(14,165,233,0.35)] transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]"
      >
        Look Up
      </button>
    </div>
  );
}

function ScanPage() {
  const { addItem, items } = useFoodItems();
  const { toast } = useToast();
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
      setError("Camera access denied. Please allow camera permissions to scan barcodes.");
    }
  }, []);

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
      <PageHeader title="Scan Barcode" subtitle="Point your camera at a product barcode to quickly add it" icon={<ScanLine className="w-5 h-5 text-frost-600" />} />

      {/* Camera viewfinder */}
      <GlassCard className="overflow-hidden mb-6 animate-fade-in-up stagger-1" hover={false}>
        <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl overflow-hidden">
          <video ref={videoRef} className={`w-full aspect-video object-cover${!cameraReady ? " hidden" : ""}`} playsInline muted />

          {/* Active scanning overlay */}
          {scanning && cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Subtle vignette */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />

              <div className="relative w-64 h-40">
                {/* Corner brackets */}
                <div className="absolute -top-0.5 -left-0.5 w-10 h-10 rounded-tl-xl" style={{ borderWidth: "3px 0 0 3px", borderColor: "#38bdf8", borderStyle: "solid" }} />
                <div className="absolute -top-0.5 -right-0.5 w-10 h-10 rounded-tr-xl" style={{ borderWidth: "3px 3px 0 0", borderColor: "#38bdf8", borderStyle: "solid" }} />
                <div className="absolute -bottom-0.5 -left-0.5 w-10 h-10 rounded-bl-xl" style={{ borderWidth: "0 0 3px 3px", borderColor: "#38bdf8", borderStyle: "solid" }} />
                <div className="absolute -bottom-0.5 -right-0.5 w-10 h-10 rounded-br-xl" style={{ borderWidth: "0 3px 3px 0", borderColor: "#38bdf8", borderStyle: "solid" }} />
                {/* Scan line */}
                <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-frost-400 to-transparent animate-scan-line" />
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <span className="glass text-xs text-white/90 px-4 py-1.5 rounded-full font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-frost-400 animate-pulse" />
                  Scanning...
                </span>
              </div>
            </div>
          )}

          {/* Camera off state */}
          {!cameraReady && !error && (
            <div className="aspect-video flex flex-col items-center justify-center text-white gap-5 p-8">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Camera className="w-9 h-9 text-frost-300" />
              </div>
              <div className="text-center">
                <p className="text-white/90 text-sm font-medium mb-1">Camera preview will appear here</p>
                <p className="text-white/50 text-xs">Point at a product barcode to auto-detect</p>
              </div>
              <button
                type="button"
                onClick={startCamera}
                className="px-8 py-3 bg-gradient-to-r from-frost-500 to-frost-600 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.4)] transition-all active:scale-[0.97]"
              >
                Start Camera
              </button>
            </div>
          )}

          {/* Camera error state */}
          {error && (
            <div className="aspect-video flex flex-col items-center justify-center p-8 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-warning-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-warning-400" />
              </div>
              <div className="text-center">
                <p className="text-white/90 text-sm font-medium mb-1">Camera unavailable</p>
                <p className="text-warning-200/80 text-center text-xs max-w-xs">{error}</p>
              </div>
              <button type="button" onClick={startCamera} className="px-6 py-2.5 glass text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-all">
                Try Again
              </button>
            </div>
          )}

          {/* Stop button */}
          {scanning && cameraReady && (
            <div className="absolute top-3 right-3">
              <button type="button" onClick={stopCamera} className="glass text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-white/20 transition-all">
                Stop
              </button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Product lookup spinner */}
      {lookingUp && (
        <GlassCard variant="frost" className="p-4 mb-4 flex items-center gap-3 animate-fade-in" hover={false}>
          <div className="w-4 h-4 border-2 border-frost-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm font-medium text-frost-800">Barcode <span className="font-bold">{scannedCode}</span> detected — looking up product...</p>
        </GlassCard>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4 animate-fade-in-up stagger-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">or enter manually</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />
      </div>

      {/* Manual barcode entry */}
      <GlassCard className="p-6 mb-4 animate-fade-in-up stagger-3" hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-4 h-4 text-frost-500" />
          <h3 className="font-bold text-slate-800">Enter barcode manually</h3>
        </div>
        <ManualBarcodeEntry onSubmit={(code) => { setScannedCode(code); lookupProduct(code); }} />
        <div className="border-t border-white/30 mt-5 pt-4">
          <button type="button" onClick={() => { setScannedCode(null); setProductName(null); setShowAddForm(true); }} className="flex items-center gap-1.5 text-sm text-frost-600 hover:text-frost-800 font-semibold transition-colors group">
            Skip scanning — add item manually <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </GlassCard>

      <Modal isOpen={showAddForm} onClose={resetScan} title={scannedCode ? "Add Scanned Item" : "Add Item Manually"} subtitle={scannedCode ? `Barcode: ${scannedCode}` : undefined} size="lg">
        <AddItemForm
          existingItems={items}
          onSubmit={async (item) => { try { await addItem(item); resetScan(); stopCamera(); toast(`${item.name} added!`, "success"); } catch (err) { toast(err instanceof Error ? err.message : "Failed to add item", "error"); } }}
          onCancel={resetScan}
          initialBarcode={scannedCode || undefined}
          initialName={productName || undefined}
          initialNutrition={productNutrition || undefined}
        />
      </Modal>
    </div>
  );
}
