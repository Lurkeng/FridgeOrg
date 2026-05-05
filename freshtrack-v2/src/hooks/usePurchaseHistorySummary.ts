import { useQuery } from "@tanstack/react-query";
import { getPurchaseHistorySummary } from "@/server/shopping-list";

export function usePurchaseHistorySummary() {
  const query = useQuery({
    queryKey: ["purchaseHistorySummary"],
    queryFn: () => getPurchaseHistorySummary(),
    staleTime: 60_000,
  });

  return {
    summary: query.data ?? {
      monthItemsBought: 0,
      mostBoughtCategory: null,
      estimatedSpend: 0,
      topRepeatedItem: null,
      repeatedItems: [],
      categoryTrend: [],
      storeTrend: [],
      wasteAvoidedOpportunities: [],
    },
    isLoading: query.isLoading,
  };
}
