import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSavedRecipe, getSavedRecipes, saveRecipe } from "@/server/saved-recipes";

const QUERY_KEY = ["savedRecipes"] as const;

export function useSavedRecipes() {
  const queryClient = useQueryClient();

  const { data: savedRecipes = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  () => getSavedRecipes(),
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const saveMutation = useMutation({
    mutationFn: (data: Parameters<typeof saveRecipe>[0]["data"]) =>
      saveRecipe({ data }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSavedRecipe({ data: { id } }),
    onSuccess: invalidate,
  });

  return {
    savedRecipes,
    isLoading,
    saveRecipe: (data: Parameters<typeof saveRecipe>[0]["data"]) => saveMutation.mutateAsync(data),
    deleteSavedRecipe: (id: string) => deleteMutation.mutateAsync(id),
    isSaving: saveMutation.isPending,
    deletingId: deleteMutation.variables,
  };
}
