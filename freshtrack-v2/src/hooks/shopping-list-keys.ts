export const slKeys = {
  all: ["shopping-list"] as const,
  lists: () => [...slKeys.all, "lists"] as const,
  list: (listId: string | null) => [...slKeys.all, "list", listId] as const,
  predictions: (listId: string | null) => [...slKeys.all, "predictions", listId] as const,
  suggestions: (listId: string | null) => [...slKeys.all, "suggestions", listId] as const,
  deals: (listId: string | null) => [...slKeys.all, "deals", listId] as const,
};
