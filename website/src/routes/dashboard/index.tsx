import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/dashboard/")({ component: Dashboard });

const budgetValue = 65; // exemple chatgpt 65% du budget utilisé

const commitData = [
    { date: "2026-01-01", userA: 50, userB: 30 },
    { date: "2026-01-02", userA: 80, userB: 40 },
    { date: "2026-01-03", userA: 60, userB: 50 },
    { date: "2026-01-04", userA: 90, userB: 70 },
]; // data exemple chatgpt

function Dashboard() {
    return (
        <div className="space-y-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Budget Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={budgetValue} />
                    <p className="text-sm text-muted-foreground">{budgetValue}% of your budget used</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Revenue per User by Commits</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={commitData} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="userA" stroke="#3b82f6" name="User A $/commit" />
                                <Line type="monotone" dataKey="userB" stroke="#10b981" name="User B $/commit" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
