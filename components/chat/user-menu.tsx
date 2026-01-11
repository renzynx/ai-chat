"use client";

import {
  IconChevronUp,
  IconLogout,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { authClient, signOut, useSession } from "@/lib/auth-client";
import { clearAllLocalData, getAllLocalData } from "@/lib/indexed-db-chat";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncFromLocal = useMutation(api.chat.syncFromLocal);
  const hasSyncedRef = useRef(false);

  const user = session?.user;
  const isAnonymous = (user as { isAnonymous?: boolean })?.isAnonymous ?? true;

  useEffect(() => {
    if (isPending || !user || isAnonymous || hasSyncedRef.current) return;

    const syncLocalData = async () => {
      const localData = await getAllLocalData();
      if (localData.sessions.length === 0) return;

      setIsSyncing(true);
      hasSyncedRef.current = true;

      try {
        await syncFromLocal({
          sessions: localData.sessions,
          messages: localData.messages,
        });
        await clearAllLocalData();
        localStorage.removeItem("chat-current-session-id");
      } catch (error) {
        console.error("Failed to sync local data:", error);
        hasSyncedRef.current = false;
      } finally {
        setIsSyncing(false);
      }
    };

    syncLocalData();
  }, [isPending, user, isAnonymous, syncFromLocal]);

  if (isPending || isSyncing) {
    return (
      <div className="flex items-center gap-3 px-2 py-2 w-full">
        <div className="h-8 w-8 rounded-full bg-sidebar-accent animate-pulse" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-20 bg-sidebar-accent rounded animate-pulse" />
          <div className="h-2 w-16 bg-sidebar-accent rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      window.location.reload();
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleSignUp = () => {
    authClient.signIn.social({ provider: "google" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
          <IconUser size={16} />
        </div>
        <div className="flex-1 text-left overflow-hidden">
          <div className="text-sm font-medium truncate">
            {isAnonymous ? "Guest" : user?.name || user?.email || "User"}
          </div>
          <div className="text-xs text-sidebar-foreground/60 truncate">
            {isAnonymous ? "Sign in to save chats" : user?.email}
          </div>
        </div>
        <IconChevronUp size={16} className="text-sidebar-foreground/60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        {isAnonymous ? (
          <DropdownMenuItem onClick={handleSignUp}>
            <IconUserPlus size={16} />
            Sign up with Google
          </DropdownMenuItem>
        ) : (
          <>
            <div className="px-2 py-1.5">
              <div className="text-sm font-medium">{user?.name || "User"}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="destructive"
            >
              <IconLogout size={16} />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
