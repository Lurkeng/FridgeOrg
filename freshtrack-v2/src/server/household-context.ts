import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export async function getUserHouseholdId(
  db: ReturnType<typeof getDb>,
  userId: string,
): Promise<string | null> {
  const member = await db
    .select({ householdId: schema.householdMembers.householdId })
    .from(schema.householdMembers)
    .where(eq(schema.householdMembers.userId, userId))
    .limit(1);

  return member[0]?.householdId ?? null;
}
