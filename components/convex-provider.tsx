"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { type ReactNode, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const convexQueryClient = new ConvexQueryClient(convex);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});

convexQueryClient.connect(queryClient);

function AnonymousAuthHandler({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const signInAttempted = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !signInAttempted.current) {
      signInAttempted.current = true;
      authClient.signIn.anonymous();
    }
  }, [isLoading, isAuthenticated]);

  return <>{children}</>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <QueryClientProvider client={queryClient}>
        <AnonymousAuthHandler>{children}</AnonymousAuthHandler>
      </QueryClientProvider>
    </ConvexBetterAuthProvider>
  );
}
