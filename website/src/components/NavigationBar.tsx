import { useAuthActions } from "@convex-dev/auth/react";
import { LoginSquare01Icon, LogoutSquare01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Button } from "@/components/ui/button";
import SelectRepo from "./SelectRepo";

export default function NavigationBar() {
    const { signIn, signOut } = useAuthActions();

    return (
        <>
            <div className="container mx-auto flex h-16 items-center justify-between pt-2">
                <Link to="/" className="flex items-center gap-2">
                    <h1 className="font-bold text-2xl">VS Cost</h1>
                </Link>

                <div className="flex items-center gap-2">
                    <Authenticated>
                        <SelectRepo />

                        <Button render={<Link to="/" />} nativeButton={false} onClick={() => signOut()}>
                            Sign out
                            <HugeiconsIcon icon={LogoutSquare01Icon} />
                        </Button>
                    </Authenticated>

                    <Unauthenticated>
                        <Button onClick={() => signIn("github")}>
                            Login
                            <HugeiconsIcon icon={LoginSquare01Icon} />
                        </Button>
                    </Unauthenticated>
                </div>
            </div>
            <hr className="border-muted-foreground" />
        </>
    );
}
