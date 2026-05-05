import { useQuery } from "@tanstack/react-query";
import { getRestockSuggestions } from "@/server/shopping-list";
import { slKeys } from "@/hooks/shopping-list-keys";

export interface RestockItem {
  name: string;
  category: string;
}

export interface ExpiringRestockItem {
  name: string;
  category: string;
  expiryDate: string;
}

export function useRestockSuggestions(listId?: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: slKeys.suggestions(listId ?? null),
    queryFn: () => getRestockSuggestions({ data: { listId: listId ?? undefined } }),
    staleTime: 60_000, // 1 minute
    enabled: Boolean(listId),
  });

  return {
    recentItems:   (data?.recentItems ?? []) as RestockItem[],
    expiringItems: (data?.expiringItems ?? []) as ExpiringRestockItem[],
    isLoading,
    error,
  };
}
