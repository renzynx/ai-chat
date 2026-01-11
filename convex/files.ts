import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    if (user.isAnonymous) {
      throw new Error("Anonymous users cannot upload files. Please sign in.");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAttachment = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    if (user.isAnonymous) {
      throw new Error("Anonymous users cannot upload files");
    }

    return ctx.db.insert("chatAttachments", {
      storageId: args.storageId,
      userId: user._id,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
      createdAt: Date.now(),
    });
  },
});

export const getAttachmentUrl = query({
  args: { attachmentId: v.id("chatAttachments") },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) return null;

    const url = await ctx.storage.getUrl(attachment.storageId);
    return {
      url,
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
    };
  },
});

export const deleteAttachment = mutation({
  args: { attachmentId: v.id("chatAttachments") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) throw new Error("Attachment not found");

    if (attachment.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete(args.attachmentId);
  },
});
