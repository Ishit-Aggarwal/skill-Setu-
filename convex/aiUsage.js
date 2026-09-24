import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";
import { AI, RESUME } from "../lib/settings";
import { istDay } from "../lib/dates";

/**
 * Daily AI allowances, counted on the server before the model is called.
 *
 * A limit kept in the browser is a suggestion; this is the control. The API
 * route calls `consume` with the signed-in account's own session token, so a
 * run is always charged to the person asking for it, and `refund` hands one
 * back when the model never answered (the service was down), so an outage
 * does not eat anyone's allowance.
 */

const BUCKETS = {
  host_questions: { limit: AI.DAILY_HOST_RUNS, roles: ["industry", "academician", "institution", "admin"] },
  resume: { limit: RESUME.DAILY_LIMIT, roles: ["student", "admin"] },
};

async function usageRow(ctx, userId, day, route) {
  return await ctx.db
    .query("aiUsage")
    .withIndex("by_user_day_route", (q) => q.eq("userId", userId).eq("day", day).eq("route", route))
    .first();
}

export const consume = mutation({
  args: { sessionToken: v.string(), bucket: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const bucket = BUCKETS[args.bucket];
    if (!bucket) throw new Error("Unknown AI allowance.");
    if (!bucket.roles.includes(actor.role)) throw authError("This AI feature isn't available to your account.");
    const day = istDay();
    const row = await usageRow(ctx, actor.id, day, args.bucket);
    const used = row?.count || 0;
    if (used >= bucket.limit) return { ok: false, used, limit: bucket.limit };
    if (row) await ctx.db.patch(row._id, { count: used + 1 });
    else await ctx.db.insert("aiUsage", { userId: actor.id, day, route: args.bucket, count: 1 });
    return { ok: true, used: used + 1, limit: bucket.limit, remaining: bucket.limit - used - 1 };
  },
});

export const refund = mutation({
  args: { sessionToken: v.string(), bucket: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!BUCKETS[args.bucket]) return { ok: false };
    const row = await usageRow(ctx, actor.id, istDay(), args.bucket);
    if (row && row.count > 0) await ctx.db.patch(row._id, { count: row.count - 1 });
    return { ok: true };
  },
});
