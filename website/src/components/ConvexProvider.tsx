import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexClient = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export default function AppConvexProvider({ children }: { children: ReactNode }) {
    return <ConvexAuthProvider client={convexClient}>{children}</ConvexAuthProvider>;
}
