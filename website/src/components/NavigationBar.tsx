import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "vscost-convex/_generated/api";

import SelectRepo from "@/components/SelectRepo";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import { LoginSquare01Icon, LogoutSquare01Icon, NodeAddIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Separator } from "./ui/separator";

export default function NavigationBar() {
    const { signIn, signOut } = useAuthActions();
    const user = useQuery(api.auth.currentUser);

    return (
        <>
            <div className="container mx-auto flex h-16 items-center justify-between pt-2">
                <Link to="/" className="flex items-center gap-2">
                    <h1 className="font-bold text-2xl">VS Cost</h1>
                </Link>

                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <SelectRepo />

                            <Popover>
                                <PopoverTrigger>
                                    <UserAvatar user={user} />
                                </PopoverTrigger>

                                <PopoverContent>
                                    <PopoverHeader>
                                        <PopoverTitle>{user.name}</PopoverTitle>
                                        <PopoverDescription>{user.email}</PopoverDescription>
                                    </PopoverHeader>

                                    <Button
                                        variant="outline"
                                        render={<Link to="/" />}
                                        nativeButton={false}
                                        onClick={() => signOut()}
                                    >
                                        Sign out
                                        <HugeiconsIcon icon={LogoutSquare01Icon} />
                                    </Button>

                                    <Separator />

                                    <Button
                                        render={
                                            <a
                                                href="https://github.com/apps/vs-cost/installations/select_target"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                <HugeiconsIcon icon={NodeAddIcon} />
                                                Manage repositories
                                            </a>
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => signIn("github")}>
                                Login
                                <HugeiconsIcon icon={LoginSquare01Icon} />
                            </Button>
                        </>
                    )}
                </div>
            </div>
            <hr className="border-muted-foreground" />
        </>
    );
}
