import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWasteLogs, getWasteStats, addWasteLog } from "@/server/waste";

const LOGS_KEY  = ["wasteLogs"]  as const;
const STATS_KEY = ["wasteStats"] as const;

export function useWasteLogs() {
  return useQuery({
    queryKey: LOGS_KEY,
    queryFn:  () => getWasteLogs(),
    staleTime: 60_000,
  });
}

export function useWasteStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn:  () => getWasteStats(),
    staleTime: 60_000,
  });
}

export function useAddWasteLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof addWasteLog>[0]["data"]) =>
      addWasteLog({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOGS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}
