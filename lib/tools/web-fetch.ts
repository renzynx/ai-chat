import { tool } from "ai";
import { z } from "zod";

export const webFetchTool = tool({
  description:
    "Fetch content from a URL. Use this to retrieve information from websites, APIs, or any web resource. Returns the text content of the page.",
  inputSchema: z.object({
    url: z
      .string()
      .url()
      .describe(
        "The URL to fetch content from (must include http:// or https://)",
      ),
  }),
  execute: async ({ url }) => {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "AI-Chat-Bot/1.0",
          Accept: "text/html,application/json,text/plain,*/*",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get("content-type") || "";
      let content: string;

      if (contentType.includes("application/json")) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2);
      } else {
        content = await response.text();
        if (content.length > 10000) {
          content = `${content.substring(0, 10000)}\n\n[Content truncated...]`;
        }
      }

      return {
        success: true,
        url,
        contentType,
        content,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch URL",
      };
    }
  },
});
