'use client';

import { useState } from 'react';
import { useFoodItems } from '@/hooks/useFoodItems';
import { FoodItemCard } from '@/components/items/FoodItemCard';
import { AddItemForm } from '@/components/items/AddItemForm';
import { Modal } from '@/components/ui/Modal';
import GlassCard from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { StorageLocation } from '@/types';
import { Search, Plus, Package, Refrigerator, Snowflake, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs: { value: StorageLocation | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all',     label: 'All',     icon: Package },
  { value: 'fridge',  label: 'Fridge',  icon: Refrigerator },
  { value: 'freezer', label: 'Freezer', icon: Snowflake },
  { value: 'pantry',  label: 'Pantry',  icon: Archive },
];

export default function ItemsPage() {
  const { items, itemsByLocation, isLoaded, addItem, deleteItem, markAsWasted, markAsConsumed, toggleOpened } = useFoodItems();
  const [activeTab, setActiveTab]   = useState<StorageLocation | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery]  = useState('');

  const filteredItems = activeTab === 'all' ? items : (itemsByLocation[activeTab] || []);
  const searchFiltered = searchQuery
    ? filteredItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredItems;
  const sortedItems = [...searchFiltered].sort(
    (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  );

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass rounded-2xl px-8 py-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-frost-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">Loading inventory…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="My Food"
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''} tracked`}
        icon={<Package className="w-5 h-5 text-frost-600" />}
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative mb-4 animate-fade-in-up stagger-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or category…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 glass rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-frost-400/50 focus:bg-white/80 transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-2xl p-1 mb-6 animate-fade-in-up stagger-2">
        {tabs.map((tab) => {
          const count = tab.value === 'all' ? items.length : (itemsByLocation[tab.value as StorageLocation]?.length || 0);
          const Icon = tab.icon;
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'glass-heavy text-slate-800 shadow-glass'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/30',
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', active ? 'text-frost-500' : 'text-slate-400')} />
              {tab.label}
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full', active ? 'bg-frost-100 text-frost-700' : 'text-slate-400')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items List */}
      {sortedItems.length > 0 ? (
        <div className="grid gap-3 animate-fade-in-up stagger-3">
          {sortedItems.map((item, i) => (
            <FoodItemCard
              key={item.id}
              item={item}
              index={i}
              onToggleOpened={toggleOpened}
              onMarkConsumed={markAsConsumed}
              onMarkWasted={markAsWasted}
              onDelete={deleteItem}
            />
          ))}
        </div>
      ) : (
        <GlassCard className="text-center py-16 px-8 animate-scale-in" hover={false}>
          <div className="text-5xl mb-4 animate-float inline-block">
            {searchQuery ? '🔍' : activeTab === 'all' ? '🧊' : activeTab === 'fridge' ? '🧊' : activeTab === 'freezer' ? '❄️' : '🗄️'}
          </div>
          <h3 className="font-bold text-slate-800 mb-1.5">
            {searchQuery ? 'No items match your search' : `Nothing in your ${activeTab === 'all' ? 'inventory' : activeTab}`}
          </h3>
          <p className="text-sm text-slate-500">
            {searchQuery ? 'Try a different search term' : 'Add some items to get started!'}
          </p>
        </GlassCard>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Item" subtitle="Track a new food item in your storage" size="lg">
        <AddItemForm
          onSubmit={(item) => { addItem(item); setShowAddModal(false); }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}
