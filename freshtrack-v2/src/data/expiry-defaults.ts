import { ExpiryDefaults } from "@/types";

// Smart expiry defaults based on food category and storage location
// These are conservative estimates — the app adjusts when an item is opened
export const expiryDefaults: ExpiryDefaults[] = [
  // Dairy
  { category: "dairy", location: "fridge", daysUntilExpiry: 14, openedDaysUntilExpiry: 7 },
  { category: "dairy", location: "freezer", daysUntilExpiry: 90, openedDaysUntilExpiry: 60 },
  { category: "dairy", location: "pantry", daysUntilExpiry: 180, openedDaysUntilExpiry: 14 },

  // Meat
  { category: "meat", location: "fridge", daysUntilExpiry: 5, openedDaysUntilExpiry: 3 },
  { category: "meat", location: "freezer", daysUntilExpiry: 180, openedDaysUntilExpiry: 90 },

  // Poultry
  { category: "poultry", location: "fridge", daysUntilExpiry: 3, openedDaysUntilExpiry: 2 },
  { category: "poultry", location: "freezer", daysUntilExpiry: 270, openedDaysUntilExpiry: 120 },

  // Seafood
  { category: "seafood", location: "fridge", daysUntilExpiry: 3, openedDaysUntilExpiry: 2 },
  { category: "seafood", location: "freezer", daysUntilExpiry: 180, openedDaysUntilExpiry: 90 },

  // Produce
  { category: "produce", location: "fridge", daysUntilExpiry: 7, openedDaysUntilExpiry: 5 },
  { category: "produce", location: "freezer", daysUntilExpiry: 240, openedDaysUntilExpiry: 180 },
  { category: "produce", location: "pantry", daysUntilExpiry: 7, openedDaysUntilExpiry: 5 },

  // Grains
  { category: "grains", location: "pantry", daysUntilExpiry: 180, openedDaysUntilExpiry: 90 },
  { category: "grains", location: "fridge", daysUntilExpiry: 14, openedDaysUntilExpiry: 7 },
  { category: "grains", location: "freezer", daysUntilExpiry: 365, openedDaysUntilExpiry: 180 },

  // Beverages
  { category: "beverages", location: "fridge", daysUntilExpiry: 30, openedDaysUntilExpiry: 7 },
  { category: "beverages", location: "pantry", daysUntilExpiry: 365, openedDaysUntilExpiry: 14 },

  // Condiments
  { category: "condiments", location: "fridge", daysUntilExpiry: 180, openedDaysUntilExpiry: 90 },
  { category: "condiments", location: "pantry", daysUntilExpiry: 365, openedDaysUntilExpiry: 180 },

  // Leftovers
  { category: "leftovers", location: "fridge", daysUntilExpiry: 4, openedDaysUntilExpiry: 3 },
  { category: "leftovers", location: "freezer", daysUntilExpiry: 90, openedDaysUntilExpiry: 60 },

  // Frozen meals
  { category: "frozen_meals", location: "freezer", daysUntilExpiry: 180, openedDaysUntilExpiry: 30 },

  // Snacks
  { category: "snacks", location: "pantry", daysUntilExpiry: 90, openedDaysUntilExpiry: 30 },
  { category: "snacks", location: "fridge", daysUntilExpiry: 14, openedDaysUntilExpiry: 7 },

  // Other
  { category: "other", location: "fridge", daysUntilExpiry: 7, openedDaysUntilExpiry: 5 },
  { category: "other", location: "freezer", daysUntilExpiry: 90, openedDaysUntilExpiry: 60 },
  { category: "other", location: "pantry", daysUntilExpiry: 30, openedDaysUntilExpiry: 14 },
];

export function getExpiryDefault(
  category: string,
  location: string
): ExpiryDefaults | undefined {
  return expiryDefaults.find(
    (d) => d.category === category && d.location === location
  );
}

export function calculateExpiryDate(
  category: string,
  location: string,
  opened: boolean = false,
  fromDate: Date = new Date()
): Date {
  const defaults = getExpiryDefault(category, location);
  const days = defaults
    ? opened
      ? defaults.openedDaysUntilExpiry
      : defaults.daysUntilExpiry
    : 7; // fallback to 7 days

  const expiry = new Date(fromDate);
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}
