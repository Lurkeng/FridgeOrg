import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getShoppingLists,
  createShoppingList,
  renameShoppingList,
  deleteShoppingList,
  setDefaultShoppingList,
  getShoppingList,
  addShoppingItem,
  toggleShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  putAwayShoppingItems,
  undoPutAwayShoppingItems,
  fetchItemPrices,
  fetchAllPrices,
} from "@/server/shopping-list";
import type {
  ShoppingListItem,
  FoodCategory,
  StorePriceEntry,
  ShoppingList,
  PutAwayShoppingItemsInput,
} from "@/types";
import { useEffect, useState } from "react";
import { slKeys } from "@/hooks/shopping-list-keys";

const ACTIVE_LIST_KEY = "freshtrack-active-shopping-list";

export function useShoppingList() {
  const queryClient = useQueryClient();
  const initialListId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_LIST_KEY) : null;
  const [activeListIdState, setActiveListIdState] = useState<string | null>(initialListId);

  const { data: listsData, isLoading: isLoadingLists } = useQuery({
    queryKey: slKeys.lists(),
    queryFn: () => getShoppingLists(),
    staleTime: 30_000,
  });

  const lists: ShoppingList[] = (listsData?.lists ?? []).map((row) => ({
    id: row.id,
    household_id: row.householdId,
    name: row.name,
    description: row.description ?? null,
    is_default: row.isDefault,
    created_by: row.createdBy ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }));
  const fallbackListId = lists.find((l) => l.is_default)?.id ?? lists[0]?.id ?? null;
  const activeListId = (activeListIdState && lists.some((l) => l.id === activeListIdState)) ? activeListIdState : fallbackListId;
  useEffect(() => {
    if (activeListId) {
      localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
      setActiveListIdState(activeListId);
    }
  }, [activeListId]);

  const { data: shoppingData, isLoading, error } = useQuery({
    queryKey: slKeys.list(activeListId),
    queryFn: () => getShoppingList({ data: { listId: activeListId ?? undefined } }),
    enabled: Boolean(activeListId),
    staleTime: 30_000,
  });

  const rawItems = shoppingData?.items ?? [];

  // Map DB rows to the ShoppingListItem shape expected by the UI
  const items: ShoppingListItem[] = rawItems.map((row) => ({
    id:                   row.id,
    household_id:         row.householdId,
    list_id:              row.listId ?? null,
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: slKeys.all });

  // ── Mutations ──────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: (data: Parameters<typeof addShoppingItem>[0]["data"]) =>
      addShoppingItem({ data }),
    onSuccess: () => void invalidate(),
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { id: string; checked: boolean; listId?: string }) =>
      toggleShoppingItem({ data }),
    onSuccess: () => void invalidate(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateShoppingItem>[0]["data"]) =>
      updateShoppingItem({ data }),
    onSuccess: () => void invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShoppingItem({ data: { id, listId: activeListId ?? undefined } }),
    onSuccess: () => void invalidate(),
  });

  const clearMutation = useMutation({
    mutationFn: () => clearCheckedItems({ data: { listId: activeListId ?? undefined } }),
    onSuccess: () => void invalidate(),
  });

  const putAwayMutation = useMutation({
    mutationFn: (data: PutAwayShoppingItemsInput) => putAwayShoppingItems({ data }),
    onSuccess: async () => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["foodItems"] });
      await queryClient.invalidateQueries({ queryKey: ["purchaseHistorySummary"] });
    },
  });

  const undoPutAwayMutation = useMutation({
    mutationFn: (batchId: string) => undoPutAwayShoppingItems({ data: { batchId, listId: activeListId ?? undefined } }),
    onSuccess: async () => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["foodItems"] });
      await queryClient.invalidateQueries({ queryKey: ["purchaseHistorySummary"] });
    },
  });

  const fetchPricesMutation = useMutation({
    mutationFn: (id: string) => fetchItemPrices({ data: { id, listId: activeListId ?? undefined } }),
    onSuccess: () => void invalidate(),
  });

  const fetchAllPricesMutation = useMutation({
    mutationFn: () => fetchAllPrices({ data: { listId: activeListId ?? undefined } }),
    onSuccess: () => void invalidate(),
  });

  const createListMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null }) => createShoppingList({ data }),
    onSuccess: () => void invalidate(),
  });

  const renameListMutation = useMutation({
    mutationFn: (data: { id: string; name: string }) => renameShoppingList({ data }),
    onSuccess: () => void invalidate(),
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => deleteShoppingList({ data: { id } }),
    onSuccess: () => void invalidate(),
  });

  const setDefaultListMutation = useMutation({
    mutationFn: (id: string) => setDefaultShoppingList({ data: { id } }),
    onSuccess: () => void invalidate(),
  });

  return {
    // Data
    lists,
    activeListId,
    items,
    uncheckedItems,
    checkedItems,
    byCategory,
    estimatedTotal,
    isLoading: isLoading || isLoadingLists,
    error,

    // Actions
    setActiveList:  (listId: string) => { setActiveListIdState(listId); void queryClient.invalidateQueries({ queryKey: slKeys.all }); },
    createList:     (name: string, description?: string | null) => createListMutation.mutateAsync({ name, description }),
    renameList:     (id: string, name: string) => renameListMutation.mutateAsync({ id, name }),
    deleteList:     (id: string) => deleteListMutation.mutateAsync(id),
    setDefaultList: (id: string) => setDefaultListMutation.mutateAsync(id),
    addItem:        (data: Omit<Parameters<typeof addShoppingItem>[0]["data"], "listId">) => addMutation.mutateAsync({ ...data, listId: activeListId ?? undefined }),
    toggleItem:     (id: string, checked: boolean) => toggleMutation.mutateAsync({ id, checked, listId: activeListId ?? undefined }),
    updateItem:     (id: string, updates: Record<string, unknown>) => updateMutation.mutateAsync({ id, updates, listId: activeListId ?? undefined }),
    deleteItem:     (id: string) => deleteMutation.mutateAsync(id),
    clearChecked:   () => clearMutation.mutateAsync(),
    putAwayItems:   (data: Omit<PutAwayShoppingItemsInput, "listId">) => putAwayMutation.mutateAsync({ ...data, listId: activeListId ?? undefined }),
    undoPutAway:    (batchId: string) => undoPutAwayMutation.mutateAsync(batchId),
    fetchPrices:    (id: string) => fetchPricesMutation.mutateAsync(id),
    fetchAllPrices: () => fetchAllPricesMutation.mutateAsync(),

    // Mutation states
    isAdding:          addMutation.isPending,
    isFetchingPrices:  fetchPricesMutation.isPending || fetchAllPricesMutation.isPending,
  };
}
