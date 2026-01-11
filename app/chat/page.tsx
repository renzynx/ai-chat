import { ChatPage } from "@/components/chat/chat-page";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";

export default async function ChatBasePage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <ChatPage initialSessions={[]} initialMessages={[]} />;
  }

  const sessions = await fetchAuthQuery(api.chat.getSessions, {});
  const latestSession = sessions[0];
  const initialMessages = latestSession
    ? await fetchAuthQuery(api.chat.getMessages, {
        sessionId: latestSession._id,
      })
    : [];

  return (
    <ChatPage
      initialSessions={sessions}
      initialMessages={initialMessages}
      initialSessionId={latestSession?._id}
    />
  );
}
