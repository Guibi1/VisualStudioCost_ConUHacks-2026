import { useAuthActions } from "@convex-dev/auth/react";
import { ForgotPasswordIcon, GithubIcon, GitMergeIcon, LoginSquare01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useRepo } from "@/components/RepoProvider";
import SelectRepo from "@/components/SelectRepo";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export const Route = createFileRoute("/dashboard")({
    component: RouteComponent,
});

function RouteComponent() {
    const { signIn } = useAuthActions();

    return (
        <>
            <Unauthenticated>
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <HugeiconsIcon icon={ForgotPasswordIcon} />
                        </EmptyMedia>
                        <EmptyTitle>You aren't connected</EmptyTitle>
                        <EmptyDescription>Start by logging in to access your dashboard.</EmptyDescription>
                    </EmptyHeader>

                    <EmptyContent>
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => signIn("github", { redirectTo: window.location.pathname })}
                            >
                                Login
                                <HugeiconsIcon icon={LoginSquare01Icon} />
                            </Button>
                            <Button render={<Link to="/" />} nativeButton={false}>
                                Back to home
                            </Button>
                        </div>
                    </EmptyContent>
                </Empty>
            </Unauthenticated>

            <AuthLoading>
                <NoRepoGuardPage />
            </AuthLoading>

            <Authenticated>
                <NoRepoGuardPage />
            </Authenticated>
        </>
    );
}

function NoRepoGuardPage() {
    const [repo] = useRepo();
    if (repo) return <Outlet />;

    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <HugeiconsIcon icon={GitMergeIcon} />
                </EmptyMedia>
                <EmptyTitle>Select a repository</EmptyTitle>
            </EmptyHeader>

            <EmptyContent>
                <div className="flex flex-col gap-6">
                    <div className="w-sm">
                        <SelectRepo />
                    </div>

                    <div className="flex flex-col items-center">
                        Something is missing?
                        <Button
                            variant="link"
                            render={
                                <a
                                    href="https://github.com/apps/vs-cost/installations/select_target"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    <HugeiconsIcon icon={GithubIcon} />
                                    Manage GitHub connection
                                </a>
                            }
                            nativeButton={false}
                        />
                    </div>
                </div>
            </EmptyContent>
        </Empty>
    );
}
