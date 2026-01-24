import { useAuthActions } from "@convex-dev/auth/react";
import { ForgotPasswordIcon, LoginSquare01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
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
                        <EmptyTitle>Vous n'êtes pas connecté</EmptyTitle>
                        <EmptyDescription>Commencez par vous connecter pour accéder à cette page.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="outline"
                                onClick={() => signIn("github", { redirectTo: window.location.pathname })}
                            >
                                Se connecter
                                <HugeiconsIcon icon={LoginSquare01Icon} />
                            </Button>
                            <Button render={<Link to="/" />} nativeButton={false}>
                                Retourner à la page d'accueil
                            </Button>
                        </div>
                    </EmptyContent>
                </Empty>
            </Unauthenticated>

            <AuthLoading>
                <Outlet />
            </AuthLoading>

            <Authenticated>
                <Outlet />
            </Authenticated>
        </>
    );
}
