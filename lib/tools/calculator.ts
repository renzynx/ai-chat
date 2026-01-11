import { tool } from "ai";
import { z } from "zod";

export const calculatorTool = tool({
  description:
    "Perform mathematical calculations. Supports basic arithmetic (+, -, *, /), exponents (**), parentheses, and common math functions like sqrt, sin, cos, tan, log, abs, round, floor, ceil.",
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        "The mathematical expression to evaluate (e.g., '2 + 2', 'sqrt(16)', '(5 * 3) + 10')",
      ),
  }),
  execute: async ({ expression }) => {
    try {
      const mathContext = {
        sqrt: Math.sqrt,
        abs: Math.abs,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        log: Math.log,
        log10: Math.log10,
        log2: Math.log2,
        exp: Math.exp,
        pow: Math.pow,
        round: Math.round,
        floor: Math.floor,
        ceil: Math.ceil,
        min: Math.min,
        max: Math.max,
        random: Math.random,
        PI: Math.PI,
        E: Math.E,
      };

      const sanitized = expression.replace(/[^0-9+\-*/.()%,\s\w]/g, "");

      const fn = new Function(
        ...Object.keys(mathContext),
        `return ${sanitized}`,
      );

      const result = fn(...Object.values(mathContext));

      if (typeof result !== "number" || !Number.isFinite(result)) {
        return {
          success: false,
          error: "Invalid calculation result",
          expression,
        };
      }

      return {
        success: true,
        expression,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Calculation failed",
        expression,
      };
    }
  },
});
