"use client";

import { useState, useCallback, useMemo } from "react";
import { FoodItem, StorageLocation, FoodCategory, WasteLog } from "@/types";
import { useLocalStorage } from "./useLocalStorage";
import { getExpiryStatus, sortByExpiry, estimateItemCost } from "@/lib/utils";
import { calculateExpiryDate } from "@/data/expiry-defaults";

// Demo mode hook — swap this for Supabase queries when connected
export function useFoodItems() {
  const [items, setItems, isLoaded] = useLocalStorage<FoodItem[]>(
    "fridge-items",
    []
  );
  const [wasteLogs, setWasteLogs] = useLocalStorage<WasteLog[]>(
    "waste-logs",
    []
  );

  const addItem = useCallback(
    (
      item: Omit<
        FoodItem,
        "id" | "household_id" | "created_by" | "created_at" | "updated_at"
      >
    ) => {
      const newItem: FoodItem = {
        ...item,
        id: crypto.randomUUID(),
        household_id: "demo",
        created_by: "demo-user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
      return newItem;
    },
    [setItems]
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<FoodItem>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...updates, updated_at: new Date().toISOString() }
            : item
        )
      );
    },
    [setItems]
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [setItems]
  );

  const markAsWasted = useCallback(
    (id: string, reason: WasteLog["reason"]) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const wasteLog: WasteLog = {
        id: crypto.randomUUID(),
        household_id: "demo",
        item_name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        reason,
        estimated_cost: estimateItemCost(item.category, item.quantity),
        wasted_date: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      };

      setWasteLogs((prev) => [...prev, wasteLog]);
      deleteItem(id);
    },
    [items, setWasteLogs, deleteItem]
  );

  const markAsConsumed = useCallback(
    (id: string) => {
      deleteItem(id);
    },
    [deleteItem]
  );

  const toggleOpened = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const nowOpened = !item.opened;
      const updates: Partial<FoodItem> = { opened: nowOpened };

      if (nowOpened) {
        updates.opened_date = new Date().toISOString().split("T")[0];
        // Recalculate expiry based on opened shelf life
        const newExpiry = calculateExpiryDate(
          item.category,
          item.location,
          true
        );
        const currentExpiry = new Date(item.expiry_date);
        // Use the earlier of the two dates
        if (newExpiry < currentExpiry) {
          updates.expiry_date = newExpiry.toISOString().split("T")[0];
        }
      }

      updateItem(id, updates);
    },
    [items, updateItem]
  );

  const itemsByLocation = useMemo(() => {
    const grouped: Record<StorageLocation, FoodItem[]> = {
      fridge: [],
      freezer: [],
      pantry: [],
    };
    items.forEach((item) => {
      grouped[item.location].push(item);
    });
    // Sort each group by expiry
    Object.keys(grouped).forEach((key) => {
      grouped[key as StorageLocation] = sortByExpiry(
        grouped[key as StorageLocation]
      );
    });
    return grouped;
  }, [items]);

  const expiringItems = useMemo(() => {
    return sortByExpiry(items).filter((item) => {
      const status = getExpiryStatus(item.expiry_date);
      return status === "expiring" || status === "use_soon";
    });
  }, [items]);

  const expiredItems = useMemo(() => {
    return items.filter(
      (item) => getExpiryStatus(item.expiry_date) === "expired"
    );
  }, [items]);

  const stats = useMemo(() => {
    return {
      totalItems: items.length,
      fridgeCount: itemsByLocation.fridge.length,
      freezerCount: itemsByLocation.freezer.length,
      pantryCount: itemsByLocation.pantry.length,
      expiringCount: expiringItems.length,
      expiredCount: expiredItems.length,
    };
  }, [items, itemsByLocation, expiringItems, expiredItems]);

  return {
    items,
    wasteLogs,
    isLoaded,
    itemsByLocation,
    expiringItems,
    expiredItems,
    stats,
    addItem,
    updateItem,
    deleteItem,
    markAsWasted,
    markAsConsumed,
    toggleOpened,
  };
}
