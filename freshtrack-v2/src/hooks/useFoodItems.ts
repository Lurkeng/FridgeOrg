/**
 * useFoodItems — TanStack Query replacement for the localStorage hook.
 *
 * Maintains the same return-shape as the original so all consuming components
 * work without modification.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFoodItems,
  addFoodItem,
  updateFoodItem,
  deleteFoodItem,
  markOpened,
  markWasted,
  markConsumed,
} from "@/server/food-items";
import { FoodItem } from "@/types";
import { getExpiryStatus, sortByExpiry } from "@/lib/utils";

const QUERY_KEY = ["foodItems"] as const;

export function useFoodItems() {
  const queryClient = useQueryClient();

  // ── Query ──────────────────────────────────────────────────────────────
  const { data: rawItems = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  () => getFoodItems(),
    staleTime: 30_000,
  });

  // Map DB rows to the FoodItem shape expected by the UI
  const items: FoodItem[] = rawItems.map((row) => {
    // Reconstruct NutritionInfo from flat DB columns
    const nutrition =
      row.nutritionCalories != null &&
      row.nutritionProtein  != null &&
      row.nutritionCarbs    != null &&
      row.nutritionFat      != null
        ? {
            calories:    row.nutritionCalories,
            protein:     row.nutritionProtein,
            carbs:       row.nutritionCarbs,
            fat:         row.nutritionFat,
            fiber:       row.nutritionFiber    ?? undefined,
            sugar:       row.nutritionSugar    ?? undefined,
            sodium:      row.nutritionSodium   ?? undefined,
            servingSize: row.nutritionServingSize ?? undefined,
          }
        : null;

    return {
      id:           row.id,
      household_id: row.householdId,
      name:         row.name,
      category:     row.category as FoodItem["category"],
      location:     row.location as FoodItem["location"],
      quantity:     row.quantity,
      unit:         row.unit,
      added_date:   row.addedDate,
      expiry_date:  row.expiryDate,
      opened:       row.opened ?? false,
      opened_date:  row.openedDate ?? null,
      notes:        row.notes ?? null,
      barcode:      row.barcode ?? null,
      shelf:        row.shelf ?? null,
      nutrition,
      created_by:   row.createdBy ?? "",
      created_at:   row.createdAt,
      updated_at:   row.updatedAt,
    };
  });

  const sortedItems = sortByExpiry(items);
  const expiredItems   = sortedItems.filter((i) => getExpiryStatus(i.expiry_date) === "expired");
  const expiringItems  = sortedItems.filter((i) => ["expiring","use_soon"].includes(getExpiryStatus(i.expiry_date)));
  const freshItems     = sortedItems.filter((i) => getExpiryStatus(i.expiry_date) === "fresh");
  const fridgeItems    = sortedItems.filter((i) => i.location === "fridge");
  const freezerItems   = sortedItems.filter((i) => i.location === "freezer");
  const pantryItems    = sortedItems.filter((i) => i.location === "pantry");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  // ── Mutations ──────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (data: Parameters<typeof addFoodItem>[0]["data"]) =>
      addFoodItem({ data }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateFoodItem>[0]["data"]) =>
      updateFoodItem({ data }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFoodItem({ data: { id } }),
    onSuccess: invalidate,
  });

  const markOpenedMutation = useMutation({
    mutationFn: (id: string) => markOpened({ data: { id } }),
    onSuccess: invalidate,
  });

  const markWastedMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: "expired"|"spoiled"|"leftover"|"other" }) =>
      markWasted({ data: { id, reason } }),
    onSuccess: invalidate,
  });

  const markConsumedMutation = useMutation({
    mutationFn: (id: string) => markConsumed({ data: { id } }),
    onSuccess: invalidate,
  });

  return {
    // Data slices (same shape as old localStorage hook)
    items: sortedItems,
    expiredItems,
    expiringItems,
    freshItems,
    fridgeItems,
    freezerItems,
    pantryItems,
    isLoading,
    error,

    // Actions
    addItem:       (data: Parameters<typeof addFoodItem>[0]["data"]) => addMutation.mutateAsync(data),
    updateItem:    (id: string, updates: Record<string, unknown>) => updateMutation.mutateAsync({ id, updates }),
    deleteItem:    (id: string) => deleteMutation.mutateAsync(id),
    markOpened:    (id: string) => markOpenedMutation.mutateAsync(id),
    markWasted:    (id: string, reason: "expired"|"spoiled"|"leftover"|"other") =>
                     markWastedMutation.mutateAsync({ id, reason }),
    markConsumed:  (id: string) => markConsumedMutation.mutateAsync(id),

    // Mutation states (useful for optimistic UI)
    isAdding:      addMutation.isPending,
    isUpdating:    updateMutation.isPending,
    isDeleting:    deleteMutation.isPending,
  };
}
