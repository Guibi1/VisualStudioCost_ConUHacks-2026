import { v } from "convex/values";
import { workflow } from "..";
import { api } from "../_generated/api";

export const verify_pr = workflow.define({
    args: {
        owner: v.string(),
        repo: v.string(),
        commit_hash: v.string(),
    },
    handler: async (ctx, args): Promise<void> => {
        const limits = await ctx.runQuery(api.repositories.limits, args);
        if (!limits) return;

        const checkId = await ctx.runAction(api.github.actions.startCommitCheck, args);
        if (!checkId) return;

        const analysis = await ctx.runAction(api.github.actions.analyzeRepoFiles, args);
        await ctx.runMutation(api.repositories.addCommit, { ...args, analysis: JSON.stringify(analysis) });

        const total = analysis.files.reduce(
            (acc, file) => {
                const fn = file.functions.reduce(
                    (acc, fn) => ({
                        cost: acc.cost + fn.llm_calls.reduce((acc, call) => acc + call.cost_per_1M_tokens, 0),
                        calls: acc.calls + fn.llm_calls.length,
                    }),
                    { cost: 0, calls: 0 },
                );
                return { cost: acc.cost + fn.cost, calls: acc.calls + fn.calls };
            },
            { cost: 0, calls: 0 },
        );

        await ctx.runAction(api.github.actions.completeCommitCheck, {
            ...args,
            run_id: checkId,
            success: total.calls < limits.calls && total.cost < limits.cost,
        });
    },
});
