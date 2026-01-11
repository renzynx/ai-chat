"use client";

import { del, get, keys, set } from "idb-keyval";

export interface LocalChatSession {
  id: string;
  title: string;
  createdAt: number;
}

export interface LocalChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  toolInvocations?: string;
  createdAt: number;
}

const SESSIONS_KEY = "chat-sessions";
const MESSAGES_PREFIX = "chat-messages-";

function generateId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function getLocalSessions(): Promise<LocalChatSession[]> {
  const sessions = await get<LocalChatSession[]>(SESSIONS_KEY);
  return sessions || [];
}

export async function getLocalSession(
  sessionId: string,
): Promise<LocalChatSession | null> {
  const sessions = await getLocalSessions();
  return sessions.find((s) => s.id === sessionId) || null;
}

export async function createLocalSession(
  title = "New Chat",
): Promise<LocalChatSession> {
  const sessions = await getLocalSessions();
  const newSession: LocalChatSession = {
    id: generateId(),
    title,
    createdAt: Date.now(),
  };
  await set(SESSIONS_KEY, [...sessions, newSession]);
  return newSession;
}

export async function updateLocalSessionTitle(
  sessionId: string,
  title: string,
): Promise<void> {
  const sessions = await getLocalSessions();
  const updated = sessions.map((s) =>
    s.id === sessionId ? { ...s, title } : s,
  );
  await set(SESSIONS_KEY, updated);
}

export async function deleteLocalSession(sessionId: string): Promise<void> {
  const sessions = await getLocalSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  await set(SESSIONS_KEY, filtered);
  await del(`${MESSAGES_PREFIX}${sessionId}`);
}

export async function getLocalMessages(
  sessionId: string,
): Promise<LocalChatMessage[]> {
  const messages = await get<LocalChatMessage[]>(
    `${MESSAGES_PREFIX}${sessionId}`,
  );
  return messages || [];
}

export async function addLocalMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  toolInvocations?: string,
): Promise<LocalChatMessage> {
  const messages = await getLocalMessages(sessionId);
  const newMessage: LocalChatMessage = {
    id: generateId(),
    sessionId,
    role,
    content,
    toolInvocations,
    createdAt: Date.now(),
  };
  await set(`${MESSAGES_PREFIX}${sessionId}`, [...messages, newMessage]);
  return newMessage;
}

export async function getAllLocalData(): Promise<{
  sessions: LocalChatSession[];
  messages: Record<string, LocalChatMessage[]>;
}> {
  const sessions = await getLocalSessions();
  const messages: Record<string, LocalChatMessage[]> = {};

  for (const session of sessions) {
    messages[session.id] = await getLocalMessages(session.id);
  }

  return { sessions, messages };
}

export async function clearAllLocalData(): Promise<void> {
  const allKeys = await keys();
  for (const key of allKeys) {
    if (
      key === SESSIONS_KEY ||
      (typeof key === "string" && key.startsWith(MESSAGES_PREFIX))
    ) {
      await del(key);
    }
  }
}
