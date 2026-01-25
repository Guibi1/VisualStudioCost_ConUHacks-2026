import { createContext, type Dispatch, type ReactNode, use, useState } from "react";
import type { DataModel } from "vscost-convex/_generated/dataModel";

export type Repo = DataModel["repositories"]["document"];

const context = createContext<[Repo | null, Dispatch<Repo | null>] | null>(null);

export default function RepoProvider({ children }: { children: ReactNode }) {
    const value = useState<Repo | null>(null);
    return <context.Provider value={value}>{children}</context.Provider>;
}

export function useRepo() {
    const value = use(context);
    if (!value) throw new Error("useRepo was called outside of a RepoProvider.");
    return value;
}
