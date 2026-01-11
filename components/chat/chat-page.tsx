"use client";

import { type UIMessage, useChat } from "@ai-sdk/react";
import { IconEdit, IconMenu2, IconRobot } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatSkeleton } from "@/components/chat/chat-skeleton";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  type ChatSession,
  type ChatMessage as StoredChatMessage,
  useChatStore,
} from "@/lib/hooks/use-chat-store";

interface ChatPageProps {
  initialSessions: ChatSession[];
  initialMessages: StoredChatMessage[];
  initialSessionId?: string;
}

function convertToUIMessages(messages: StoredChatMessage[]): UIMessage[] {
  return messages.map((msg) => {
    const parts: UIMessage["parts"] = [];

    if (msg.content) {
      parts.push({ type: "text" as const, text: msg.content });
    }

    if (msg.toolInvocations) {
      try {
        const toolParts = JSON.parse(msg.toolInvocations);
        parts.push(...toolParts);
      } catch {}
    }

    return {
      id: msg._id,
      role: msg.role,
      parts,
    };
  });
}

export function ChatPage({
  initialSessions,
  initialMessages,
  initialSessionId,
}: ChatPageProps) {
  const router = useRouter();
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    deleteSession,
    currentSession,
    messages: storedMessages,
    addMessage,
    updateSessionTitle,
    isAuthReady,
    isAnonymous,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const initializedRef = useRef(false);

  const canUpload = !isAnonymous;

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveAttachment = useMutation(api.files.saveAttachment);

  const displaySessions = sessions.length > 0 ? sessions : initialSessions;
  const activeSessionId = currentSessionId || initialSessionId || null;

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: activeSessionId || "default",
    onFinish: async ({ message }: { message: UIMessage }) => {
      if (activeSessionId && message.role === "assistant") {
        const textParts = message.parts.filter(
          (p): p is { type: "text"; text: string } => p.type === "text",
        );
        const textContent = textParts.map((p) => p.text).join("");

        const toolParts = message.parts.filter((p) =>
          p.type.startsWith("tool-"),
        );
        const toolInvocations =
          toolParts.length > 0 ? JSON.stringify(toolParts) : undefined;

        await addMessage(
          activeSessionId,
          "assistant",
          textContent,
          toolInvocations,
        );
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const prevSessionIdRef = useRef<string | null>(null);
  const hasSyncedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <needed>
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!initializedRef.current && initialSessionId) {
      initializedRef.current = true;
      setCurrentSessionId(initialSessionId);
      if (initialMessages.length > 0) {
        setMessages(convertToUIMessages(initialMessages));
        hasSyncedRef.current = true;
      }
    }
  }, [initialSessionId, initialMessages, setCurrentSessionId, setMessages]);

  useEffect(() => {
    const sessionChanged = prevSessionIdRef.current !== activeSessionId;

    if (sessionChanged) {
      prevSessionIdRef.current = activeSessionId;
      hasSyncedRef.current = false;
    }

    if (
      activeSessionId &&
      storedMessages.length > 0 &&
      !hasSyncedRef.current &&
      !isLoading
    ) {
      setMessages(convertToUIMessages(storedMessages));
      hasSyncedRef.current = true;
    }

    if (
      sessionChanged &&
      storedMessages.length === 0 &&
      !initialMessages.length
    ) {
      setMessages([]);
    }
  }, [
    activeSessionId,
    storedMessages,
    setMessages,
    isLoading,
    initialMessages.length,
  ]);

  useEffect(() => {
    if (
      !activeSessionId &&
      !isLoading &&
      !isCreatingSession &&
      isAuthReady &&
      displaySessions !== undefined
    ) {
      if (displaySessions.length > 0) {
        const latestSession = displaySessions[0];
        setCurrentSessionId(latestSession._id);
        router.push(`/chat/${latestSession._id}`);
      } else {
        setIsCreatingSession(true);
        createSession()
          .then((id) => {
            setCurrentSessionId(id);
            router.push(`/chat/${id}`);
          })
          .finally(() => {
            setIsCreatingSession(false);
          });
      }
    }
  }, [
    activeSessionId,
    isLoading,
    isCreatingSession,
    isAuthReady,
    displaySessions,
    createSession,
    setCurrentSessionId,
    router,
  ]);

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    router.push(`/chat/${id}`);
    setSidebarOpen(false);
  };

  const handleNewChat = async () => {
    const id = await createSession();
    setCurrentSessionId(id);
    setMessages([]);
    router.push(`/chat/${id}`);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    if (id === activeSessionId) {
      setMessages([]);
      router.push("/chat");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && files.length === 0) || !activeSessionId) return;

    const userMessage = input;
    setInput("");

    const uploadedAttachments: Id<"chatAttachments">[] = [];

    if (files.length > 0 && canUpload) {
      setIsUploading(true);
      try {
        for (const file of files) {
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          const { storageId } = await response.json();
          const attachmentId = await saveAttachment({
            storageId,
            filename: file.name,
            contentType: file.type,
            size: file.size,
          });
          uploadedAttachments.push(attachmentId);
        }
      } catch (error) {
        console.error("Upload failed:", error);
      } finally {
        setIsUploading(false);
        setFiles([]);
      }
    }

    const messageContent =
      userMessage ||
      (files.length > 0 ? `[${files.length} file(s) attached]` : "");
    await addMessage(activeSessionId, "user", messageContent);

    const isFirstMessage = storedMessages.length === 0 && messages.length === 0;
    if (isFirstMessage && messageContent) {
      const title =
        messageContent.slice(0, 30) + (messageContent.length > 30 ? "..." : "");
      await updateSessionTitle(activeSessionId, title);
    }

    const messageParts: UIMessage["parts"] = [];
    if (userMessage) {
      messageParts.push({ type: "text", text: userMessage });
    }

    sendMessage({
      role: "user",
      parts:
        messageParts.length > 0 ? messageParts : [{ type: "text", text: "" }],
    });
  };

  const displayMessages = messages;
  const activeSession =
    currentSession || displaySessions.find((s) => s._id === activeSessionId);

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      <ChatSidebar
        sessions={displaySessions.map((s) => ({
          id: s._id,
          title: s.title,
          createdAt: s.createdAt,
        }))}
        currentSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
      />

      <div className="flex flex-1 flex-col h-full relative">
        <header className="flex h-14 items-center gap-2 border-b px-3 md:px-4 lg:px-6 shrink-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <IconMenu2 />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          <div className="flex-1 flex items-center justify-center md:justify-start">
            <Button
              variant="ghost"
              onClick={handleNewChat}
              className="md:hidden h-10 px-3"
            >
              <IconEdit className="mr-2 h-4 w-4" />
              New Chat
            </Button>
            <div className="hidden md:block font-medium truncate max-w-[200px] lg:max-w-md">
              {activeSession?.title || "New Chat"}
            </div>
          </div>

          <ModeToggle />
        </header>

        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden cursor-default transition-all duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-col pb-32 md:pb-28">
            {displayMessages.length === 0 ? (
              <div className="flex h-[50vh] flex-col items-center justify-center text-center px-4">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <IconRobot size={48} className="text-primary" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">
                  How can I help you today?
                </h2>
              </div>
            ) : (
              <>
                {displayMessages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isLoading &&
                  displayMessages.length > 0 &&
                  displayMessages[displayMessages.length - 1].role ===
                    "user" && <ChatSkeleton />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </main>

        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background via-background to-transparent pt-10">
          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={
              status === "streaming" || status === "submitted" || isUploading
            }
            onSubmit={handleSubmit}
            stop={stop}
            canUpload={canUpload}
            files={files}
            onFilesChange={setFiles}
          />
        </div>
      </div>
    </div>
  );
}
