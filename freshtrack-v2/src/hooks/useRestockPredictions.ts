import { useQuery } from "@tanstack/react-query";
import { getRestockPredictions } from "@/server/shopping-list";
import { slKeys } from "@/hooks/shopping-list-keys";

export function useRestockPredictions(listId?: string | null) {
  const query = useQuery({
    queryKey: slKeys.predictions(listId ?? null),
    queryFn: () => getRestockPredictions({ data: { listId: listId ?? undefined } }),
    staleTime: 5 * 60_000, // 5 minutes
    enabled: Boolean(listId),
  });

  return {
    predictions: query.data?.predictions ?? [],
    isLoading: query.isLoading,
  };
}
