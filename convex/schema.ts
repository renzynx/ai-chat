import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chatSessions: defineTable({
    userId: v.string(),
    title: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  chatMessages: defineTable({
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolInvocations: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("chatAttachments"))),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),

  chatAttachments: defineTable({
    storageId: v.id("_storage"),
    userId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_storage_id", ["storageId"]),
});
