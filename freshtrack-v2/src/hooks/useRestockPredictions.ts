import { useQuery } from "@tanstack/react-query";
import { getRestockPredictions } from "@/server/shopping-list";

export function useRestockPredictions() {
  const query = useQuery({
    queryKey: ["restock-predictions"],
    queryFn: () => getRestockPredictions(),
    staleTime: 5 * 60_000, // 5 minutes
  });

  return {
    predictions: query.data?.predictions ?? [],
    isLoading: query.isLoading,
  };
}
