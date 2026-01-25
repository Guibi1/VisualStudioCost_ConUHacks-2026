import { createFileRoute, Link } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/")({ component: Dashboard });

// budgetValue = budget UTILISÉ, dailyBudget = budget souhaité
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
    { date: "2026-01-01", repo: 24.87, repo2: 19.42 },
    { date: "2026-01-02", repo: 27.13, repo2: 21.05 },
    { date: "2026-01-03", repo: 25.64, repo2: 22.31 },
    { date: "2026-01-04", repo: 28.02, repo2: 23.88 },
]; //TODO remplacer data exemple chatgpt en connectant avec emil

function Dashboard() {
    return (
        <div className="space-y-8 p-8 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white">
            {/* Budget & Chart */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="bg-neutral-900/80 text-white border border-white/10 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle>Coût par utilisateur par commit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={commitData} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                    <YAxis
                                        stroke="rgba(255,255,255,0.5)"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) => `${value.toFixed(2)}$`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => `${value.toFixed(2)}$`}
                                        contentStyle={{
                                            backgroundColor: "#0f172a",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "8px",
                                            color: "white",
                                        }}
                                        labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="repo"
                                        stroke="#3b82f6"
                                        strokeWidth={2.5}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 5 }}
                                        name="Repo $/commit"
                                    />

                                    <Line
                                        type="monotone"
                                        dataKey="repo2"
                                        stroke="#10b981"
                                        strokeWidth={2.5}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 5 }}
                                        name="Repo2 $/commit"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900/80 text-white border border-white/10 shadow-md hover:shadow-lg transition-shadow">
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
                    <Tabs defaultValue="deprecated" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="deprecated">Alerte de deprecated model</TabsTrigger>
                            <TabsTrigger value="loop">Alerte de loop</TabsTrigger>
                            <TabsTrigger value="thinking">Alerte de thinking</TabsTrigger>
                            <TabsTrigger value="caching">Alerte de caching</TabsTrigger>
                        </TabsList>

                        <TabsContent value="deprecated">
                            <div className="space-y-3">
                                <Item variant="outline">
                                    <ItemContent>
                                        <ItemTitle>Deprecated AI Model</ItemTitle>
                                        <ItemDescription>
                                            Commit uses an outdated AI model. Upgrade recommended.
                                        </ItemDescription>
                                    </ItemContent>

                                    <ItemActions>
                                        <Button variant="outline" size="sm">
                                            View commit
                                        </Button>
                                    </ItemActions>
                                </Item>
                            </div>
                        </TabsContent>

                        <TabsContent value="loop">
                            <div className="space-y-3">
                                <Item variant="outline">
                                    <ItemContent>
                                        <ItemTitle>Loop problem</ItemTitle>
                                        <ItemDescription>
                                            Repeated execution detected without state change.
                                        </ItemDescription>
                                    </ItemContent>

                                    <ItemActions>
                                        <Button variant="outline" size="sm">
                                            Inspect
                                        </Button>
                                    </ItemActions>
                                </Item>
                            </div>
                        </TabsContent>

                        <TabsContent value="thinking">
                            <div className="space-y-3">
                                <Item variant="outline">
                                    <ItemContent>
                                        <ItemTitle>Thinking problem</ItemTitle>
                                        <ItemDescription>
                                            Model spent unusually long in reasoning phase.
                                        </ItemDescription>
                                    </ItemContent>

                                    <ItemActions>
                                        <Button variant="outline" size="sm">
                                            Details
                                        </Button>
                                    </ItemActions>
                                </Item>
                            </div>
                        </TabsContent>

                        <TabsContent value="caching">
                            <div className="space-y-3">
                                <Item variant="outline">
                                    <ItemContent>
                                        <ItemTitle>Cache Opportunity</ItemTitle>
                                        <ItemDescription>
                                            Similar requests detected. Caching could reduce cost.
                                        </ItemDescription>
                                    </ItemContent>

                                    <ItemActions>
                                        <Button variant="outline" size="sm">
                                            Enable cache
                                        </Button>
                                    </ItemActions>
                                </Item>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
