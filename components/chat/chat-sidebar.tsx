import { IconMessage, IconPlus, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

interface SidebarSession {
  id: string;
  title: string;
  createdAt: number;
}

interface ChatSidebarProps {
  sessions: SidebarSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
}: ChatSidebarProps) {
  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full w-[280px] md:w-[260px] flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out md:static md:translate-x-0 shadow-xl md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
        >
          <IconPlus size={18} />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="space-y-1 px-2">
          {sessions.length === 0 && (
            <div className="text-sm text-sidebar-foreground/50 px-2 py-4 text-center">
              No chat history
            </div>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group relative flex w-full items-center rounded-md text-sm font-medium hover:bg-sidebar-accent/50 transition-colors",
                currentSessionId === session.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground",
              )}
            >
              <Link
                href={`/chat/${session.id}`}
                className="absolute inset-0 w-full h-full text-left rounded-md focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
                onClick={() => onSelectSession(session.id)}
                aria-label={`Select chat ${session.title}`}
              />
              <div className="relative z-10 flex flex-1 items-center px-2 py-2 pointer-events-none overflow-hidden">
                <IconMessage size={16} className="mr-2 shrink-0 opacity-70" />
                <span className="truncate">{session.title}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDeleteSession(session.id);
                }}
                className="relative z-20 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity mr-2 p-1 cursor-pointer focus:opacity-100"
                aria-label="Delete chat"
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-2 border-t border-sidebar-border">
        <UserMenu />
      </div>
    </div>
  );
}
