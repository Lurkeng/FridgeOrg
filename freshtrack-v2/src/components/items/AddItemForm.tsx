import { useState, useEffect, useRef, useCallback } from 'react';
import { FoodCategory, StorageLocation, NutritionInfo, FoodItem } from '@/types';
import { calculateExpiryDate } from '@/data/expiry-defaults';
import { getDefaultCategory, getDefaultShelfLife, getDefaultLocation } from '@/lib/shelf-life';
import { getCategoryEmoji, cn } from '@/lib/utils';
import { Refrigerator, Snowflake, Archive, Check, Zap, Beef, Wheat, Droplets, X, AlertTriangle } from 'lucide-react';

interface AddItemFormProps {
  onSubmit: (item: {
    name: string; category: FoodCategory; location: StorageLocation;
    quantity: number; unit: string; addedDate: string; expiryDate: string;
    opened: boolean; notes: string | null; barcode: string | null; shelf: string | null;
    nutrition: NutritionInfo | null;
  }) => void;
  onCancel: () => void;
  initialBarcode?: string;
  initialName?: string;
  initialNutrition?: NutritionInfo;
  existingItems?: FoodItem[];
}

const locationLabels: Record<StorageLocation, string> = { fridge: 'fridge', freezer: 'freezer', pantry: 'pantry' };

function findDuplicates(query: string, items: FoodItem[]): FoodItem[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  return items.filter((item) => {
    const n = item.name.toLowerCase();
    // exact or substring match in either direction
    return n.includes(q) || q.includes(n);
  });
}

