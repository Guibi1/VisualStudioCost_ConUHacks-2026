import { useMutation, useQuery } from "convex/react";
import { useEffect, useId, useState } from "react";
import { api } from "vscost-convex/_generated/api";

import { useRepo } from "@/components/RepoProvider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function SettingsDialog() {
    const callsId = useId();
    const costId = useId();
    const repo = useRepo();
    const setSettings = useMutation(api.repositories.setSettings);
    const limits = useQuery(api.repositories.limits, repo ? { owner: repo.owner, repo: repo.repo } : "skip");
    const [callsLimit, setCallsLimit] = useState(limits?.calls ?? -1);
    const [costLimit, setCostLimit] = useState(limits?.cost ?? -1);

    useEffect(() => {
        if (limits && callsLimit === -1) {
            setCallsLimit(limits.calls);
        }
        if (limits && costLimit === -1) {
            setCostLimit(limits.cost);
        }
    }, [limits, callsLimit, costLimit]);

    if (!limits || !repo) {
        return <Button disabled>Change repository limits</Button>;
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger render={<Button>Change repository limits</Button>} />

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Repository limits</AlertDialogTitle>
                </AlertDialogHeader>

                <div className="flex flex-col gap-8">
                    <div className="mx-auto grid w-full max-w-xl gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={costId}>Cost threshold</Label>
                            <span className="text-muted-foreground text-sm">{costLimit.toFixed(2)}$/1M tokens</span>
                        </div>
                        <Slider
                            id={costId}
                            value={costLimit}
                            onValueChange={(v) => setCostLimit(+v)}
                            min={0}
                            max={200}
                            step={1}
                        />
                    </div>

                    <div className="mx-auto grid w-full max-w-xl gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={callsId}>Maximum AI callsites</Label>
                            <span className="text-muted-foreground text-sm">{callsLimit}</span>
                        </div>
                        <Slider
                            id={callsId}
                            value={callsLimit}
                            onValueChange={(v) => setCallsLimit(+v)}
                            min={0}
                            max={20}
                            step={1}
                        />
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={() => {
                            setCallsLimit(limits.calls);
                            setCostLimit(limits.cost);
                        }}
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogCancel
                        render={
                            <AlertDialogAction
                                onClick={() =>
                                    setSettings({ owner: repo.owner, repo: repo.repo, callsLimit, costLimit })
                                }
                            >
                                Save
                            </AlertDialogAction>
                        }
                    />
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
