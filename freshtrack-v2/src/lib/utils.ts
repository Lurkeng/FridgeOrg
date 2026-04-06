import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ExpiryStatus, FoodCategory, FoodItem } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 1) return "expiring";
  if (diffDays <= 3) return "use_soon";
  return "fresh";
}

export function getExpiryStatusColor(status: ExpiryStatus): string {
  switch (status) {
    case "fresh":    return "bg-fresh-100 text-fresh-800 border-fresh-200";
    case "use_soon": return "bg-warning-100 text-yellow-800 border-warning-200";
    case "expiring": return "bg-orange-100 text-orange-800 border-orange-200";
    case "expired":  return "bg-danger-100 text-danger-500 border-danger-200";
  }
}

export function getExpiryLabel(status: ExpiryStatus): string {
  switch (status) {
    case "fresh":    return "Fresh";
    case "use_soon": return "Use Soon";
    case "expiring": return "Expiring Today";
    case "expired":  return "Expired";
  }
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function formatRelativeDate(dateString: string): string {
  const days = getDaysUntilExpiry(dateString);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

export function getCategoryEmoji(category: FoodCategory): string {
  const emojiMap: Record<FoodCategory, string> = {
    dairy: "🥛", meat: "🥩", poultry: "🍗", seafood: "🐟",
    produce: "🥬", grains: "🌾", beverages: "🥤", condiments: "🧂",
    leftovers: "🍱", frozen_meals: "🧊", snacks: "🍿", other: "📦",
  };
  return emojiMap[category] || "📦";
}

export function getCategoryLabel(category: FoodCategory): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function sortByExpiry(items: FoodItem[]): FoodItem[] {
  return [...items].sort(
    (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  );
}

export function groupByLocation(items: FoodItem[]): Record<string, FoodItem[]> {
  return items.reduce((acc, item) => {
    const key = item.location;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, FoodItem[]>);
}

export function estimateItemCost(category: FoodCategory, quantity: number): number {
  const costMap: Record<FoodCategory, number> = {
    dairy: 3.5, meat: 8.0, poultry: 6.0, seafood: 10.0, produce: 2.5,
    grains: 3.0, beverages: 2.0, condiments: 4.0, leftovers: 5.0,
    frozen_meals: 5.0, snacks: 3.5, other: 3.0,
  };
  return (costMap[category] || 3.0) * quantity;
}
