import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  plans: defineTable({
    key: v.string(),
    version: v.number(),
    plan: v.object({
      rest: v.number(),
      items: v.array(v.object({
        name: v.string(), seconds: v.number(), note: v.string(), pose: v.string(),
        restBefore: v.optional(v.boolean()),
      })),
    }),
  }).index("by_key", ["key"]),
});
