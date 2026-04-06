'use client';

import { useState } from 'react';
import { FoodCategory, StorageLocation, NutritionInfo } from '@/types';
import { calculateExpiryDate } from '@/data/expiry-defaults';
import { getCategoryEmoji } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Refrigerator, Snowflake, Archive, Check, Zap, Beef, Wheat, Droplets } from 'lucide-react';

interface AddItemFormProps {
  onSubmit: (item: {
    name: string;
    category: FoodCategory;
    location: StorageLocation;
    quantity: number;
    unit: string;
    added_date: string;
    expiry_date: string;
    opened: boolean;
    notes: string | null;
    barcode: string | null;
    shelf: string | null;
    nutrition: NutritionInfo | null;
  }) => void;
  onCancel: () => void;
  initialBarcode?: string;
  initialName?: string;
  initialNutrition?: NutritionInfo;
}

const categories: { value: FoodCategory; label: string }[] = [
  { value: 'produce',      label: 'Produce' },
  { value: 'dairy',        label: 'Dairy' },
  { value: 'meat',         label: 'Meat' },
  { value: 'poultry',      label: 'Poultry' },
  { value: 'seafood',      label: 'Seafood' },
  { value: 'grains',       label: 'Grains' },
  { value: 'beverages',    label: 'Beverages' },
  { value: 'condiments',   label: 'Condiments' },
  { value: 'leftovers',    label: 'Leftovers' },
  { value: 'frozen_meals', label: 'Frozen' },
  { value: 'snacks',       label: 'Snacks' },
  { value: 'other',        label: 'Other' },
];

const locationConfig: { value: StorageLocation; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: 'fridge',  label: 'Fridge',  icon: Refrigerator, color: 'text-frost-600',   bg: 'bg-frost-50' },
  { value: 'freezer', label: 'Freezer', icon: Snowflake,     color: 'text-frost-700',   bg: 'bg-frost-100/60' },
  { value: 'pantry',  label: 'Pantry',  icon: Archive,       color: 'text-warning-700', bg: 'bg-warning-50' },
];

const units = ['item', 'lb', 'oz', 'kg', 'g', 'L', 'mL', 'cup', 'pack', 'bottle', 'can', 'bag', 'box', 'dozen'];

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

export function AddItemForm({ onSubmit, onCancel, initialBarcode, initialName, initialNutrition }: AddItemFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName]         = useState(initialName || '');
  const [category, setCategory] = useState<FoodCategory>('other');
  const [location, setLocation] = useState<StorageLocation>('fridge');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit]         = useState('item');
  const [expiryDate, setExpiryDate] = useState(
    calculateExpiryDate('other', 'fridge').toISOString().split('T')[0]
  );
  const [notes, setNotes]   = useState('');
  const [shelf, setShelf]   = useState('');

  const handleCategoryChange = (c: FoodCategory) => {
    setCategory(c);
    setExpiryDate(calculateExpiryDate(c, location).toISOString().split('T')[0]);
  };

  const handleLocationChange = (l: StorageLocation) => {
    setLocation(l);
    setExpiryDate(calculateExpiryDate(category, l).toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      category,
      location,
      quantity,
      unit,
      added_date: today,
      expiry_date: expiryDate,
      opened: false,
      notes: notes.trim() || null,
      barcode: initialBarcode || null,
      shelf: shelf.trim() || null,
      nutrition: initialNutrition || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Whole milk, Chicken breast…"
          className={baseInput}
          autoFocus
          required
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Where are you storing it?</label>
        <div className="grid grid-cols-3 gap-2">
          {locationConfig.map((loc) => {
            const Icon = loc.icon;
            const active = location === loc.value;
            return (
              <button
                key={loc.value}
                type="button"
                onClick={() => handleLocationChange(loc.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-sm font-medium',
                  active
                    ? `border-frost-400/60 ${loc.bg} ${loc.color} shadow-glass`
                    : 'border-white/30 glass text-slate-500 hover:border-frost-300/40 hover:text-slate-700',
                )}
              >
                <Icon className={cn('w-5 h-5', active ? loc.color : 'text-slate-400')} strokeWidth={1.75} />
                {loc.label}
                {active && <Check className={cn('w-3 h-3', loc.color)} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Category</label>
        <div className="grid grid-cols-4 gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleCategoryChange(cat.value)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium transition-all',
                category === cat.value
                  ? 'border-frost-400/60 bg-frost-50/80 text-frost-700 shadow-sm'
                  : 'border-white/30 glass text-slate-600 hover:border-frost-200/50 hover:text-slate-800',
              )}
            >
              <span className="text-base">{getCategoryEmoji(cat.value)}</span>
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quantity & Unit */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min={0.1}
            step={0.1}
            className={baseInput}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={cn(baseInput, 'bg-white/60 cursor-pointer')}
          >
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Expiry */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          Expiry Date <span className="text-slate-400 normal-case font-normal">(auto-estimated)</span>
        </label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className={baseInput}
        />
      </div>

      {/* Shelf */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          Shelf / Drawer <span className="text-slate-400 normal-case font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={shelf}
          onChange={(e) => setShelf(e.target.value)}
          placeholder="Top shelf, Door, Crisper drawer…"
          className={baseInput}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          Notes <span className="text-slate-400 normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra details…"
          rows={2}
          className={cn(baseInput, 'resize-none')}
        />
      </div>

      {/* Nutrition panel — shown when data was pulled from barcode scan */}
      {initialNutrition && (
        <div className="glass rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-frost-500" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Nutrition{initialNutrition.servingSize ? ` · per 100 g` : ' · per 100 g'}
            </p>
            {initialNutrition.servingSize && (
              <span className="ml-auto text-xs text-slate-400">Serving: {initialNutrition.servingSize}</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <MacroChip icon={<Zap className="w-3 h-3" />}  label="Calories" value={`${initialNutrition.calories}`}   unit="kcal" color="text-warning-700 bg-warning-50/80" />
            <MacroChip icon={<Beef className="w-3 h-3" />} label="Protein"  value={`${initialNutrition.protein}`}    unit="g"    color="text-fresh-700 bg-fresh-50/80" />
            <MacroChip icon={<Wheat className="w-3 h-3" />} label="Carbs"   value={`${initialNutrition.carbs}`}      unit="g"    color="text-frost-700 bg-frost-50/80" />
            <MacroChip icon={<Droplets className="w-3 h-3" />} label="Fat"  value={`${initialNutrition.fat}`}        unit="g"    color="text-slate-600 bg-slate-100/80" />
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

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 py-3 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl font-semibold text-sm shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.98]"
        >
          Add Item
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 glass text-slate-600 rounded-xl font-semibold text-sm hover:bg-white/80 transition-all active:scale-[0.98]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
