export function computeStreak(wasteDateSet: Set<string>, today: Date): number {
  const d = new Date(today);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().split("T")[0];
    if (wasteDateSet.has(dateStr)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function computeMonthlyGrade(
  thisCount: number,
  lastCount: number,
): "A" | "B" | "C" | "D" | "F" {
  if (lastCount === 0) return "B";
  const changePercent = ((thisCount - lastCount) / lastCount) * 100;
  if (changePercent <= -50) return "A";
  if (changePercent <= -20) return "B";
  if (changePercent <= 0) return "C";
  if (changePercent <= 20) return "D";
  return "F";
}
