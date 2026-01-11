import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const cleanupAnonymousUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const cutoffTime = Date.now() - SEVEN_DAYS_MS;

    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      where: [
        { field: "isAnonymous", operator: "eq", value: true },
        {
          field: "createdAt",
          operator: "lt",
          value: cutoffTime,
          connector: "AND",
        },
      ],
      paginationOpts: { cursor: null, numItems: 100 },
    });

    const oldAnonymousUsers = result.page || [];
    let deletedUsers = 0;

    for (const user of oldAnonymousUsers) {
      const userId = user._id as string;

      await ctx.runMutation(internal.cleanup.deleteUserData, { userId });

      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "session",
          where: [{ field: "userId", operator: "eq", value: userId }],
        },
        paginationOpts: { cursor: null, numItems: 100 },
      });

      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "account",
          where: [{ field: "userId", operator: "eq", value: userId }],
        },
        paginationOpts: { cursor: null, numItems: 100 },
      });

      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "user",
          where: [{ field: "_id", operator: "eq", value: userId }],
        },
      });

      deletedUsers++;
    }

    return { deletedUsers };
  },
});

export const deleteUserData = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let deletedSessions = 0;
    let deletedMessages = 0;
    let deletedAttachments = 0;

    for (const session of sessions) {
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const message of messages) {
        await ctx.db.delete(message._id);
        deletedMessages++;
      }

      await ctx.db.delete(session._id);
      deletedSessions++;
    }

    const attachments = await ctx.db
      .query("chatAttachments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const attachment of attachments) {
      try {
        await ctx.storage.delete(attachment.storageId);
      } catch {}
      await ctx.db.delete(attachment._id);
      deletedAttachments++;
    }

    return { deletedSessions, deletedMessages, deletedAttachments };
  },
});

export const cleanupExpiredFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoffTime = Date.now() - SEVEN_DAYS_MS;

    const expiredAttachments = await ctx.db
      .query("chatAttachments")
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .collect();

    let deletedFiles = 0;
    let deletedBytes = 0;

    for (const attachment of expiredAttachments) {
      try {
        await ctx.storage.delete(attachment.storageId);
        deletedBytes += attachment.size;
      } catch {}

      const messagesWithAttachment = await ctx.db
        .query("chatMessages")
        .filter((q) => q.neq(q.field("attachments"), undefined))
        .collect();

      for (const message of messagesWithAttachment) {
        if (message.attachments?.includes(attachment._id)) {
          const updatedAttachments = message.attachments.filter(
            (id) => id !== attachment._id,
          );
          await ctx.db.patch(message._id, {
            attachments:
              updatedAttachments.length > 0 ? updatedAttachments : undefined,
          });
        }
      }

      await ctx.db.delete(attachment._id);
      deletedFiles++;
    }

    return { deletedFiles, deletedBytes };
  },
});
