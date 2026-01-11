import { tool } from "ai";
import { z } from "zod";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Clean DDG redirect URLs to get the actual destination
 * DDG wraps all result URLs in /l/?uddg=ENCODED_URL format
 */
function cleanUrl(href: string): string {
  if (!href) return "";

  // Handle DDG redirect URLs
  if (href.includes("uddg=")) {
    try {
      const url = new URL(href, "https://duckduckgo.com");
      const uddg = url.searchParams.get("uddg");
      if (uddg) {
        return decodeURIComponent(uddg);
      }
    } catch {
      // Fall through to other methods
    }
  }

  // Handle /l/?uddg= format
  if (href.startsWith("/l/?uddg=")) {
    try {
      const encoded = href.replace("/l/?uddg=", "").split("&")[0];
      return decodeURIComponent(encoded);
    } catch {
      return href;
    }
  }

  // Skip internal DDG links
  if (
    href.startsWith("/") ||
    href.includes("duckduckgo.com/y.js") ||
    href.includes("duckduckgo-help-pages")
  ) {
    return "";
  }

  return href;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&[^;]+;/g, " ");
}

/**
 * Normalize text by removing HTML tags and excess whitespace
 */
function normalizeText(text: string): string {
  if (!text) return "";
  return decodeHtmlEntities(text.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if response contains anti-bot measures
 */
function isBlocked(html: string): boolean {
  return (
    html.includes("anomaly-modal__modal") ||
    html.includes("challenge-form") ||
    html.includes("detected unusual traffic")
  );
}

/**
 * Extract results from html.duckduckgo.com response
 * Uses paired matching: each result__a is followed by its result__snippet
 */
function extractHtmlResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  // Match link+snippet pairs by finding each result__a and its following result__snippet
  // Pattern captures: href, title text, then snippet text
  const pairRegex =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

  // biome-ignore lint/suspicious/noImplicitAnyLet: <idc>
  let match;
  while ((match = pairRegex.exec(html)) !== null && results.length < 15) {
    const rawUrl = match[1];
    const url = cleanUrl(rawUrl);
    const title = normalizeText(match[2]);
    const snippet = normalizeText(match[3]);

    if (url && title && !seenUrls.has(url)) {
      seenUrls.add(url);
      results.push({ title, url, snippet });
    }
  }

  return results;
}

/**
 * Extract results from lite.duckduckgo.com response
 * Simpler HTML structure: <a class="result-link">TITLE</a>, <td class="result-snippet">
 */
function extractLiteResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  // Pattern for lite version: result-link class for titles, result-snippet for descriptions
  const linkRegex =
    /<a[^>]*rel="nofollow"[^>]*href="([^"]*)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex =
    /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

  const links: { url: string; title: string }[] = [];
  const snippets: string[] = [];

  // biome-ignore lint/suspicious/noImplicitAnyLet: <idc>
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = cleanUrl(match[1]);
    const title = normalizeText(match[2]);
    if (url && title) {
      links.push({ url, title });
    }
  }

  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(normalizeText(match[1]));
  }

  // Combine links with snippets
  for (let i = 0; i < Math.min(links.length, 15); i++) {
    if (!seenUrls.has(links[i].url)) {
      seenUrls.add(links[i].url);
      results.push({
        title: links[i].title,
        url: links[i].url,
        snippet: snippets[i] || "",
      });
    }
  }

  return results;
}

/**
 * Fetch from html.duckduckgo.com using POST
 */
async function fetchHtmlDDG(
  query: string,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  const response = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    body: new URLSearchParams({ q: query, b: "" }),
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://html.duckduckgo.com",
      Referer: "https://html.duckduckgo.com/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  if (isBlocked(html)) {
    throw new Error("BLOCKED");
  }

  return extractHtmlResults(html);
}

/**
 * Fetch from lite.duckduckgo.com using POST (fallback)
 */
async function fetchLiteDDG(
  query: string,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  const response = await fetch("https://lite.duckduckgo.com/lite/", {
    method: "POST",
    body: new URLSearchParams({ q: query }),
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://lite.duckduckgo.com",
      Referer: "https://lite.duckduckgo.com/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  if (isBlocked(html)) {
    throw new Error("BLOCKED");
  }

  return extractLiteResults(html);
}

export const webSearchTool = tool({
  description:
    "Search the web using DuckDuckGo. Use this to find current information, news, answers to questions, or research topics. Returns search results with titles, URLs, and snippets.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(500)
      .describe("The search query to look up on the web"),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Maximum number of results to return (default: 5)"),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      let results: SearchResult[] = [];

      // Try html.duckduckgo.com first
      try {
        results = await fetchHtmlDDG(query, controller.signal);
      } catch (htmlError) {
        // Fallback to lite.duckduckgo.com
        console.warn(
          "html.duckduckgo.com failed, trying lite:",
          htmlError instanceof Error ? htmlError.message : htmlError,
        );
        results = await fetchLiteDDG(query, controller.signal);
      }

      clearTimeout(timeout);

      const finalResults = results.slice(0, maxResults);

      if (finalResults.length === 0) {
        return {
          success: true,
          query,
          message: "No results found for this query",
          results: [],
        };
      }

      return {
        success: true,
        query,
        resultCount: finalResults.length,
        results: finalResults,
      };
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "Search timed out after 15 seconds",
          query,
        };
      }

      if (error instanceof Error && error.message === "BLOCKED") {
        return {
          success: false,
          error: "Search blocked by DuckDuckGo anti-bot measures",
          query,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
        query,
      };
    }
  },
});
