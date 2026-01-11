import { redirect } from "next/navigation";
import { ChatPage } from "@/components/chat/chat-page";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

function isLocalId(id: string): boolean {
  return id.startsWith("local-");
}

export default async function ChatDynamicPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  if (isLocalId(chatId)) {
    return (
      <ChatPage
        initialSessions={[]}
        initialMessages={[]}
        initialSessionId={chatId}
      />
    );
  }

  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/chat");
  }

  try {
    const [sessions, session] = await Promise.all([
      fetchAuthQuery(api.chat.getSessions, {}),
      fetchAuthQuery(api.chat.getSession, {
        sessionId: chatId as Id<"chatSessions">,
      }),
    ]);

    if (!session) {
      redirect("/chat");
    }

    const messages = await fetchAuthQuery(api.chat.getMessages, {
      sessionId: chatId as Id<"chatSessions">,
    });

    return (
      <ChatPage
        initialSessions={sessions}
        initialMessages={messages}
        initialSessionId={chatId}
      />
    );
  } catch {
    redirect("/chat");
  }
}
