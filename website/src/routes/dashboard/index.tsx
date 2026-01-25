import { createFileRoute, Link } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export const Route = createFileRoute("/dashboard/")({ component: Dashboard });

const budgetValue = 105; //TODO remplacer exemple chatgpt
const niveauWarning = 90; // % pour afficher le budget en jaune

const dailyBudget = 100; //TODO remplacer exemple chatgpt
const usedBudget = (budgetValue / 100) * dailyBudget;
const remainingBudget = dailyBudget - usedBudget;
const budgetStatusText =
    remainingBudget >= 0
        ? `${remainingBudget.toFixed(2)}$ restant aujourd'hui`
        : `${Math.abs(remainingBudget).toFixed(2)}$ de dépassement aujourd'hui`;

const budgetLabel =
    budgetValue < niveauWarning ? "Respecte le budget" : budgetValue < 100 ? "Attention" : "Budget dépassé!";

const progressColorClass =
  budgetValue > 100
    ? "[&>div]:bg-red-600"
    : budgetValue >= niveauWarning
    ? "[&>div]:bg-yellow-500"
    : "[&>div]:bg-blue-600";

const commitData = [
    { date: "2026-01-01", repo: 50, repo2: 30 },
    { date: "2026-01-02", repo: 80, repo2: 40 },
    { date: "2026-01-03", repo: 60, repo2: 50 },
    { date: "2026-01-04", repo: 90, repo2: 70 },
]; //TODO remplacer data exemple chatgpt en connectant avec emil

function Dashboard() {
    return (
    <div className="space-y-6 p-6 bg-black text-white">
      {/* Budget & Chart */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Coût par utilisateur par commit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={commitData} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="white" />
                  <YAxis stroke="white" />
                  <Tooltip />
                  <Line type="monotone" dataKey="repo" stroke="#3b82f6" name="Repo $/commit" />
                  <Line type="monotone" dataKey="repo2" stroke="#10b981" name="Repo2 $/commit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>Utilisation budget</CardTitle>
          </CardHeader>
          <CardContent className="grid h-full grid-rows-[1fr_auto_auto] gap-3">
            <div
              className={`flex items-center justify-center text-center text-3xl font-bold ${
                remainingBudget >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {budgetStatusText}
            </div>

            <Progress
              value={Math.min(budgetValue, 100)}
              className={`${progressColorClass} bg-[var(--background)] [&>div]:rounded-md`}
            />

            <p className="text-sm text-muted-foreground text-center">
              {budgetValue}% du budget est utilisé · {budgetLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Alerts */}
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deprecated" className="w-full">
            <TabsList>
              <TabsTrigger value="deprecated">Deprecated Models</TabsTrigger>
              <TabsTrigger value="loop">Loops</TabsTrigger>
              <TabsTrigger value="thinking">Thinking</TabsTrigger>
              <TabsTrigger value="caching">Caching</TabsTrigger>
            </TabsList>

            <TabsContent value="deprecated">
              <p className="text-sm text-muted-foreground">No deprecated model alerts yet.</p>
            </TabsContent>
            <TabsContent value="loop">
              <p className="text-sm text-muted-foreground">No loop alerts yet.</p>
            </TabsContent>
            <TabsContent value="thinking">
              <p className="text-sm text-muted-foreground">No thinking alerts yet.</p>
            </TabsContent>
            <TabsContent value="caching">
              <p className="text-sm text-muted-foreground">No caching alerts yet.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
