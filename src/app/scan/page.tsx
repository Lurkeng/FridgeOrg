'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useFoodItems } from '@/hooks/useFoodItems';
import { AddItemForm } from '@/components/items/AddItemForm';
import { Modal } from '@/components/ui/Modal';
import GlassCard from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScanLine, Camera, AlertTriangle, Hash, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NutritionInfo } from '@/types';

function ManualBarcodeEntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter barcode number…"
        className="flex-1 glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-frost-400/50 focus:bg-white/80 transition-all"
        onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) { onSubmit(code.trim()); setCode(''); } }}
      />
      <button
        onClick={() => { if (code.trim()) { onSubmit(code.trim()); setCode(''); } }}
        disabled={!code.trim()}
        className="px-5 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_24px_rgba(14,165,233,0.35)] transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]"
      >
        Look Up
      </button>
    </div>
  );
}

export default function ScanPage() {
  const { addItem } = useFoodItems();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [productNutrition, setProductNutrition] = useState<NutritionInfo | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setScanning(true);
      }
    } catch {
      setError('Camera access denied. Please allow camera permissions to scan barcodes.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setCameraReady(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let animId: number;
    let detector: any = null;
    if ('BarcodeDetector' in window) {
      detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
      });
    }
    const detect = async () => {
      if (!videoRef.current || !scanning) return;
      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            setScannedCode(code);
            setScanning(false);
            lookupProduct(code);
            return;
          }
        } catch {}
      }
      animId = requestAnimationFrame(detect);
    };
    detect();
    return () => { if (animId) cancelAnimationFrame(animId); };
  }, [scanning]);

  const lookupProduct = async (barcode: string) => {
    setLookingUp(true);
    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await resp.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        setProductName(p.product_name || null);

        // Extract nutrition per 100g from OpenFoodFacts nutriments
        const n = p.nutriments;
        if (n) {
          const calories = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null;
          const protein  = n['proteins_100g']    ?? n['proteins']    ?? null;
          const carbs    = n['carbohydrates_100g'] ?? n['carbohydrates'] ?? null;
          const fat      = n['fat_100g']          ?? n['fat']          ?? null;
          if (calories != null && protein != null && carbs != null && fat != null) {
            setProductNutrition({
              calories: Math.round(calories),
              protein:  Math.round(protein * 10) / 10,
              carbs:    Math.round(carbs * 10) / 10,
              fat:      Math.round(fat * 10) / 10,
              fiber:    n['fiber_100g']   != null ? Math.round(n['fiber_100g'] * 10) / 10   : undefined,
              sugar:    n['sugars_100g']  != null ? Math.round(n['sugars_100g'] * 10) / 10  : undefined,
              sodium:   n['sodium_100g']  != null ? Math.round(n['sodium_100g'] * 1000)     : undefined,
              servingSize: p.serving_size || undefined,
            });
          }
        }
      }
    } catch {}
    setLookingUp(false);
    setShowAddForm(true);
  };

  const handleManualCode = (code: string) => { setScannedCode(code); lookupProduct(code); };

  const resetScan = () => { setShowAddForm(false); setScannedCode(null); setProductName(null); setProductNutrition(null); };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Scan Barcode"
        subtitle="Point your camera at a product barcode to quickly add it"
        icon={<ScanLine className="w-5 h-5 text-frost-600" />}
      />

      {/* Camera View */}
      <GlassCard className="overflow-hidden mb-6 animate-fade-in-up stagger-1" hover={false}>
        <div className="relative bg-slate-900/90 rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            className={cn('w-full aspect-video object-cover', !cameraReady && 'hidden')}
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning Overlay */}
          {scanning && cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner brackets */}
              <div className="relative w-64 h-40">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-frost-400 rounded-tl-lg" style={{ borderWidth: '3px 0 0 3px' }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-frost-400 rounded-tr-lg" style={{ borderWidth: '3px 3px 0 0' }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-frost-400 rounded-bl-lg" style={{ borderWidth: '0 0 3px 3px' }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-frost-400 rounded-br-lg" style={{ borderWidth: '0 3px 3px 0' }} />
                {/* Scan line */}
                <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-frost-400 to-transparent animate-scan-line" />
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <span className="glass text-xs text-white/90 px-4 py-1.5 rounded-full font-medium">Scanning…</span>
              </div>
            </div>
          )}

          {/* Start state */}
          {!cameraReady && !error && (
            <div className="aspect-video flex flex-col items-center justify-center text-white gap-4">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center animate-float">
                <Camera className="w-8 h-8 text-frost-300" />
              </div>
              <p className="text-slate-300 text-sm">Camera preview will appear here</p>
              <button
                onClick={startCamera}
                className="px-6 py-2.5 bg-gradient-to-r from-frost-500 to-frost-600 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_24px_rgba(14,165,233,0.45)] transition-all active:scale-[0.97]"
              >
                Start Camera
              </button>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="aspect-video flex flex-col items-center justify-center p-8 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-warning-500/20 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-warning-400" />
              </div>
              <p className="text-warning-200 text-center text-sm max-w-xs">{error}</p>
              <button
                onClick={startCamera}
                className="px-5 py-2 glass text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Stop button */}
          {scanning && cameraReady && (
            <div className="absolute top-3 right-3">
              <button
                onClick={stopCamera}
                className="glass text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-white/20 transition-all"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Looking up indicator */}
      {lookingUp && (
        <GlassCard variant="frost" className="p-4 mb-4 flex items-center gap-3 animate-fade-in" hover={false}>
          <div className="w-4 h-4 border-2 border-frost-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm font-medium text-frost-800">
            Barcode <span className="font-bold">{scannedCode}</span> detected — looking up product…
          </p>
        </GlassCard>
      )}

      {/* Manual Entry */}
      <GlassCard className="p-6 mb-4 animate-fade-in-up stagger-2" hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-4 h-4 text-frost-500" />
          <h3 className="font-bold text-slate-800">Enter barcode manually</h3>
        </div>
        <ManualBarcodeEntry onSubmit={handleManualCode} />
        <div className="border-t border-white/30 mt-5 pt-4">
          <button
            onClick={() => { setScannedCode(null); setProductName(null); setShowAddForm(true); }}
            className="flex items-center gap-1.5 text-sm text-frost-600 hover:text-frost-800 font-semibold transition-colors"
          >
            Skip scanning — add item manually <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </GlassCard>

      {/* Browser support notice */}
      {typeof window !== 'undefined' && !('BarcodeDetector' in window) && (
        <GlassCard variant="warning" className="p-4 animate-fade-in-up stagger-3" hover={false}>
          <p className="text-sm text-warning-800">
            <strong>Note:</strong> Your browser doesn&apos;t support the BarcodeDetector API.
            For best results, use Chrome or Edge. You can still enter barcodes manually above.
          </p>
        </GlassCard>
      )}

      {/* Add item modal */}
      <Modal
        isOpen={showAddForm}
        onClose={resetScan}
        title={scannedCode ? 'Add Scanned Item' : 'Add Item Manually'}
        subtitle={scannedCode ? `Barcode: ${scannedCode}` : undefined}
        size="lg"
      >
        <AddItemForm
          onSubmit={(item) => { addItem(item); resetScan(); stopCamera(); }}
          onCancel={resetScan}
          initialBarcode={scannedCode || undefined}
          initialName={productName || undefined}
          initialNutrition={productNutrition || undefined}
        />
      </Modal>
    </div>
  );
}
