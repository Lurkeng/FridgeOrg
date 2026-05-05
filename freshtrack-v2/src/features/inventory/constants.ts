import type { StorageLocation } from "@/types";
import { Archive, Package, Refrigerator, Snowflake } from "lucide-react";

export type InventoryTabValue = StorageLocation | "all";

export const inventoryTabs: { value: InventoryTabValue; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Package },
  { value: "fridge", label: "Fridge", icon: Refrigerator },
  { value: "freezer", label: "Freezer", icon: Snowflake },
  { value: "pantry", label: "Pantry", icon: Archive },
];
