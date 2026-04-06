/**
 * useShoppingList — TanStack Query hook for the shopping list.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getShoppingList,
  addShoppingItem,
  toggleShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  fetchItemPrices,
  fetchAllPrices,
} from "@/server/shopping-list";
import type { ShoppingListItem, FoodCategory, StorePriceEntry } from "@/types";

const QUERY_KEY = ["shoppingList"] as const;

export function useShoppingList() {
  const queryClient = useQueryClient();

  const { data: rawItems = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  () => getShoppingList(),
    staleTime: 30_000,
  });

  // Map DB rows to the ShoppingListItem shape expected by the UI
  const items: ShoppingListItem[] = rawItems.map((row) => ({
    id:                   row.id,
    household_id:         row.householdId,
    name:                 row.name,
    category:             row.category as FoodCategory,
    quantity:             row.quantity,
    unit:                 row.unit,
    checked:              row.checked ?? false,
    notes:                row.notes ?? null,
    barcode:              row.barcode ?? null,
    kassalapp_product_id: row.kassalappProductId ?? null,
    cheapest_store:       row.cheapestStore ?? null,
    cheapest_price:       row.cheapestPrice ?? null,
    comparison_prices:    row.comparisonPrices ? (JSON.parse(row.comparisonPrices) as StorePriceEntry[]) : null,
    added_by:             row.addedBy ?? "",
    created_at:           row.createdAt,
    updated_at:           row.updatedAt,
  }));

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems   = items.filter((i) => i.checked);

  // Group unchecked items by category
  const byCategory = uncheckedItems.reduce<Record<string, ShoppingListItem[]>>((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // Total estimated cost (sum of cheapest prices where available)
  const estimatedTotal = uncheckedItems.reduce((sum, i) => sum + (i.cheapest_price ?? 0), 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  // ── Mutations ──────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: (data: Parameters<typeof addShoppingItem>[0]["data"]) =>
      addShoppingItem({ data }),
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { id: string; checked: boolean }) =>
      toggleShoppingItem({ data }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateShoppingItem>[0]["data"]) =>
      updateShoppingItem({ data }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShoppingItem({ data: { id } }),
    onSuccess: invalidate,
  });

  const clearMutation = useMutation({
    mutationFn: () => clearCheckedItems(),
    onSuccess: invalidate,
  });

  const fetchPricesMutation = useMutation({
    mutationFn: (id: string) => fetchItemPrices({ data: { id } }),
    onSuccess: invalidate,
  });

  const fetchAllPricesMutation = useMutation({
    mutationFn: () => fetchAllPrices(),
    onSuccess: invalidate,
  });

  return {
    // Data
    items,
    uncheckedItems,
    checkedItems,
    byCategory,
    estimatedTotal,
    isLoading,
    error,

    // Actions
    addItem:        (data: Parameters<typeof addShoppingItem>[0]["data"]) => addMutation.mutateAsync(data),
    toggleItem:     (id: string, checked: boolean) => toggleMutation.mutateAsync({ id, checked }),
    updateItem:     (id: string, updates: Record<string, unknown>) => updateMutation.mutateAsync({ id, updates }),
    deleteItem:     (id: string) => deleteMutation.mutateAsync(id),
    clearChecked:   () => clearMutation.mutateAsync(),
    fetchPrices:    (id: string) => fetchPricesMutation.mutateAsync(id),
    fetchAllPrices: () => fetchAllPricesMutation.mutateAsync(),

    // Mutation states
    isAdding:          addMutation.isPending,
    isFetchingPrices:  fetchPricesMutation.isPending || fetchAllPricesMutation.isPending,
  };
}
