import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

export const getSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    return ctx.db
      .query("chatSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getSession = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) return null;

    return session;
  },
});

export const getMessages = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) return [];

    return ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

export const createSession = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    return ctx.db.insert("chatSessions", {
      userId: user._id,
      title: args.title ?? "New Chat",
      createdAt: Date.now(),
    });
  },
});

export const updateSessionTitle = mutation({
  args: { sessionId: v.id("chatSessions"), title: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, { title: args.title });
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found");
    }

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.sessionId);
  },
});

export const addMessage = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    toolInvocations: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found");
    }

    return ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      userId: user._id,
      role: args.role,
      content: args.content,
      toolInvocations: args.toolInvocations,
      createdAt: Date.now(),
    });
  },
});

export const updateMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.string(),
    toolInvocations: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== user._id) {
      throw new Error("Message not found");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      toolInvocations: args.toolInvocations,
    });
  },
});

const localSessionSchema = v.object({
  id: v.string(),
  title: v.string(),
  createdAt: v.number(),
});

const localMessageSchema = v.object({
  id: v.string(),
  sessionId: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  toolInvocations: v.optional(v.string()),
  createdAt: v.number(),
});

export const syncFromLocal = mutation({
  args: {
    sessions: v.array(localSessionSchema),
    messages: v.record(v.string(), v.array(localMessageSchema)),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    if (user.isAnonymous) {
      throw new Error("Cannot sync to anonymous user");
    }

    let syncedSessions = 0;
    let syncedMessages = 0;

    for (const localSession of args.sessions) {
      const sessionId = await ctx.db.insert("chatSessions", {
        userId: user._id,
        title: localSession.title,
        createdAt: localSession.createdAt,
      });

      const sessionMessages = args.messages[localSession.id] || [];
      for (const localMessage of sessionMessages) {
        await ctx.db.insert("chatMessages", {
          sessionId,
          userId: user._id,
          role: localMessage.role,
          content: localMessage.content,
          toolInvocations: localMessage.toolInvocations,
          createdAt: localMessage.createdAt,
        });
        syncedMessages++;
      }

      syncedSessions++;
    }

    return { syncedSessions, syncedMessages };
  },
});
