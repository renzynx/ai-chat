import { tool } from "ai";
import { z } from "zod";

export const dateTimeTool = tool({
  description:
    "Get the current date and time, or perform date/time operations. Can convert between timezones, calculate date differences, and format dates.",
  inputSchema: z.object({
    operation: z
      .enum(["now", "format", "diff", "add"])
      .describe("The operation to perform"),
    timezone: z
      .string()
      .optional()
      .describe(
        "Timezone for the operation (e.g., 'America/New_York', 'Asia/Tokyo')",
      ),
    date: z
      .string()
      .optional()
      .describe("A date string for operations (ISO 8601 format preferred)"),
    date2: z.string().optional().describe("Second date for diff operations"),
    amount: z.number().optional().describe("Amount to add (for add operation)"),
    unit: z
      .enum(["days", "hours", "minutes", "seconds", "weeks", "months", "years"])
      .optional()
      .describe("Unit for add operation"),
  }),
  execute: async ({ operation, timezone, date, date2, amount, unit }) => {
    try {
      const tz = timezone || "UTC";

      switch (operation) {
        case "now": {
          const now = new Date();
          return {
            success: true,
            iso: now.toISOString(),
            formatted: now.toLocaleString("en-US", { timeZone: tz }),
            timezone: tz,
            timestamp: now.getTime(),
          };
        }

        case "format": {
          if (!date) {
            return {
              success: false,
              error: "Date is required for format operation",
            };
          }
          const d = new Date(date);
          return {
            success: true,
            iso: d.toISOString(),
            formatted: d.toLocaleString("en-US", { timeZone: tz }),
            date: d.toLocaleDateString("en-US", { timeZone: tz }),
            time: d.toLocaleTimeString("en-US", { timeZone: tz }),
            dayOfWeek: d.toLocaleDateString("en-US", {
              weekday: "long",
              timeZone: tz,
            }),
          };
        }

        case "diff": {
          if (!date || !date2) {
            return {
              success: false,
              error: "Two dates are required for diff operation",
            };
          }
          const d1 = new Date(date);
          const d2 = new Date(date2);
          const diffMs = d2.getTime() - d1.getTime();
          return {
            success: true,
            milliseconds: diffMs,
            seconds: Math.floor(diffMs / 1000),
            minutes: Math.floor(diffMs / (1000 * 60)),
            hours: Math.floor(diffMs / (1000 * 60 * 60)),
            days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
          };
        }

        case "add": {
          if (!date || amount === undefined || !unit) {
            return {
              success: false,
              error: "Date, amount, and unit are required for add operation",
            };
          }
          const d = new Date(date);
          switch (unit) {
            case "seconds":
              d.setSeconds(d.getSeconds() + amount);
              break;
            case "minutes":
              d.setMinutes(d.getMinutes() + amount);
              break;
            case "hours":
              d.setHours(d.getHours() + amount);
              break;
            case "days":
              d.setDate(d.getDate() + amount);
              break;
            case "weeks":
              d.setDate(d.getDate() + amount * 7);
              break;
            case "months":
              d.setMonth(d.getMonth() + amount);
              break;
            case "years":
              d.setFullYear(d.getFullYear() + amount);
              break;
          }
          return {
            success: true,
            originalDate: date,
            added: `${amount} ${unit}`,
            result: d.toISOString(),
            formatted: d.toLocaleString("en-US", { timeZone: tz }),
          };
        }

        default:
          return { success: false, error: "Unknown operation" };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "DateTime operation failed",
      };
    }
  },
});
