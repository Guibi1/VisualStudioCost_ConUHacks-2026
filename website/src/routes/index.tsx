import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Page });

function Page() {
    return (
        <div className="flex h-full flex-col items-center justify-center px-6">
            <div className="max-w-xl space-y-6 text-center">
                {/* Logo + title */}
                <div className="flex items-center justify-center gap-4">
                    <img src="/logo.png" alt="VSCost logo" className="mt-1 h-12 w-12" />
                    <h1 className="font-bold text-4xl tracking-tight">VSCost</h1>
                </div>

                <p className="text-muted-foreground">Track, visualize, and understand your costs over time.</p>

                <Button size="lg" render={<Link to="/dashboard" />} nativeButton={false}>
                    Open Dashboard
                </Button>

                <div className="mt-10 grid grid-cols-1 gap-4 text-muted-foreground text-sm sm:grid-cols-3">
                    <div>📊 Cost breakdowns</div>
                    <div>⏱ Real-time updates</div>
                    <div>📈 Historical trends</div>
                </div>
            </div>
        </div>
    );
}
