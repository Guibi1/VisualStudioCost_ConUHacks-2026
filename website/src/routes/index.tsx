import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Page });

function Page() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-6">
        {/* Logo + title */}
        <div className="flex items-center justify-center gap-4">
          <img
            src="/logo.png"
            alt="VSCost logo"
            className="h-12 w-12 mt-1"
          />
          <h1 className="text-4xl font-bold tracking-tight">
            VSCost
          </h1>
        </div>

        <p className="text-muted-foreground">
          Track, visualize, and understand your costs over time.
        </p>

        <Button
          size="lg"
          render={<Link to="/dashboard" />}
          nativeButton={false}
        >
          Open Dashboard
        </Button>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm text-muted-foreground">
          <div>📊 Cost breakdowns</div>
          <div>⏱ Real-time updates</div>
          <div>📈 Historical trends</div>
        </div>
      </div>
    </div>
  );
}