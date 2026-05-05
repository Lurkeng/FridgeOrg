import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useFoodItems } from "@/hooks/useFoodItems";
import { useShoppingList } from "@/hooks/useShoppingList";
import { FoodItemCard } from "@/components/items/FoodItemCard";
import { AddItemForm } from "@/components/items/AddItemForm";
import { Modal } from "@/components/ui/Modal";
import GlassCard from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/SearchField";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { ItemsSkeleton } from "@/components/ui/Skeleton";
import type { StorageLocation, FoodItem } from "@/types";
import { Plus, Package, ScanLine } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { StorageTabs, type InventoryTabValue } from "@/features/inventory";

export const Route = createFileRoute("/_app/items")({
  component: ItemsPage,
});

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
  const [activeTab, setActiveTab]     = useState<InventoryTabValue>("all");
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
        icon={<Package className="w-5 h-5 text-[var(--ft-pickle)]" />}
        actions={
          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
          >
            Add Item
          </Button>
        }
      />

      {/* Search bar */}
      <SearchField
        className="relative mb-4 animate-fade-in-up stagger-1"
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by name or category..."
      />

      {/* Location tabs */}
      <StorageTabs activeTab={activeTab} onTabChange={setActiveTab} totalCount={items.length} itemsByLocation={itemsByLocation} />

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
        <GlassCard className="animate-scale-in" hover={false}>
          <EmptyState
            icon={searchQuery ? "🔍" : activeTab === "freezer" ? "❄️" : activeTab === "pantry" ? "🗄️" : "🧊"}
            title={searchQuery ? "No items match your search" : `Nothing in your ${activeTab === "all" ? "inventory" : activeTab}`}
            description={searchQuery ? "Try a different search term" : "Add some items to get started!"}
          >
          {!searchQuery && (
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                onClick={() => setShowAddModal(true)}
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
              >
                Add Item
              </Button>
              <Link
                to="/scan"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ft-ink)] hover:bg-[var(--ft-pickle)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-ink)] transition-all duration-150"
              >
                <ScanLine className="w-4 h-4" /> Scan barcode
              </Link>
            </div>
          )}
          </EmptyState>
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
