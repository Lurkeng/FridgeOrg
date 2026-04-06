/**
 * useRestockSuggestions — fetches restock suggestions from waste logs
 * and expiring food items to display as quick-add chips on the shopping page.
 */
import { useQuery } from "@tanstack/react-query";
import { getRestockSuggestions } from "@/server/shopping-list";

export interface RestockItem {
  name: string;
  category: string;
}

export interface ExpiringRestockItem {
  name: string;
  category: string;
  expiryDate: string;
}

export function useRestockSuggestions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["restockSuggestions"],
    queryFn: () => getRestockSuggestions(),
    staleTime: 60_000, // 1 minute
  });

  return {
    recentItems:   (data?.recentItems ?? []) as RestockItem[],
    expiringItems: (data?.expiringItems ?? []) as ExpiringRestockItem[],
    isLoading,
    error,
  };
}
