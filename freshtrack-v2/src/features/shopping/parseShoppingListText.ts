import { getDefaultCategory } from "@/lib/shelf-life";
import type { FoodCategory } from "@/types";

export interface ParsedShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: FoodCategory;
}

const DEFAULT_UNIT = "item";

export function parseShoppingListText(text: string): ParsedShoppingListItem[] {
  return text
    .split(/\n|,/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^(\d+(?:[.,]\d+)?)\s*(x|stk|pk|kg|g|l|ml|pack|bag|box|bottle|can)?\s+(.+)$/i);
      const quantity = match ? Number.parseFloat(match[1].replace(",", ".")) : 1;
      const unit = match?.[2]?.toLowerCase() ?? DEFAULT_UNIT;
      const name = (match?.[3] ?? line).trim();
      return {
        id: `${index}-${name.toLowerCase().replace(/[^a-z0-9æøå]+/gi, "-")}`,
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unit,
        category: getDefaultCategory(name) ?? "other",
      };
    });
}
