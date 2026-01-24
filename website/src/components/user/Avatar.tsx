import type { Doc } from "vscost-convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserAvatar({ user }: { user: Doc<"users"> }) {
    return (
        <Avatar>
            <AvatarImage src={user.image} alt={user.name} />
            <AvatarFallback>{user.name[0].toUpperCase()}</AvatarFallback>
        </Avatar>
    );
}