function formatExpiryDistance(expiryDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
  if (diffDays === 0) return 'expires today';
  if (diffDays === 1) return 'expires tomorrow';
  return `expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

const categories: { value: FoodCategory; label: string }[] = [
  { value: 'produce', label: 'Produce' }, { value: 'dairy', label: 'Dairy' },
  { value: 'meat', label: 'Meat' }, { value: 'poultry', label: 'Poultry' },
  { value: 'seafood', label: 'Seafood' }, { value: 'grains', label: 'Grains' },
  { value: 'beverages', label: 'Beverages' }, { value: 'condiments', label: 'Condiments' },
  { value: 'leftovers', label: 'Leftovers' }, { value: 'frozen_meals', label: 'Frozen' },
  { value: 'snacks', label: 'Snacks' }, { value: 'other', label: 'Other' },
];

const locationConfig = [
  { value: 'fridge'  as StorageLocation, label: 'Fridge',  icon: Refrigerator, color: 'text-frost-600',   bg: 'bg-frost-50' },
  { value: 'freezer' as StorageLocation, label: 'Freezer', icon: Snowflake,     color: 'text-frost-700',   bg: 'bg-frost-100/60' },
  { value: 'pantry'  as StorageLocation, label: 'Pantry',  icon: Archive,       color: 'text-warning-700', bg: 'bg-warning-50' },
];

const units = ['item','lb','oz','kg','g','L','mL','cup','pack','bottle','can','bag','box','dozen'];

const baseInput =
  'w-full glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'transition-all duration-200 outline-none ' +
  'focus:ring-2 focus:ring-frost-400/50 focus:bg-white/80 hover:bg-white/75';

function MacroChip({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: string; unit: string; color: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-xl p-2 gap-0.5', color)}>
      <div className="flex items-center gap-1 opacity-70">{icon}<span className="text-[10px] font-bold uppercase tracking-wide">{label}</span></div>
      <span className="text-sm font-bold leading-none">{value}</span>
      <span className="text-[10px] opacity-60">{unit}</span>
    </div>
  );
}

function AutoFilledPill() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-frost-100/80 text-frost-600 text-[10px] font-semibold uppercase tracking-wide animate-fade-in-up normal-case">
      Auto-filled
    </span>
  );
}

export function AddItemForm({ onSubmit, onCancel, initialBarcode, initialName, initialNutrition, existingItems }: AddItemFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName]         = useState(initialName || '');
  const [category, setCategory] = useState<FoodCategory>('other');
  const [location, setLocation] = useState<StorageLocation>('fridge');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit]         = useState('item');
  const [expiryDate, setExpiryDate] = useState(calculateExpiryDate('other', 'fridge').toISOString().split('T')[0]);
  const [notes, setNotes]   = useState('');
  const [shelf, setShelf]   = useState('');

  // ── Track whether fields were manually changed by the user ──────────
  const [categoryManual, setCategoryManual] = useState(false);
  const [locationManual, setLocationManual] = useState(false);
  const [expiryManual, setExpiryManual]     = useState(false);

  // ── "Auto-filled" indicator pill ────────────────────────────────────
  const [autoFillFields, setAutoFillFields] = useState<Set<'category' | 'location' | 'expiry'>>(new Set());
  const autoFillTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showAutoFillPill = useCallback((fields: ('category' | 'location' | 'expiry')[]) => {
    setAutoFillFields(new Set(fields));
    if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current);
    autoFillTimerRef.current = setTimeout(() => setAutoFillFields(new Set()), 2000);
  }, []);

  useEffect(() => {
    return () => { if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current); };
  }, []);

  // Helper: compute expiry date string from shelf-life days
  const computeExpiryStr = useCallback((itemName: string, cat: FoodCategory, loc: StorageLocation): string => {
    const days = getDefaultShelfLife(itemName, cat, loc);
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }, []);

  // ── Duplicate detection (debounced) ──────────────────────────────────
  const [duplicates, setDuplicates] = useState<FoodItem[]>([]);
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Shelf-life auto-detect on name change (debounced 300ms) ─────────
  const shelfLifeDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setDismissedDuplicates(false);

    // Duplicate detection (existing behavior)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (existingItems && name.trim().length >= 2) {
        setDuplicates(findDuplicates(name, existingItems));
      } else {
        setDuplicates([]);
      }
    }, 300);

    // Shelf-life auto-detect
    if (shelfLifeDebounceRef.current) clearTimeout(shelfLifeDebounceRef.current);
    shelfLifeDebounceRef.current = setTimeout(() => {
      const trimmed = name.trim();
      if (trimmed.length < 2) return;

      const detectedCategory = getDefaultCategory(trimmed);
      if (!detectedCategory) return;

      const filledFields: ('category' | 'location' | 'expiry')[] = [];

      let effectiveCategory = category;
      let effectiveLocation = location;

      // Auto-fill category if user hasn't manually changed it
      if (!categoryManual) {
        effectiveCategory = detectedCategory;
        setCategory(detectedCategory);
        filledFields.push('category');
      }

      // Auto-fill location if user hasn't manually changed it
      if (!locationManual) {
        const detectedLocation = getDefaultLocation(effectiveCategory);
        effectiveLocation = detectedLocation;
        setLocation(detectedLocation);
        filledFields.push('location');
      }

      // Auto-fill expiry if user hasn't manually changed it
      if (!expiryManual) {
        setExpiryDate(computeExpiryStr(trimmed, effectiveCategory, effectiveLocation));
        filledFields.push('expiry');
      }

      if (filledFields.length > 0) {
        showAutoFillPill(filledFields);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (shelfLifeDebounceRef.current) clearTimeout(shelfLifeDebounceRef.current);
    };
  }, [name, existingItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // When user manually changes category, re-calculate expiry (shelf life varies by category)
  const handleCategoryChange = (c: FoodCategory) => {
    setCategoryManual(true);
    setCategory(c);
    // Re-calculate expiry unless user manually set it
    if (!expiryManual) {
      setExpiryDate(computeExpiryStr(name, c, location));
      showAutoFillPill(['expiry']);
    }
  };

  // When user manually changes location, re-calculate expiry (shelf life varies by location)
  const handleLocationChange = (l: StorageLocation) => {
    setLocationManual(true);
    setLocation(l);
    // Re-calculate expiry unless user manually set it
    if (!expiryManual) {
      setExpiryDate(computeExpiryStr(name, category, l));
      showAutoFillPill(['expiry']);
    }
  };

  // When user manually changes expiry date
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryManual(true);
    setExpiryDate(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(), category, location, quantity, unit,
      addedDate: today, expiryDate, opened: false,
      notes: notes.trim() || null,
      barcode: initialBarcode || null,
      shelf: shelf.trim() || null,
      nutrition: initialNutrition || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Whole milk, Chicken breast…" className={baseInput} autoFocus required />
        {duplicates.length > 0 && !dismissedDuplicates && (
          <div className="mt-1.5 bg-warning-50 border border-warning-200/60 rounded-xl px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              {duplicates.slice(0, 3).map((dup) => (
                <p key={dup.id} className="text-xs text-warning-800">
                  You already have <strong>{dup.name}</strong> in your {locationLabels[dup.location]} ({formatExpiryDistance(dup.expiry_date)}). Add anyway?
                </p>
              ))}
              {duplicates.length > 3 && (
                <p className="text-xs text-warning-600">...and {duplicates.length - 3} more similar item{duplicates.length - 3 !== 1 ? 's' : ''}</p>
              )}
            </div>
            <button type="button" onClick={() => setDismissedDuplicates(true)} className="shrink-0 p-0.5 rounded-lg text-warning-500 hover:text-warning-700 hover:bg-warning-100 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
          Where are you storing it?
          {autoFillFields.has('location') && <AutoFilledPill />}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {locationConfig.map((loc) => {
            const Icon = loc.icon; const active = location === loc.value;
            return (
              <button key={loc.value} type="button" onClick={() => handleLocationChange(loc.value)}
                className={cn('flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-sm font-medium',
                  active ? `border-frost-400/60 ${loc.bg} ${loc.color} shadow-glass` : 'border-white/30 glass text-slate-500 hover:border-frost-300/40 hover:text-slate-700')}>
                <Icon className={cn('w-5 h-5', active ? loc.color : 'text-slate-400')} strokeWidth={1.75} />
                {loc.label}
                {active && <Check className={cn('w-3 h-3', loc.color)} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
          Category
          {autoFillFields.has('category') && <AutoFilledPill />}
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {categories.map((cat) => (
            <button key={cat.value} type="button" onClick={() => handleCategoryChange(cat.value)}
              className={cn('flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium transition-all',
                category === cat.value ? 'border-frost-400/60 bg-frost-50/80 text-frost-700 shadow-sm' : 'border-white/30 glass text-slate-600 hover:border-frost-200/50 hover:text-slate-800')}>
              <span className="text-base">{getCategoryEmoji(cat.value)}</span>
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Quantity</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={0.1} step={0.1} className={baseInput} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={cn(baseInput, 'bg-white/60 cursor-pointer')}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
          Expiry Date <span className="text-slate-400 normal-case font-normal">(auto-estimated)</span>
          {autoFillFields.has('expiry') && <AutoFilledPill />}
        </label>
        <input type="date" value={expiryDate} onChange={handleExpiryChange} className={baseInput} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Shelf / Drawer <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
        <input type="text" value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="Top shelf, Door, Crisper drawer…" className={baseInput} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notes <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra details…" rows={2} className={cn(baseInput, 'resize-none')} />
      </div>

      {/* Nutrition panel — shown when data was pulled from barcode scan */}
      {initialNutrition && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-frost-500" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nutrition · per 100 g</p>
            {initialNutrition.servingSize && (
              <span className="ml-auto text-xs text-slate-400">Serving: {initialNutrition.servingSize}</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <MacroChip icon={<Zap className="w-3 h-3" />}      label="Calories" value={`${initialNutrition.calories}`} unit="kcal" color="text-warning-700 bg-warning-50/80" />
            <MacroChip icon={<Beef className="w-3 h-3" />}     label="Protein"  value={`${initialNutrition.protein}`}  unit="g"    color="text-fresh-700 bg-fresh-50/80" />
            <MacroChip icon={<Wheat className="w-3 h-3" />}    label="Carbs"    value={`${initialNutrition.carbs}`}    unit="g"    color="text-frost-700 bg-frost-50/80" />
            <MacroChip icon={<Droplets className="w-3 h-3" />} label="Fat"      value={`${initialNutrition.fat}`}      unit="g"    color="text-slate-600 bg-slate-100/80" />
          </div>
          {(initialNutrition.fiber != null || initialNutrition.sugar != null || initialNutrition.sodium != null) && (
            <div className="flex gap-3 text-xs text-slate-500 pt-1 border-t border-white/30">
              {initialNutrition.fiber  != null && <span>Fiber <strong className="text-slate-700">{initialNutrition.fiber}g</strong></span>}
              {initialNutrition.sugar  != null && <span>Sugar <strong className="text-slate-700">{initialNutrition.sugar}g</strong></span>}
              {initialNutrition.sodium != null && <span>Sodium <strong className="text-slate-700">{initialNutrition.sodium}mg</strong></span>}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl font-semibold text-sm shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.98]">Add Item</button>
        <button type="button" onClick={onCancel} className="px-5 py-3 glass text-slate-600 rounded-xl font-semibold text-sm hover:bg-white/80 transition-all active:scale-[0.98]">Cancel</button>
      </div>
    </form>
  );
}
