import { cn } from "@/lib/utils";
import type { StorageLocation } from "@/types";
import { inventoryTabs, type InventoryTabValue } from "@/features/inventory/constants";

interface StorageTabsProps {
  activeTab: InventoryTabValue;
  onTabChange: (tab: InventoryTabValue) => void;
  totalCount: number;
  itemsByLocation: Record<StorageLocation, unknown[]>;
}

export function StorageTabs({ activeTab, onTabChange, totalCount, itemsByLocation }: StorageTabsProps) {
  return (
    <div
      className="mb-6 flex gap-0 border border-[var(--ft-ink)] bg-[var(--ft-paper)] animate-fade-in-up stagger-2"
      role="tablist"
      aria-label="Storage location"
    >
      {inventoryTabs.map((tab, i) => {
        const count = tab.value === "all" ? totalCount : (itemsByLocation[tab.value as StorageLocation]?.length || 0);
        const Icon = tab.icon;
        const active = activeTab === tab.value;
        const isLast = i === inventoryTabs.length - 1;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            role="tab"
            aria-selected={active}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 px-3 py-3 transition-all duration-150",
              !isLast && "border-r border-[var(--ft-ink)]",
              active
                ? "bg-[var(--ft-ink)] text-[var(--ft-bone)]"
                : "bg-transparent text-[rgba(21,19,15,0.58)] hover:bg-[var(--ft-bone)] hover:text-[var(--ft-ink)]",
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute -top-px left-1/2 h-1 w-8 -translate-x-1/2 bg-[var(--ft-pickle)]"
              />
            )}
            <Icon
              className={cn("h-3.5 w-3.5 transition-colors", active ? "text-[var(--ft-pickle)]" : "text-[rgba(21,19,15,0.50)]")}
              strokeWidth={active ? 2 : 1.75}
            />
            <span
              className={cn(
                "hidden sm:inline font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
              )}
            >
              {tab.label}
            </span>
            <span
              className={cn(
                "min-w-[1.5rem] border px-1.5 py-px text-center font-mono text-[10px] font-bold tracking-wide",
                active
                  ? "border-[rgba(242,234,220,0.45)] bg-[rgba(242,234,220,0.10)] text-[var(--ft-bone)]"
                  : "border-[rgba(21,19,15,0.20)] bg-transparent text-[rgba(21,19,15,0.54)]",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
