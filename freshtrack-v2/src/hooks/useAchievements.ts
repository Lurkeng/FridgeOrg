import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAchievements, checkAndUnlockAchievements, logRecipeCooked } from "@/server/achievements";

const ACHIEVEMENTS_KEY = ["achievements"] as const;

export function useAchievements() {
  return useQuery({
    queryKey: ACHIEVEMENTS_KEY,
    queryFn:  () => getAchievements(),
    staleTime: 120_000, // 2 minutes
  });
}

export function useCheckAchievements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => checkAndUnlockAchievements(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACHIEVEMENTS_KEY });
    },
  });
}

export function useLogRecipeCooked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof logRecipeCooked>[0]["data"]) =>
      logRecipeCooked({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACHIEVEMENTS_KEY });
    },
  });
}
