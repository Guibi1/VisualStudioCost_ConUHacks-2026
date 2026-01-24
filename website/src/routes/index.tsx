import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Page });

function Page() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
            <div>VSCost</div>
            <Button render={<Link to="/dashboard" />} nativeButton={false}>
                Dashboard
            </Button>
        </div>
    );
}
