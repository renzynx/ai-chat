"use client";

import { IconRobot, IconUser } from "@tabler/icons-react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ToolInvocation } from "./tool-invocation";

interface ChatMessageProps {
  message: UIMessage;
}

function isToolPart(part: { type: string }): part is {
  type: string;
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
} {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function getToolName(part: { type: string; toolName?: string }): string {
  if (part.type === "dynamic-tool" && "toolName" in part) {
    return part.toolName || "unknown";
  }
  return part.type.replace("tool-", "");
}

function mapToolState(state: string): "partial-call" | "call" | "result" {
  switch (state) {
    case "input-streaming":
      return "partial-call";
    case "input-available":
    case "approval-requested":
    case "approval-responded":
      return "call";
    case "output-available":
    case "output-error":
      return "result";
    default:
      return "call";
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "group flex w-full px-3 py-3 md:px-8 md:py-4",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 max-w-[85%] md:max-w-[75%]",
          isUser ? "flex-row-reverse" : "flex-row",
        )}
      >
        <div
          className={cn(
            "flex h-7 w-7 md:h-8 md:w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm mt-0.5",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isUser ? (
            <IconUser size={14} className="md:w-4 md:h-4" />
          ) : (
            <IconRobot size={14} className="md:w-4 md:h-4" />
          )}
        </div>
        <div
          className={cn(
            "flex-1 space-y-2 overflow-hidden min-w-0 rounded-2xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted/50 rounded-bl-md",
          )}
        >
          <div
            className={cn(
              "prose prose-sm md:prose-base break-words max-w-none",
              "prose-p:my-1 prose-p:leading-relaxed",
              "prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-3",
              "prose-code:before:content-none prose-code:after:content-none",
              "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
              "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
              "prose-headings:my-2",
              "prose-blockquote:my-2 prose-blockquote:border-l-primary",
              isUser
                ? "prose-invert prose-pre:bg-primary-foreground/10 prose-code:bg-primary-foreground/20"
                : "dark:prose-invert",
            )}
          >
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                if (isUser) {
                  return (
                    <p
                      key={`${message.id}-text-${index}`}
                      className="whitespace-pre-wrap m-0"
                    >
                      {part.text}
                    </p>
                  );
                }
                return (
                  <ReactMarkdown
                    key={`${message.id}-text-${index}`}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {part.text}
                  </ReactMarkdown>
                );
              }
              if (isToolPart(part)) {
                const toolPart = part as {
                  type: string;
                  toolName?: string;
                  state: string;
                  input?: unknown;
                  output?: unknown;
                  errorText?: string;
                };
                const mappedState = mapToolState(toolPart.state);
                return (
                  <ToolInvocation
                    key={`${message.id}-tool-${index}`}
                    toolName={getToolName(toolPart)}
                    state={mappedState}
                    args={toolPart.input}
                    result={
                      mappedState === "result"
                        ? (toolPart.output ?? { error: toolPart.errorText })
                        : undefined
                    }
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
