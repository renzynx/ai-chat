import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { getToken } from "@/lib/auth-server";
import { rateLimit } from "@/lib/rate-limit";
import { tools } from "@/lib/tools";

const opencode = createAnthropic({
  name: "opencode",
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL as string,
});

const MAX_CONTEXT_CHARS = 100000;

function _estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => {
      if (part.type === "text") return part.text;
      if ("input" in part) return JSON.stringify(part.input);
      if ("output" in part) return JSON.stringify(part.output);
      return "";
    })
    .join(" ");
}

function truncateMessages(
  messages: UIMessage[],
  maxChars: number,
): UIMessage[] {
  let totalChars = 0;
  const result: UIMessage[] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgText = getMessageText(messages[i]);
    const msgChars = msgText.length;

    if (totalChars + msgChars > maxChars && result.length > 0) {
      break;
    }

    totalChars += msgChars;
    result.unshift(messages[i]);
  }

  return result;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to various tools.

## Available Tools

- **webSearch**: Search the web for current information
- **webFetch**: Fetch content from URLs
- **calculator**: Perform mathematical calculations
- **dateTime**: Get current date/time, timezone conversions, date math
- **randomGenerator**: Generate random numbers, UUIDs, passwords
- **textUtils**: Text manipulation (word count, encoding, case conversion)

## Guidelines

- Be direct and concise. No unnecessary filler or excessive enthusiasm.
- Do not use emojis unless the user uses them first.
- Use tools when they would provide accurate or real-time information.
- For greetings, respond briefly and ask how you can help.
- Answer questions directly without excessive preamble.
- If you don't know something and can't find it with tools, say so.
- Write clean, well-structured code when asked.
- Use markdown formatting for code blocks, lists, and structure.

## Safety

- Do not help with illegal activities or harmful content.
- Do not provide medical, legal, or financial advice as professional consultation.`;

export async function POST(req: Request) {
  const token = await getToken();
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rateLimitResult = rateLimit(token);
  if (!rateLimitResult.success) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: {
        "Retry-After": Math.ceil(rateLimitResult.resetIn / 1000).toString(),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const truncatedMessages = truncateMessages(messages, MAX_CONTEXT_CHARS);

  const result = streamText({
    model: opencode("minimax-m2.1-free"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(truncatedMessages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
