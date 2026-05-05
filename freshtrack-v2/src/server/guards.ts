export function requireHouseholdId(householdId: string | null): string {
  if (!householdId) {
    throw new Error("No household — join or create one first");
  }
  return householdId;
}
