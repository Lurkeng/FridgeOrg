import { addDays, format } from "date-fns";
import { getDefaultShelfLife } from "@/lib/shelf-life";
import type { FoodCategory } from "@/types";

export interface CheckedItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  notes: string | null;
  barcode: string | null;
  cheapestPrice: number | null;
  cheapestStore: string | null;
}

export interface ItemOverride {
  id: string;
  location?: "fridge" | "freezer" | "pantry";
  expiryDate?: string;
  shelf?: string | null;
  notes?: string | null;
}

export interface FoodRow {
  householdId: string;
  name: string;
  category: FoodCategory;
  location: "fridge" | "freezer" | "pantry";
  quantity: number;
  unit: string;
  addedDate: string;
  expiryDate: string;
  notes: string | null | undefined;
  barcode: string | null;
  shelf: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRow {
  householdId: string;
  listId: string;
  sourceShoppingItemId: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  price: number | null;
  store: string | null;
  barcode: string | null;
  storedLocation: "fridge" | "freezer" | "pantry";
  purchasedAt: string;
  createdBy: string;
}

export function buildFoodRows(
  checkedItems: CheckedItem[],
  overrideMap: Map<string, ItemOverride>,
  defaultLocation: "fridge" | "freezer" | "pantry",
  now: Date,
  householdId: string,
  userId: string,
): FoodRow[] {
  const nowIso = now.toISOString();
  return checkedItems.map((item) => {
    const override = overrideMap.get(item.id);
    const location = override?.location ?? defaultLocation;
    const expiryDate = override?.expiryDate ?? format(
      addDays(now, getDefaultShelfLife(item.name, item.category, location)),
      "yyyy-MM-dd",
    );
    return {
      householdId,
      name: item.name,
      category: item.category,
      location,
      quantity: item.quantity,
      unit: item.unit,
      addedDate: nowIso.split("T")[0],
      expiryDate,
      notes: override?.notes ?? item.notes,
      barcode: item.barcode,
      shelf: override?.shelf ?? null,
      createdBy: userId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}

export function buildPurchaseRows(
  checkedItems: CheckedItem[],
  overrideMap: Map<string, ItemOverride>,
  defaultLocation: "fridge" | "freezer" | "pantry",
  listId: string,
  householdId: string,
  userId: string,
  nowIso: string,
): PurchaseRow[] {
  return checkedItems.map((item) => {
    const override = overrideMap.get(item.id);
    return {
      householdId,
      listId,
      sourceShoppingItemId: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      price: item.cheapestPrice,
      store: item.cheapestStore,
      barcode: item.barcode,
      storedLocation: override?.location ?? defaultLocation,
      purchasedAt: nowIso,
      createdBy: userId,
    };
  });
}
