import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Page });

function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">VSCost</h1>

        <p className="text-muted-foreground">
          Visualiser, suivre et comprendre vos coûts en temps réel.
        </p>

        <Button
          size="lg"
          render={<Link to="/dashboard" />}
          nativeButton={false}
        >
          Ouvrir Dashboard
        </Button>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm text-muted-foreground">
          <div>📊 Répartition des coûts</div>
          <div>⏱ Mises à jour en temps réel</div>
          <div>📈 Évolution temporelle et tendances</div>
        </div>
      </div>
    </div>
  );
}