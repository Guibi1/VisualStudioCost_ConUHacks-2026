import { useMutation, useQuery } from "convex/react";
import { useId, useState } from "react";
import { api } from "vscost-convex/_generated/api";

import { useRepo } from "@/components/RepoProvider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
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
    const [repo] = useRepo();
    const setSettings = useMutation(api.repositories.setSettings);
    const limits = useQuery(api.repositories.limits, repo ?? "skip");
    const [callsLimit, setCallsLimit] = useState(limits?.calls ?? 0);
    const [costLimit, setCostLimit] = useState(limits?.cost ?? 0);

    if (!limits || !repo) {
        return <Button disabled>Open Settings Dialog</Button>;
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger render={<Button>Open Settings Dialog</Button>} />

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Repository Settings</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="flex flex-col gap-4">
                    <div className="mx-auto grid w-full max-w-xs gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={costId}>Cost threshold</Label>
                            <span className="text-muted-foreground text-sm">{costLimit.toFixed(2)}$/1M tokens</span>
                        </div>
                        <Slider
                            id={costId}
                            value={costLimit}
                            onValueChange={(v) => setCostLimit(+v)}
                            min={0}
                            max={300}
                            step={5}
                        />
                    </div>

                    <div className="mx-auto grid w-full max-w-xs gap-3">
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
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setSettings({ ...repo, callsLimit, costLimit })}>
                        Save
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
