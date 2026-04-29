import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useFoodItems } from "@/hooks/useFoodItems";
import { useShoppingList } from "@/hooks/useShoppingList";
import { FoodItemCard } from "@/components/items/FoodItemCard";
import { AddItemForm } from "@/components/items/AddItemForm";
import { Modal } from "@/components/ui/Modal";
import GlassCard from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { ItemsSkeleton } from "@/components/ui/Skeleton";
import type { StorageLocation, FoodItem } from "@/types";
import { Search, Plus, Package, Refrigerator, Snowflake, Archive, X, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export const Route = createFileRoute("/_app/items")({
  component: ItemsPage,
});

const tabs: { value: StorageLocation | "all"; label: string; icon: React.ElementType }[] = [
  { value: "all",     label: "All",     icon: Package },
  { value: "fridge",  label: "Fridge",  icon: Refrigerator },
  { value: "freezer", label: "Freezer", icon: Snowflake },
  { value: "pantry",  label: "Pantry",  icon: Archive },
];

function ItemsPage() {
  const { items, fridgeItems, freezerItems, pantryItems, isLoading, addItem, updateItem, deleteItem, markWasted, markConsumed, markOpened } = useFoodItems();
  const { addItem: addToShoppingList } = useShoppingList();
  const { toast } = useToast();

  const handleAddToShoppingList = async (item: FoodItem) => {
    try {
      await addToShoppingList({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        barcode: item.barcode ?? null,
      });
      toast(`${item.name} added to shopping list`, "success");
    } catch {
      toast("Failed to add to shopping list", "error");
    }
  };
  const [activeTab, setActiveTab]     = useState<StorageLocation | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");

  const itemsByLocation: Record<StorageLocation, typeof items> = { fridge: fridgeItems, freezer: freezerItems, pantry: pantryItems };
  const filteredItems = activeTab === "all" ? items : (itemsByLocation[activeTab] || []);
  const searchFiltered = searchQuery
    ? filteredItems.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredItems;

  if (isLoading) {
    return <ItemsSkeleton />;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="My Food"
        subtitle={`${items.length} item${items.length !== 1 ? "s" : ""} tracked`}
        icon={<Package className="w-5 h-5 text-frost-600" />}
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        }
      />

      {/* Search bar */}
      <div className="relative mb-4 animate-fade-in-up stagger-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-3 glass rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-frost-400/50 focus:bg-white/80 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200/70 hover:bg-slate-300/70 flex items-center justify-center transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Location tabs */}
      <div className="flex gap-1 glass rounded-2xl p-1.5 mb-6 animate-fade-in-up stagger-2" role="tablist" aria-label="Storage location">
        {tabs.map((tab) => {
          const count = tab.value === "all" ? items.length : (itemsByLocation[tab.value as StorageLocation]?.length || 0);
          const Icon = tab.icon;
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              role="tab"
              aria-selected={active}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                active
                  ? "glass-heavy text-slate-800 shadow-glass"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/30",
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", active ? "text-frost-500" : "text-slate-400")} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={cn(
                "text-xs min-w-[1.25rem] text-center px-1.5 py-0.5 rounded-full transition-colors",
                active ? "bg-frost-100 text-frost-700 font-semibold" : "text-slate-400",
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {searchFiltered.length > 0 ? (
        <div className="grid gap-3 animate-fade-in-up stagger-3">
          {searchFiltered.map((item, i) => (
            <FoodItemCard
              key={item.id}
              item={item}
              index={i}
              onToggleOpened={async (id) => { try { await markOpened(id); toast("Item marked as opened", "info"); } catch { toast("Failed to update item", "error"); } }}
              onMarkConsumed={async (id) => { try { await markConsumed(id); toast("Marked as consumed \u2713", "success"); } catch { toast("Failed to update item", "error"); } }}
              onMarkWasted={async (id, reason) => { try { await markWasted(id, reason); toast("Added to waste log", "warning"); } catch { toast("Failed to log waste", "error"); } }}
              onUpdateQuantity={async (id, newQuantity) => { try { await updateItem(id, { quantity: newQuantity }); toast(`Quantity updated to ${newQuantity}`, "success"); } catch { toast("Failed to update quantity", "error"); } }}
              onDelete={async (id) => { try { await deleteItem(id); toast("Item removed", "info"); } catch { toast("Failed to remove item", "error"); } }}
              onAddToShoppingList={handleAddToShoppingList}
            />
          ))}
        </div>
      ) : (
        <GlassCard className="text-center py-16 px-8 animate-scale-in" hover={false}>
          <div className="text-6xl mb-4 animate-float inline-block">
            {searchQuery ? "\u{1F50D}" : activeTab === "freezer" ? "\u2744\uFE0F" : activeTab === "pantry" ? "\u{1F5C4}\uFE0F" : "\u{1F9CA}"}
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-1.5">
            {searchQuery ? "No items match your search" : `Nothing in your ${activeTab === "all" ? "inventory" : activeTab}`}
          </h3>
          <p className="text-sm text-slate-500 mb-6">{searchQuery ? "Try a different search term" : "Add some items to get started!"}</p>
          {!searchQuery && (
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.97]"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
              <Link
                to="/scan"
                className="inline-flex items-center gap-2 px-5 py-2.5 glass text-slate-700 rounded-xl text-sm font-semibold hover:bg-white/80 transition-all active:scale-[0.97]"
              >
                <ScanLine className="w-4 h-4" /> Scan Barcode
              </Link>
            </div>
          )}
        </GlassCard>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Item" subtitle="Track a new food item in your storage" size="lg">
        <AddItemForm
          existingItems={items}
          onSubmit={async (item) => {
            try {
              await addItem(item);
              setShowAddModal(false);
              toast(`${item.name} added!`, "success");
            } catch (err) {
              toast(err instanceof Error ? err.message : "Failed to add item", "error");
            }
          }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}
