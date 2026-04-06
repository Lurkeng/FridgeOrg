/**
 * useRecipePreferences — TanStack Query wrapper around get/save server functions.
 * Optimistic update on save so the UI feels instant.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRecipePreferences, saveRecipePreferences } from "@/server/recipe-preferences";
import type { RecipePreferences } from "@/types";

const QUERY_KEY = ["recipePreferences"] as const;

const DEFAULT_PREFS: RecipePreferences = {
  mealGoal:            "balanced",
  calorieRange:        null,
  proteinTarget:       null,
  servings:            2,
  dietaryRestrictions: [],
};

export function useRecipePreferences() {
  const queryClient = useQueryClient();

  const { data: preferences = DEFAULT_PREFS, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  () => getRecipePreferences(),
    staleTime: 5 * 60 * 1000, // 5 min — prefs rarely change
  });

  const { mutate: savePreferences, isPending: isSaving } = useMutation({
    mutationFn: (prefs: RecipePreferences) =>
      saveRecipePreferences({ data: prefs }),
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<RecipePreferences>(QUERY_KEY);
      queryClient.setQueryData(QUERY_KEY, newPrefs);
      return { previous };
    },
    onError: (_err, _newPrefs, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return { preferences, isLoading, savePreferences, isSaving };
}
