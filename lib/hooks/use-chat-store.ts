"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvexAuth, useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@/lib/auth-client";
import {
  addLocalMessage,
  createLocalSession,
  deleteLocalSession,
  getLocalMessages,
  getLocalSessions,
  type LocalChatMessage,
  type LocalChatSession,
  updateLocalSessionTitle,
} from "@/lib/indexed-db-chat";

export interface ChatSession {
  _id: string;
  userId: string;
  title: string;
  createdAt: number;
}

export interface ChatMessage {
  _id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  toolInvocations?: string;
  createdAt: number;
}

function isLocalId(id: string): boolean {
  return id.startsWith("local-");
}

export function useChatStore() {
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(
    null,
  );
  const [localSessions, setLocalSessions] = useState<LocalChatSession[]>([]);
  const [localMessages, setLocalMessages] = useState<LocalChatMessage[]>([]);
  const [localSessionsLoaded, setLocalSessionsLoaded] = useState(false);

  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { data: session } = useSession();
  const isAnonymous =
    (session?.user as { isAnonymous?: boolean })?.isAnonymous ?? true;

  const isAuthReady = isAuthenticated && !isConvexLoading;
  const useLocalStorage = isAnonymous || !isAuthReady;

  const { data: convexSessions = [], isFetched: convexSessionsFetched } =
    useQuery({
      ...convexQuery(api.chat.getSessions, {}),
      enabled: isAuthReady && !isAnonymous,
    });

  const { data: convexCurrentSession } = useQuery({
    ...convexQuery(
      api.chat.getSession,
      currentSessionId && !isLocalId(currentSessionId)
        ? { sessionId: currentSessionId as Id<"chatSessions"> }
        : "skip",
    ),
    enabled:
      isAuthReady &&
      !isAnonymous &&
      !!currentSessionId &&
      !isLocalId(currentSessionId),
  });

  const { data: convexMessages = [] } = useQuery({
    ...convexQuery(
      api.chat.getMessages,
      currentSessionId && !isLocalId(currentSessionId)
        ? { sessionId: currentSessionId as Id<"chatSessions"> }
        : "skip",
    ),
    enabled:
      isAuthReady &&
      !isAnonymous &&
      !!currentSessionId &&
      !isLocalId(currentSessionId),
  });

  const createSessionMutation = useMutation(api.chat.createSession);
  const updateSessionTitleMutation = useMutation(api.chat.updateSessionTitle);
  const deleteSessionMutation = useMutation(api.chat.deleteSession);
  const addMessageMutation = useMutation(api.chat.addMessage);
  const updateMessageMutation = useMutation(api.chat.updateMessage);

  useEffect(() => {
    if (useLocalStorage) {
      getLocalSessions().then((sessions) => {
        setLocalSessions(sessions);
        setLocalSessionsLoaded(true);
      });
    }
  }, [useLocalStorage]);

  useEffect(() => {
    if (useLocalStorage && currentSessionId && isLocalId(currentSessionId)) {
      getLocalMessages(currentSessionId).then(setLocalMessages);
    }
  }, [useLocalStorage, currentSessionId]);

  useEffect(() => {
    const storedId = localStorage.getItem("chat-current-session-id");
    if (storedId) {
      const storedIsLocal = isLocalId(storedId);
      if (useLocalStorage && !storedIsLocal) {
        localStorage.removeItem("chat-current-session-id");
        return;
      }
      if (!useLocalStorage && storedIsLocal) {
        localStorage.removeItem("chat-current-session-id");
        return;
      }
      setCurrentSessionIdState(storedId);
    }
  }, [useLocalStorage]);

  const setCurrentSessionId = useCallback((id: string | null) => {
    setCurrentSessionIdState(id);
    if (id) {
      localStorage.setItem("chat-current-session-id", id);
    } else {
      localStorage.removeItem("chat-current-session-id");
    }
  }, []);

  const refreshLocalSessions = useCallback(async () => {
    const sessions = await getLocalSessions();
    setLocalSessions(sessions);
  }, []);

  const refreshLocalMessages = useCallback(async (sessionId: string) => {
    const messages = await getLocalMessages(sessionId);
    setLocalMessages(messages);
  }, []);

  const createSession = useCallback(async (): Promise<string> => {
    if (useLocalStorage) {
      const session = await createLocalSession();
      await refreshLocalSessions();
      return session.id;
    }
    const id = await createSessionMutation({ title: "New Chat" });
    return id;
  }, [useLocalStorage, createSessionMutation, refreshLocalSessions]);

  const deleteSession = useCallback(
    async (id: string) => {
      if (isLocalId(id)) {
        await deleteLocalSession(id);
        await refreshLocalSessions();
      } else {
        await deleteSessionMutation({
          sessionId: id as Id<"chatSessions">,
        });
      }
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
    },
    [
      currentSessionId,
      deleteSessionMutation,
      refreshLocalSessions,
      setCurrentSessionId,
    ],
  );

  const addMessage = useCallback(
    async (
      sessionId: string,
      role: "user" | "assistant",
      content: string,
      toolInvocations?: string,
    ): Promise<string> => {
      if (isLocalId(sessionId)) {
        const msg = await addLocalMessage(
          sessionId,
          role,
          content,
          toolInvocations,
        );
        await refreshLocalMessages(sessionId);
        return msg.id;
      }
      return addMessageMutation({
        sessionId: sessionId as Id<"chatSessions">,
        role,
        content,
        toolInvocations,
      });
    },
    [addMessageMutation, refreshLocalMessages],
  );

  const updateSessionTitle = useCallback(
    async (sessionId: string, title: string) => {
      if (isLocalId(sessionId)) {
        await updateLocalSessionTitle(sessionId, title);
        await refreshLocalSessions();
      } else {
        await updateSessionTitleMutation({
          sessionId: sessionId as Id<"chatSessions">,
          title,
        });
      }
    },
    [updateSessionTitleMutation, refreshLocalSessions],
  );

  const sessions: ChatSession[] = useLocalStorage
    ? localSessions.map((s) => ({
        _id: s.id,
        userId: "anonymous",
        title: s.title,
        createdAt: s.createdAt,
      }))
    : convexSessions.map((s) => ({
        _id: s._id,
        userId: s.userId,
        title: s.title,
        createdAt: s.createdAt,
      }));

  const currentSession: ChatSession | null = useLocalStorage
    ? localSessions.find((s) => s.id === currentSessionId)
      ? {
          _id: currentSessionId!,
          userId: "anonymous",
          title: localSessions.find((s) => s.id === currentSessionId)!.title,
          createdAt: localSessions.find((s) => s.id === currentSessionId)!
            .createdAt,
        }
      : null
    : convexCurrentSession
      ? {
          _id: convexCurrentSession._id,
          userId: convexCurrentSession.userId,
          title: convexCurrentSession.title,
          createdAt: convexCurrentSession.createdAt,
        }
      : null;

  const messages: ChatMessage[] = useLocalStorage
    ? localMessages.map((m) => ({
        _id: m.id,
        sessionId: m.sessionId,
        userId: "anonymous",
        role: m.role,
        content: m.content,
        toolInvocations: m.toolInvocations,
        createdAt: m.createdAt,
      }))
    : convexMessages.map((m) => ({
        _id: m._id,
        sessionId: m.sessionId,
        userId: m.userId,
        role: m.role,
        content: m.content,
        toolInvocations: m.toolInvocations,
        createdAt: m.createdAt,
      }));

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    deleteSession,
    currentSession,
    messages,
    addMessage,
    updateSessionTitle,
    updateMessage: updateMessageMutation,
    isAuthReady: useLocalStorage
      ? localSessionsLoaded
      : isAuthReady && convexSessionsFetched,
    isAnonymous,
  };
}
