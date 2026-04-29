import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema, FOOD_CATEGORIES } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { estimateItemCost } from "@/lib/utils";
import { getUserHouseholdId } from "@/server/household-context";

// ── GET all food items ─────────────────────────────────────────────────────

export const getFoodItems = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) return [];

    return db
      .select()
      .from(schema.foodItems)
      .where(eq(schema.foodItems.householdId, householdId))
      .orderBy(asc(schema.foodItems.expiryDate));
  });

// ── ADD a food item ────────────────────────────────────────────────────────

const nutritionSchema = z.object({
  calories: z.number(),
  protein:  z.number(),
  carbs:    z.number(),
  fat:      z.number(),
  fiber:    z.number().optional(),
  sugar:    z.number().optional(),
  sodium:   z.number().optional(),
  servingSize: z.string().optional(),
}).nullable().optional();

const addItemSchema = z.object({
  name:       z.string().min(1).max(200),
  category:   z.enum(FOOD_CATEGORIES),
  location:   z.enum(["fridge","freezer","pantry"]),
  quantity:   z.number().positive(),
  unit:       z.string().max(50),
  addedDate:  z.string(),
  expiryDate: z.string(),
  notes:      z.string().nullable().optional(),
  barcode:    z.string().nullable().optional(),
  shelf:      z.string().nullable().optional(),
  nutrition:  nutritionSchema,
});

export const addFoodItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(addItemSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household — join or create one first");

    const n = data.nutrition;
    const [item] = await db
      .insert(schema.foodItems)
      .values({
        name:       data.name,
        category:   data.category,
        location:   data.location,
        quantity:   data.quantity,
        unit:       data.unit,
        addedDate:  data.addedDate,
        expiryDate: data.expiryDate,
        notes:      data.notes,
        barcode:    data.barcode,
        shelf:      data.shelf,
        householdId,
        opened:    false,
        createdBy: context.userId,
        // Nutrition fields (null when not from a barcode scan)
        nutritionCalories:    n?.calories    ?? null,
        nutritionProtein:     n?.protein     ?? null,
        nutritionCarbs:       n?.carbs       ?? null,
        nutritionFat:         n?.fat         ?? null,
        nutritionFiber:       n?.fiber       ?? null,
        nutritionSugar:       n?.sugar       ?? null,
        nutritionSodium:      n?.sodium      ?? null,
        nutritionServingSize: n?.servingSize ?? null,
      })
      .returning();

    return item;
  });

// ── UPDATE a food item ─────────────────────────────────────────────────────

const updateItemSchema = z.object({
  id:      z.string(),
  updates: z.object({
    name:       z.string().min(1).optional(),
    category:   z.string().optional(),
    location:   z.string().optional(),
    quantity:   z.number().positive().optional(),
    unit:       z.string().optional(),
    expiryDate: z.string().optional(),
    opened:     z.boolean().optional(),
    openedDate: z.string().nullable().optional(),
    notes:      z.string().nullable().optional(),
    shelf:      z.string().nullable().optional(),
  }),
});

export const updateFoodItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updateItemSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const [item] = await db
      .update(schema.foodItems)
      .set({ ...(data.updates as Partial<typeof schema.foodItems.$inferInsert>), updatedAt: new Date().toISOString() })
      .where(and(eq(schema.foodItems.id, data.id), eq(schema.foodItems.householdId, householdId)))
      .returning();
    if (!item) throw new Error("Item not found");
    return item;
  });

// ── DELETE a food item ─────────────────────────────────────────────────────

export const deleteFoodItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    await db.delete(schema.foodItems).where(and(eq(schema.foodItems.id, data.id), eq(schema.foodItems.householdId, householdId)));
    return { success: true };
  });

// ── MARK as opened ─────────────────────────────────────────────────────────

export const markOpened = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    const [item] = await db
      .update(schema.foodItems)
      .set({ opened: true, openedDate: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(and(eq(schema.foodItems.id, data.id), eq(schema.foodItems.householdId, householdId)))
      .returning();
    if (!item) throw new Error("Item not found");
    return item;
  });

// ── MARK as wasted (delete + log) ─────────────────────────────────────────

export const markWasted = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    id:     z.string(),
    reason: z.enum(["expired","spoiled","leftover","other"]),
  }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");

    const [item] = await db
      .select()
      .from(schema.foodItems)
      .where(and(eq(schema.foodItems.id, data.id), eq(schema.foodItems.householdId, householdId)));
    if (!item) throw new Error("Item not found");

    await db.insert(schema.wasteLogs).values({
      householdId:   item.householdId,
      itemName:      item.name,
      category:      item.category,
      quantity:      item.quantity,
      unit:          item.unit,
      reason:        data.reason,
      estimatedCost: estimateItemCost(item.category as Parameters<typeof estimateItemCost>[0], item.quantity),
      wastedDate:    new Date().toISOString().split("T")[0],
    });

    await db.delete(schema.foodItems).where(and(eq(schema.foodItems.id, data.id), eq(schema.foodItems.householdId, householdId)));
    return { success: true };
  });

// ── MARK as consumed (delete without logging waste) ───────────────────────

export const markConsumed = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    if (!householdId) throw new Error("No household");
    await db.delete(schema.foodItems).where(and(eq(schema.foodItems.id, data.id), eq(schema.foodItems.householdId, householdId)));
    return { success: true };
  });
