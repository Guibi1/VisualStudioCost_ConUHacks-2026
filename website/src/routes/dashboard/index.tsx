import { LoaderCircle } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { api } from "vscost-convex/_generated/api";
import { aggregateCostsCalls } from "vscost-convex/github";
import type { AnalysisResult } from "vscost-parser";
import { useRepo } from "@/components/RepoProvider";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from "@/components/ui/code";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/dashboard/")({ component: Dashboard });

// budgetValue = budget UTILISÉ, dailyBudget = budget souhaité
const budgetValue = 105; //TODO remplacer exemple chatgpt
const niveauWarning = 90; // % pour afficher le budget en jaune

const dailyBudget = 100; //TODO remplacer exemple chatgpt
const usedBudget = (budgetValue / 100) * dailyBudget;
const remainingBudget = dailyBudget - usedBudget;
const budgetStatusText =
    remainingBudget >= 0
        ? `${remainingBudget.toFixed(2)}$ left for today`
        : `${Math.abs(remainingBudget).toFixed(2)}$ of overflow today`;

const budgetLabel =
    budgetValue < niveauWarning ? "Respect the budget" : budgetValue < 100 ? "Careful" : "Budget exceeded!";

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
    const fullCommits = useQuery(
        api.repositories.complete_commits_query,
        repo?.latest ? { owner: repo.owner, repo: repo.repo } : "skip",
    );
    const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const selectedCommitFull = useMemo(() => {
        const fc = fullCommits?.find((c) => c.sha === selectedCommit) ?? fullCommits?.[1];

        if (!fc) return null;
        return {
            ...fc,
            analysis: commits.find((cc) => cc.commit_hash === fc.sha)?.analysis,
        };
    }, [selectedCommit, fullCommits, commits]);
    const selectedFileFull = useMemo(
        () => ({
            ...selectedCommitFull?.files.find((f) => f.filename === selectedFile),
            analysis: selectedCommitFull?.analysis?.files.find((f) => f.file_path === selectedFile),
        }),
        [selectedCommitFull, selectedFile],
    );

    if (!repo || !commits || !fullCommits) return null;
    console.log(selectedCommitFull);
    // Sum up the total cost from commits
    const totalCostUsed = commits.reduce((acc, c) => acc + c.total.cost, 0);

    // Daily budget from repo
    const dailyBudget = repo?.costLimit ?? 100;

    // Compute remaining / overbudget
    const remainingBudget = dailyBudget - totalCostUsed;
    const overBudget = Math.max(totalCostUsed - dailyBudget, 0);

    // Status text
    const budgetStatusText =
        remainingBudget >= 0
            ? `${remainingBudget.toFixed(2)}$ left for today`
            : `${overBudget.toFixed(2)}$ of overflow today`;

    const budgetLabel =
        totalCostUsed < dailyBudget * 0.9
            ? "Within budget"
            : totalCostUsed <= dailyBudget
              ? "Careful"
              : "Budget exceeded!";

    if (!repo || !commits) return null;
    console.log(commits);

    return (
        <div className="space-y-8 bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-8 text-white">
            {/* Budget & Chart */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="border border-white/10 bg-neutral-900/80 text-white shadow-md transition-shadow hover:shadow-lg">
                    <CardContent className="space-y-8">
                        <div>
                            <h3 className="mb-2 font-semibold text-lg">Cost per User per Commit</h3>
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
                            <h3 className="mb-2 font-semibold text-lg">Callsites per User per Commit</h3>
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
                        <CardTitle>Budget Usage</CardTitle>
                    </CardHeader>
                    <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
                        <ResponsiveContainer width={200} height={200}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: "Used", value: Math.min(totalCostUsed, dailyBudget) },
                                        { name: "Remaining", value: Math.max(dailyBudget - totalCostUsed, 0) },
                                        { name: "Over", value: overBudget }, // only if > 0
                                    ].filter((d) => d.value > 0)}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {totalCostUsed <= dailyBudget && <Cell fill="#16a34a" />}
                                    {remainingBudget > 0 && <Cell fill="rgba(255,255,255,0.1)" />}
                                    {overBudget > 0 && <Cell fill="#dc2626" />}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        <div
                            className={`text-center font-bold text-3xl ${
                                remainingBudget >= 0 ? "text-green-700" : "text-red-700"
                            }`}
                        >
                            {budgetStatusText}
                        </div>

                        <p className="text-center text-muted-foreground text-sm">
                            {totalCostUsed.toFixed(2)}$ of {dailyBudget}$ used · {budgetLabel}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Alerts */}
            <Card className="bg-card text-card-foreground">
                <CardHeader>
                    <CardTitle>AI usage par commit</CardTitle>
                    <CardAction>
                        <Select value={selectedCommit} onValueChange={(v) => setSelectedCommit(v)}>
                            <SelectTrigger className="w-full min-w-3xs">
                                {selectedCommitFull ? (
                                    <SelectValue>{selectedCommitFull.sha}</SelectValue>
                                ) : (
                                    <SelectValue placeholder="Select a commit" />
                                )}
                            </SelectTrigger>

                            <SelectContent>
                                {fullCommits ? (
                                    fullCommits.map((commit) => (
                                        <SelectItem key={commit.sha} value={commit.sha}>
                                            {commit.sha}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="grid size-full place-items-center">
                                        <HugeiconsIcon icon={LoaderCircle} className="animate-spin" />
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    {selectedCommitFull && (
                        <div className="flex max-h-120">
                            <div className="w-40">
                                <SidebarProvider>
                                    <SidebarContent>
                                        <SidebarGroup>
                                            <SidebarGroupLabel>Files</SidebarGroupLabel>
                                            <SidebarGroupContent>
                                                <SidebarMenu>
                                                    {selectedCommitFull.analysis?.files.map((file) => (
                                                        <SidebarMenuItem key={file.file_path}>
                                                            <SidebarMenuButton
                                                                onClick={() => setSelectedFile(file.file_path)}
                                                            >
                                                                {file.file_path}
                                                            </SidebarMenuButton>
                                                        </SidebarMenuItem>
                                                    ))}
                                                </SidebarMenu>
                                            </SidebarGroupContent>
                                        </SidebarGroup>
                                    </SidebarContent>
                                </SidebarProvider>
                            </div>

                            <div className="min-h-0 flex-1 gap-4 overflow-y-scroll">
                                {selectedFileFull.content && (
                                    <Code
                                        code={selectedFileFull.content}
                                        language="tsx"
                                        lines={
                                            selectedFileFull.analysis?.call_sites.map(
                                                (callSite) => callSite.position.line,
                                            ) ?? []
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
