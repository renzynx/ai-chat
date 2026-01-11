"use client";

import { IconRobot } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ChatSkeleton() {
  return (
    <div className="group flex w-full px-3 py-3 md:px-8 md:py-4 justify-start">
      <div className="flex items-start gap-3 w-full max-w-[85%] md:max-w-[75%] flex-row">
        <div className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm mt-0.5 bg-muted text-muted-foreground">
          <IconRobot size={14} className="md:w-4 md:h-4" />
        </div>
        <div className="flex-1 min-w-0 rounded-2xl rounded-bl-md bg-muted/50 px-4 py-3 space-y-4">
          <div className="flex gap-1 h-3 items-center">
            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-[90%] bg-foreground/10" />
            <Skeleton className="h-3 w-[75%] bg-foreground/10" />
            <Skeleton className="h-3 w-[85%] bg-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
