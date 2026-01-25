import { useRepo } from "@/components/RepoProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoaderCircle } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
import { api } from "vscost-convex/_generated/api";

export default function SelectRepo() {
    const [repo, setRepo] = useRepo();
    const repositories = useQuery(api.repositories.getUserRepos, {});

    return (
        <Select value={repo} onValueChange={(v) => setRepo?.(v)}>
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
                    <>
                        {repositories.map((repo) => (
                            <SelectItem key={repo._id} value={repo}>
                                {repo.owner}/{repo.repo}
                            </SelectItem>
                        ))}
                    </>
                ) : (
                    <div className="grid size-full place-items-center">
                        <HugeiconsIcon icon={LoaderCircle} className="animate-spin" />
                    </div>
                )}
            </SelectContent>
        </Select>
    );
}
