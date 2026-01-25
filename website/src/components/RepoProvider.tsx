import { useQuery } from "convex/react";
import { createContext, type Dispatch, type ReactNode, use, useState } from "react";
import { api } from "vscost-convex/_generated/api";
import type { DataModel, Id } from "vscost-convex/_generated/dataModel";

export type Repo = DataModel["repositories"]["document"];

const context = createContext<[Id<"repositories"> | null, Dispatch<Id<"repositories"> | null>] | null>(null);

export default function RepoProvider({ children }: { children: ReactNode }) {
    const value = useState<Id<"repositories"> | null>(null);
    return <context.Provider value={value}>{children}</context.Provider>;
}

export function useRepoId() {
    const value = use(context);
    if (!value) throw new Error("useRepo was called outside of a RepoProvider.");
    return value;
}

export function useRepo() {
    const repositories = useQuery(api.repositories.getUserRepos, {});
    if (!repositories) return null;
    const value = use(context);
    if (!value) throw new Error("useRepo was called outside of a RepoProvider.");
    return value[0] ? (repositories.find((r) => r._id === value[0]) ?? null) : null;
}
