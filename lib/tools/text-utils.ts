import { tool } from "ai";
import { z } from "zod";

export const textUtilsTool = tool({
  description:
    "Perform text utilities like word count, character count, encoding/decoding, case conversion, and more.",
  inputSchema: z.object({
    operation: z
      .enum([
        "wordCount",
        "charCount",
        "uppercase",
        "lowercase",
        "titleCase",
        "reverse",
        "base64Encode",
        "base64Decode",
        "urlEncode",
        "urlDecode",
        "slugify",
        "truncate",
      ])
      .describe("The text operation to perform"),
    text: z.string().describe("The text to operate on"),
    maxLength: z
      .number()
      .optional()
      .describe("Maximum length for truncate operation"),
  }),
  execute: async ({ operation, text, maxLength = 100 }) => {
    try {
      switch (operation) {
        case "wordCount":
          return {
            success: true,
            operation,
            result: text.trim().split(/\s+/).filter(Boolean).length,
          };

        case "charCount":
          return {
            success: true,
            operation,
            withSpaces: text.length,
            withoutSpaces: text.replace(/\s/g, "").length,
          };

        case "uppercase":
          return { success: true, operation, result: text.toUpperCase() };

        case "lowercase":
          return { success: true, operation, result: text.toLowerCase() };

        case "titleCase":
          return {
            success: true,
            operation,
            result: text.replace(
              /\w\S*/g,
              (txt) =>
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
            ),
          };

        case "reverse":
          return {
            success: true,
            operation,
            result: text.split("").reverse().join(""),
          };

        case "base64Encode":
          return { success: true, operation, result: btoa(text) };

        case "base64Decode":
          return { success: true, operation, result: atob(text) };

        case "urlEncode":
          return { success: true, operation, result: encodeURIComponent(text) };

        case "urlDecode":
          return { success: true, operation, result: decodeURIComponent(text) };

        case "slugify":
          return {
            success: true,
            operation,
            result: text
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
              .trim(),
          };

        case "truncate":
          return {
            success: true,
            operation,
            result:
              text.length > maxLength
                ? `${text.substring(0, maxLength)}...`
                : text,
          };

        default:
          return { success: false, error: "Unknown operation" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Text operation failed",
      };
    }
  },
});
