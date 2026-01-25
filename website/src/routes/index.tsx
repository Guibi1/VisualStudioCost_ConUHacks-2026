import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Page });

function Page() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
            <div className="max-w-xl space-y-6 text-center">
                <h1 className="font-bold text-4xl tracking-tight">VSCost</h1>

                <p className="text-muted-foreground">Visualiser, suivre et comprendre vos coûts en temps réel.</p>

                <Button size="lg" render={<Link to="/dashboard" />} nativeButton={false}>
                    Ouvrir le Dashboard
                </Button>

                <div className="mt-10 grid grid-cols-1 gap-4 text-muted-foreground text-sm sm:grid-cols-3">
                    <div>📊 Répartition des coûts</div>
                    <div>⏱ Mises à jour en temps réel</div>
                    <div>📈 Évolution temporelle et tendances</div>
                </div>
            </div>
        </div>
    );
}
