'use client';

import { useState, useCallback } from 'react';
import { FoodItem } from '@/types';
import { AIRecipe } from '@/app/api/recipes/suggest/route';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'no-key';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY    = 'ai-recipes-cache';

interface CacheEntry {
  inventoryHash: string;
  recipes: AIRecipe[];
  timestamp: number;
}

/** Cheap stable hash of inventory item names + expiry dates */
function hashInventory(items: FoodItem[]): string {
  return items
    .map((i) => `${i.name}:${i.expiry_date}`)
    .sort()
    .join('|');
}

function readCache(hash: string): AIRecipe[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (
      entry.inventoryHash === hash &&
      Date.now() - entry.timestamp < CACHE_TTL_MS
    ) {
      return entry.recipes;
    }
  } catch {}
  return null;
}

function writeCache(hash: string, recipes: AIRecipe[]) {
  try {
    const entry: CacheEntry = { inventoryHash: hash, recipes, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

export function useAIRecipes() {
  const [recipes, setRecipes]   = useState<AIRecipe[]>([]);
  const [status, setStatus]     = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const suggest = useCallback(async (items: FoodItem[]) => {
    if (!items.length) return;

    const hash   = hashInventory(items);
    const cached = readCache(hash);
    if (cached) {
      setRecipes(cached);
      setStatus('success');
      return;
    }

    setStatus('loading');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/recipes/suggest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          items: items.map((i) => ({
            name:        i.name,
            category:    i.category,
            expiry_date: i.expiry_date,
          })),
        }),
      });

      const data = await res.json();

      if (res.status === 503 && data.error?.includes('ANTHROPIC_API_KEY')) {
        setStatus('no-key');
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong');
        setStatus('error');
        return;
      }

      writeCache(hash, data.recipes);
      setRecipes(data.recipes);
      setStatus('success');
    } catch (err) {
      setErrorMsg('Network error — please try again');
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setRecipes([]);
    setStatus('idle');
    setErrorMsg(null);
  }, []);

  return { recipes, status, errorMsg, suggest, reset };
}
