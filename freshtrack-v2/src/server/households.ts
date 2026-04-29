import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── GET current user's household ───────────────────────────────────────────

export const getMyHousehold = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    const membership = await db
      .select({
        household: schema.households,
        role: schema.householdMembers.role,
      })
      .from(schema.householdMembers)
      .innerJoin(schema.households, eq(schema.householdMembers.householdId, schema.households.id))
      .where(eq(schema.householdMembers.userId, context.userId))
      .limit(1);

    return membership[0] ?? null;
  });

// ── CREATE a new household ─────────────────────────────────────────────────

export const createHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ name: z.string().min(1).max(100) }))
  .handler(async ({ context, data }) => {
    const db = getDb();

    // Prevent duplicate household creation
    const existing = await db
      .select()
      .from(schema.householdMembers)
      .where(eq(schema.householdMembers.userId, context.userId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("You are already in a household");
    }

    const [household] = await db
      .insert(schema.households)
      .values({
        name:       data.name,
        createdBy:  context.userId,
        inviteCode: generateInviteCode(),
      })
      .returning();

    await db.insert(schema.householdMembers).values({
      householdId: household.id,
      userId:      context.userId,
      role:        "owner",
    });

    return household;
  });

// ── JOIN a household via invite code ──────────────────────────────────────

export const joinHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ inviteCode: z.string().length(6) }))
  .handler(async ({ context, data }) => {
    const db = getDb();

    const [household] = await db
      .select()
      .from(schema.households)
      .where(eq(schema.households.inviteCode, data.inviteCode.toUpperCase()));

    if (!household) throw new Error("Invalid invite code");

    // Check if already a member
    const existing = await db
      .select()
      .from(schema.householdMembers)
      .where(
        and(
          eq(schema.householdMembers.householdId, household.id),
          eq(schema.householdMembers.userId, context.userId)
        )
      );

    if (existing.length > 0) throw new Error("You are already in this household");

    await db.insert(schema.householdMembers).values({
      householdId: household.id,
      userId:      context.userId,
      role:        "member",
    });

    return household;
  });

// ── GET household members ─────────────────────────────────────────────────

export const getHouseholdMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    const membership = await db
      .select({ householdId: schema.householdMembers.householdId })
      .from(schema.householdMembers)
      .where(eq(schema.householdMembers.userId, context.userId))
      .limit(1);

    if (!membership[0]) return [];

    return db
      .select({
        member: schema.householdMembers,
        user: {
          id:    schema.users.id,
          name:  schema.users.name,
          email: schema.users.email,
          image: schema.users.image,
        },
      })
      .from(schema.householdMembers)
      .innerJoin(schema.users, eq(schema.householdMembers.userId, schema.users.id))
      .where(eq(schema.householdMembers.householdId, membership[0].householdId));
  });

// ── Regenerate invite code ─────────────────────────────────────────────────

export const regenerateInviteCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    const membership = await db
      .select()
      .from(schema.householdMembers)
      .where(
        and(
          eq(schema.householdMembers.userId, context.userId),
          eq(schema.householdMembers.role, "owner")
        )
      )
      .limit(1);

    if (!membership[0]) throw new Error("Only owners can regenerate invite codes");

    const [updated] = await db
      .update(schema.households)
      .set({ inviteCode: generateInviteCode() })
      .where(eq(schema.households.id, membership[0].householdId))
      .returning();

    return updated;
  });
