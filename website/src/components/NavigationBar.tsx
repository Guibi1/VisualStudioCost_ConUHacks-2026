import { useAuthActions } from "@convex-dev/auth/react";
import { LoginSquare01Icon, LogoutSquare01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, useQuery } from "real-convex/react";
import { api } from "vscost-convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function NavigationBar() {
    const { signIn, signOut } = useAuthActions();
    const user = useQuery(api.auth.currentUser);

    return (
        <div className="container mx-auto flex h-18 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
                <h1>VS Cost</h1>
            </Link>

            <div className="flex items-center gap-2">
                <Authenticated>
                    <p>Hello {user?.name}</p>
                    <Button render={<Link to="/" />} nativeButton={false} onClick={() => signOut()}>
                        Sign out
                        <HugeiconsIcon icon={LogoutSquare01Icon} />
                    </Button>
                </Authenticated>

                <Unauthenticated>
                    <Button onClick={() => signIn("discord")}>
                        Se connecter
                        <HugeiconsIcon icon={LoginSquare01Icon} />
                    </Button>
                </Unauthenticated>
            </div>
        </div>
    );
}
