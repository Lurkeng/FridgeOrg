import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, asc, eq, lte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { authMiddleware } from "@/middleware/auth";
import { getUserHouseholdId } from "@/server/household-context";

const preferenceSchema = z.object({
  enabled: z.boolean(),
  daysBefore: z.number().int().min(0).max(30),
  channel: z.enum(["in_app", "email_ready"]),
  digestCadence: z.enum(["daily", "weekly"]),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
});

const DEFAULT_PREFERENCES = {
  enabled: true,
  daysBefore: 2,
  channel: "in_app" as const,
  digestCadence: "daily" as const,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.notificationPreferences)
      .where(eq(schema.notificationPreferences.userId, context.userId))
      .limit(1);

    return row ?? DEFAULT_PREFERENCES;
  });

export const saveNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(preferenceSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const now = new Date().toISOString();
    const values = {
      userId: context.userId,
      enabled: data.enabled,
      daysBefore: data.daysBefore,
      channel: data.channel,
      digestCadence: data.digestCadence,
      quietHoursStart: data.quietHoursStart,
      quietHoursEnd: data.quietHoursEnd,
      updatedAt: now,
    };

    await db
      .insert(schema.notificationPreferences)
      .values({ ...values, createdAt: now })
      .onConflictDoUpdate({
        target: schema.notificationPreferences.userId,
        set: values,
      });

    return values;
  });

export const getExpiryReminderPreview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return { items: [], preferences: DEFAULT_PREFERENCES };

    const [row] = await db
      .select()
      .from(schema.notificationPreferences)
      .where(eq(schema.notificationPreferences.userId, context.userId))
      .limit(1);
    const preferences = row ?? DEFAULT_PREFERENCES;
    if (!preferences.enabled) {
      return { items: [], preferences };
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + preferences.daysBefore);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    const items = await db
      .select({
        id: schema.foodItems.id,
        name: schema.foodItems.name,
        category: schema.foodItems.category,
        location: schema.foodItems.location,
        expiryDate: schema.foodItems.expiryDate,
      })
      .from(schema.foodItems)
      .where(and(eq(schema.foodItems.householdId, householdId), lte(schema.foodItems.expiryDate, cutoffDate)))
      .orderBy(asc(schema.foodItems.expiryDate))
      .limit(8);

    return { items, preferences };
  });
