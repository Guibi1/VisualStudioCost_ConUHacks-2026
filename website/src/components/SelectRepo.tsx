import { LoaderCircle } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
import { api } from "vscost-convex/_generated/api";
import { useRepo, useRepoId } from "@/components/RepoProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SelectRepo() {
    const [repoId, setRepoId] = useRepoId();
    const repo = useRepo();
    const repositories = useQuery(api.repositories.getUserRepos, {});

    return (
        <Select value={repoId} onValueChange={(v) => setRepoId?.(v)}>
            <SelectTrigger className="w-full min-w-3xs">
                {repo ? (
                    <SelectValue>
                        {repo.owner}/{repo.repo}
                    </SelectValue>
                ) : (
                    <SelectValue placeholder="Select a repository" />
                )}
            </SelectTrigger>

            <SelectContent>
                {repositories ? (
                    repositories.map((repo) => (
                        <SelectItem key={repo._id} value={repo._id}>
                            {repo.owner}/{repo.repo}
                        </SelectItem>
                    ))
                ) : (
                    <div className="grid size-full place-items-center">
                        <HugeiconsIcon icon={LoaderCircle} className="animate-spin" />
                    </div>
                )}
            </SelectContent>
        </Select>
    );
}
