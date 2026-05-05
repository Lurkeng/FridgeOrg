export interface PatternRow {
  name: string;
  category: string;
  count: number;
  minDate: string;
  maxDate: string;
}

export interface PredictionEntry {
  name: string;
  category: string;
  averageIntervalDays: number;
  daysSinceLastPurchase: number;
  daysUntilNeeded: number;
  purchaseCount: number;
}

export function mergePatterns(
  foodPatterns: PatternRow[],
  wastePatterns: PatternRow[],
): Map<string, PatternRow> {
  const patternMap = new Map<string, PatternRow>();

  for (const row of foodPatterns) {
    patternMap.set(row.name, { ...row });
  }

  for (const row of wastePatterns) {
    const existing = patternMap.get(row.name);
    if (!existing) {
      patternMap.set(row.name, { ...row });
    } else {
      patternMap.set(row.name, {
        ...existing,
        count: existing.count + row.count,
        minDate: row.minDate < existing.minDate ? row.minDate : existing.minDate,
        maxDate: row.maxDate > existing.maxDate ? row.maxDate : existing.maxDate,
      });
    }
  }

  return patternMap;
}

export function computePredictions(
  patternMap: Map<string, PatternRow>,
  today: Date,
): PredictionEntry[] {
  const todayJulian = Math.floor(today.getTime() / 86400000);
  const predictions: PredictionEntry[] = [];

  for (const pattern of patternMap.values()) {
    if (pattern.count < 2) continue;

    const minJulian = Math.floor(new Date(pattern.minDate).getTime() / 86400000);
    const maxJulian = Math.floor(new Date(pattern.maxDate).getTime() / 86400000);
    const dateRange = maxJulian - minJulian;
    if (dateRange <= 0) continue;

    const averageInterval = dateRange / (pattern.count - 1);
    const daysSinceLast = todayJulian - maxJulian;
    const daysUntilNeeded = Math.round(averageInterval - daysSinceLast);
    if (daysUntilNeeded > 3) continue;

    predictions.push({
      name: pattern.name,
      category: pattern.category,
      averageIntervalDays: Math.round(averageInterval),
      daysSinceLastPurchase: daysSinceLast,
      daysUntilNeeded,
      purchaseCount: pattern.count,
    });
  }

  return predictions.sort((a, b) => a.daysUntilNeeded - b.daysUntilNeeded);
}
