import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ReactNode } from "react";
import { ConvexReactClient } from "real-convex/react";

const convexClient = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export default function AppConvexProvider({ children }: { children: ReactNode }) {
    return <ConvexAuthProvider client={convexClient}>{children}</ConvexAuthProvider>;
}
