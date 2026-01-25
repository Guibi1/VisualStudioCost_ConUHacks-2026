import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "vscost-convex/_generated/api";
import { aggregateCostsCalls } from "vscost-convex/github";
import type { AnalysisResult } from "vscost-parser";
import { useRepo } from "@/components/RepoProvider";
import SettingsDialog from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

function Dashboard() {
    const repo = useRepo();
    const rawCommits = useQuery(
        api.repositories.getCommits,
        repo?.latest ? { owner: repo.owner, repo: repo.repo } : "skip",
    );
    const commits = useMemo(
        () =>
            rawCommits
                ? rawCommits.map((c) => {
                      const analysis = JSON.parse(c.analysis) as AnalysisResult;
                      const total = aggregateCostsCalls(analysis);
                      return {
                          ...c,
                          date: new Date(c.date).toDateString(),
                          analysis,
                          total,
                          limits: { cost: repo?.costLimit ?? 0, calls: repo?.callsLimit ?? 0 },
                      };
                  })
                : [],
        [rawCommits, repo],
    );

    if (!repo || !commits) return null;
    console.log(commits);

    return (
        <div className="space-y-8 bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-8 text-white">
            {/* Budget & Chart */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="border border-white/10 bg-neutral-900/80 text-white shadow-md transition-shadow hover:shadow-lg">
                    <CardContent className="space-y-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Cost per User per Commit</h3>
                            {/* Cost Chart */}
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={commits} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                        <YAxis
                                            stroke="rgba(255,255,255,0.5)"
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) => `$${value.toFixed(2)}`}
                                            domain={["dataMin", "dataMax"]}
                                        />
                                        <Tooltip
                                            formatter={(
                                                value: number | undefined,
                                                name: string | undefined,
                                                props,
                                            ): [string, string] | null => {
                                                if (value === undefined) return null;
                                                return [`$${value.toFixed(2)}`, "Cost ($/1M tokens)"];
                                            }}
                                            contentStyle={{
                                                backgroundColor: "#0f172a",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: "8px",
                                                color: "white",
                                            }}
                                            labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                                        />
                                        <defs>
                                            <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            dataKey="total.cost"
                                            type="monotone"
                                            fill="url(#fillCost)"
                                            fillOpacity={0.4}
                                            stroke="var(--chart-1)"
                                        />
                                        <Area
                                            dataKey="limits.cost"
                                            stroke="var(--destructive)"
                                            fill="transparent"
                                            strokeDasharray="5 5"
                                            activeDot={{ r: 0 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Calls Chart */}
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Callsites per User per Commit</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={commits} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                        <YAxis
                                            stroke="rgba(255,255,255,0.5)"
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) => value.toString()}
                                            domain={["dataMin", "dataMax"]}
                                        />
                                        <Tooltip
                                            formatter={(
                                                value: number | undefined,
                                                name: string | undefined,
                                                props,
                                            ): [string, string] | null => {
                                                if (value === undefined) return null;
                                                return [`${value.toString()}`, "Callsites"];
                                            }}
                                            contentStyle={{
                                                backgroundColor: "#0f172a",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: "8px",
                                                color: "white",
                                            }}
                                            labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                                        />
                                        <defs>
                                            <linearGradient id="fillCalls" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            dataKey="total.calls"
                                            type="monotone"
                                            fill="url(#fillCalls)"
                                            fillOpacity={0.4}
                                            stroke="var(--chart-2)"
                                        />
                                        <Area
                                            dataKey="limits.calls"
                                            stroke="var(--destructive)"
                                            fill="transparent"
                                            strokeDasharray="5 5"
                                            activeDot={{ r: 0 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 bg-neutral-900/80 text-white shadow-md transition-shadow hover:shadow-lg">
                    <CardHeader>
                        <CardTitle>Utilisation budget</CardTitle>
                        <CardAction>
                            <SettingsDialog />
                        </CardAction>
                    </CardHeader>

                    <Card className="border border-white/10 bg-neutral-900/80 text-white shadow-md transition-shadow hover:shadow-lg">
                      <CardHeader>
                        <CardTitle>Budget Usage</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center gap-4 h-64">
                        <ResponsiveContainer width={200} height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Used", value: budgetValue },
                                { name: "Remaining", value: Math.max(100 - budgetValue, 0) },
                              ]}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              startAngle={90}
                              endAngle={-270} // makes the chart start from top and fill clockwise
                            >
                              <Cell fill={remainingBudget >= 0 ? "#16a34a" : "#dc2626"} />
                              <Cell fill="rgba(255,255,255,0.1)" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>

                        <div className={`text-center font-bold text-3xl ${remainingBudget >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {budgetStatusText}
                        </div>

                        <p className="text-center text-muted-foreground text-sm">
                          {budgetValue}% of the budget is used · {budgetLabel}
                        </p>
                      </CardContent>
                    </Card>

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
