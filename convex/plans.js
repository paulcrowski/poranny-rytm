import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const exercise = v.object({
  name: v.string(), seconds: v.number(), note: v.string(), pose: v.string(),
  restBefore: v.optional(v.boolean()),
});
const plan = v.object({ items: v.array(exercise), rest: v.number() });
const validKey = key => /^[a-f0-9]{64}$/.test(key);
const find = (db, key) => db.query("plans").withIndex("by_key", q => q.eq("key", key)).unique();

export const read = queryGeneric({
  args: { key: v.string() },
  handler: async ({ db }, { key }) => {
    if (!validKey(key)) return null;
    const row = await find(db, key);
    return row ? { plan: row.plan, version: row.version } : null;
  },
});

export const save = mutationGeneric({
  args: { key: v.string(), plan, version: v.number() },
  handler: async ({ db }, args) => {
    const { key, plan, version } = args;
    if (!validKey(key) || ![0,5,10,15,20,30].includes(plan.rest) ||
        plan.items.length > 100 || plan.items.some(e => !e.name.trim() ||
          e.name.length > 60 || e.note.length > 240 || e.pose.length > 24 ||
          !Number.isInteger(e.seconds) || e.seconds < 5 || e.seconds > 3600)) {
      throw new Error("Nieprawidłowy plan");
    }
    const row = await find(db, key);
    if ((row?.version ?? 0) !== version) return { conflict: true };
    const next = version + 1;
    if (row) await db.patch(row._id, { plan, version: next });
    else await db.insert("plans", { key, plan, version: next });
    return { version: next };
  },
});
