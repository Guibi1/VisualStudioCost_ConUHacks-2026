import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Page });

function Page() {
    return (
        <div>
            <div>VS Code</div>

            <Button render={<Link to="/dashboard" />} nativeButton={false}>
                Dashboard
            </Button>
        </div>
    );
}
