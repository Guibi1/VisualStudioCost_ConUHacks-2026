import { createFileRoute, Link } from "@tanstack/react-router";
//import * as React from "react";
//import { Button } from "@/components/ui/button";
//import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/dashboard/")({ component: Dashboard });


const budgetValue = 105; //TODO remplacer exemple chatgpt 
const niveauWarning = 90;  // % pour afficher le budget en jaune


const budgetLabel =
  budgetValue < niveauWarning ? "Respecte le budget"
  : budgetValue < 100 ? "Attention"
  : "Budget dépassé!";

const commitData = [
    { date: "2026-01-01", repo: 50, repo2: 30 },
    { date: "2026-01-02", repo: 80, repo2: 40 },
    { date: "2026-01-03", repo: 60, repo2: 50 },
    { date: "2026-01-04", repo: 90, repo2: 70 },
]; //TODO remplacer data exemple chatgpt en connectant avec emil

function Dashboard() {
    return (
        <div className="space-y-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Utilisation budget</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={budgetValue} />
                    <p
                        className={`text-sm ${
                            budgetLabel === "Respecte le budget"
                            ? "text-green-700"
                            : budgetLabel === "Attention"
                            ? "text-yellow-700"
                            : "text-red-700"
                        }`}
                        >
                        {budgetValue}% du budget est utilisé · {budgetLabel}
                        </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Coût par utilisateur par commit</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={commitData} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="repo" stroke="#3b82f6" name="Repo $/commit" />
                                <Line type="monotone" dataKey="repo2" stroke="#10b981" name="Repo2 $/commit" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
