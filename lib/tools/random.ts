import { randomInt } from "node:crypto";
import { tool } from "ai";
import { z } from "zod";

export const randomGeneratorTool = tool({
  description:
    "Generate random values like numbers, UUIDs, passwords, or pick random items from a list.",
  inputSchema: z.object({
    type: z
      .enum(["number", "uuid", "password", "pick"])
      .describe("Type of random value to generate"),
    min: z
      .number()
      .optional()
      .describe("Minimum value for random number (default: 0)"),
    max: z
      .number()
      .optional()
      .describe("Maximum value for random number (default: 100)"),
    length: z
      .number()
      .optional()
      .describe("Length for password generation (default: 16)"),
    items: z
      .array(z.string())
      .optional()
      .describe("Array of items to pick from (for 'pick' type)"),
    count: z
      .number()
      .optional()
      .describe(
        "Number of items to pick or passwords to generate (default: 1)",
      ),
  }),
  execute: async ({
    type,
    min = 0,
    max = 100,
    length = 16,
    items,
    count = 1,
  }) => {
    try {
      switch (type) {
        case "number": {
          const results = Array.from({ length: count }, () =>
            randomInt(min, max + 1),
          );
          return {
            success: true,
            type: "number",
            range: { min, max },
            result: count === 1 ? results[0] : results,
          };
        }

        case "uuid": {
          const results = Array.from({ length: count }, () =>
            crypto.randomUUID(),
          );
          return {
            success: true,
            type: "uuid",
            result: count === 1 ? results[0] : results,
          };
        }

        case "password": {
          const chars =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
          const results = Array.from({ length: count }, () =>
            Array.from({ length }, () =>
              chars.charAt(randomInt(0, chars.length)),
            ).join(""),
          );
          return {
            success: true,
            type: "password",
            length,
            result: count === 1 ? results[0] : results,
          };
        }

        case "pick": {
          if (!items || items.length === 0) {
            return {
              success: false,
              error: "Items array is required for pick operation",
            };
          }
          const results = Array.from(
            { length: Math.min(count, items.length) },
            () => items[randomInt(0, items.length)],
          );
          return {
            success: true,
            type: "pick",
            from: items,
            result: count === 1 ? results[0] : results,
          };
        }

        default:
          return { success: false, error: "Unknown type" };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Random generation failed",
      };
    }
  },
});
