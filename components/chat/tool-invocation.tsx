"use client";

import {
  IconChevronDown,
  IconChevronRight,
  IconLoader2,
  IconTerminal2,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ToolInvocationProps {
  toolName: string;
  state: "partial-call" | "call" | "result";
  args: unknown;
  result?: unknown;
}

export function ToolInvocation({
  toolName,
  state,
  args,
  result,
}: ToolInvocationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isRunning = state === "partial-call" || state === "call";
  const hasError =
    state === "result" &&
    // biome-ignore lint/suspicious/noExplicitAny: <idc>
    ((result as any)?.success === false || (result as any)?.error);

  const toggleOpen = () => setIsOpen(!isOpen);

  const formatJson = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div
      className={cn(
        "w-full my-2 overflow-hidden rounded-lg border bg-card text-card-foreground transition-all duration-200",
        "hover:border-primary/20",
        isRunning
          ? "border-amber-500/30 dark:border-amber-500/20"
          : hasError
            ? "border-red-500/30 dark:border-red-500/20"
            : "border-border",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 md:gap-3 p-2 md:p-3 text-sm select-none",
          !isRunning && "cursor-pointer hover:bg-muted/50 transition-colors",
        )}
        onClick={!isRunning ? toggleOpen : undefined}
      >
        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
          <div
            className={cn(
              "flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-md border",
              isRunning
                ? "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900"
                : hasError
                  ? "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900"
                  : "bg-muted/30 text-muted-foreground border-border",
            )}
          >
            {isRunning ? (
              <IconLoader2
                size={14}
                className="animate-spin md:w-[16px] md:h-[16px]"
              />
            ) : hasError ? (
              <IconX size={14} className="md:w-[16px] md:h-[16px]" />
            ) : (
              <IconTerminal2 size={14} className="md:w-[16px] md:h-[16px]" />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate flex items-center gap-2 text-xs md:text-sm">
              {toolName}
              {isRunning && (
                <span className="text-[10px] md:text-xs text-muted-foreground font-normal animate-pulse hidden xs:inline">
                  running...
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isRunning && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0 h-5 font-mono uppercase tracking-wider",
                hasError
                  ? "border-red-200 text-red-600 bg-red-50 dark:bg-red-950/20 dark:border-red-900"
                  : "text-muted-foreground bg-muted/30",
              )}
            >
              {hasError ? "Failed" : "Complete"}
            </Badge>
          )}

          {!isRunning && (
            <div className="text-muted-foreground/50">
              {isOpen ? (
                <IconChevronDown size={16} />
              ) : (
                <IconChevronRight size={16} />
              )}
            </div>
          )}
        </div>
      </div>

      {state === "result" && isOpen && (
        <div className="border-t bg-muted/10 p-2 md:p-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
              Input
            </div>
            <div className="relative rounded-md bg-muted/50 border border-border/50">
              <pre className="text-[10px] md:text-xs p-2 md:p-3 overflow-x-auto font-mono text-foreground/80 leading-relaxed">
                {formatJson(args)}
              </pre>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  hasError ? "bg-red-500/50" : "bg-emerald-500/50",
                )}
              />
              Result
            </div>
            <div
              className={cn(
                "relative rounded-md border",
                hasError
                  ? "bg-red-50/50 border-red-200 dark:bg-red-950/10 dark:border-red-900/50"
                  : "bg-emerald-50/30 border-emerald-200/50 dark:bg-emerald-950/10 dark:border-emerald-900/30",
              )}
            >
              <pre className="text-[10px] md:text-xs p-2 md:p-3 overflow-x-auto font-mono text-foreground/80 leading-relaxed">
                {formatJson(result)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
