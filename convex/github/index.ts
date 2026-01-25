import { v } from "convex/values";
import { workflow } from "..";
import { api } from "../_generated/api";

export const verify_pr = workflow.define({
    args: {
        owner: v.string(),
        repo: v.string(),
        commit_hash: v.string(),
        pull_number: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<void> => {
        const { owner, repo, commit_hash, pull_number } = args;

        const limits = await ctx.runQuery(api.repositories.limits, { owner, repo });
        if (!limits) return;

        const checkId = await ctx.runAction(api.github.actions.startCommitCheck, {
            owner,
            repo,
            commit_hash,
        });
        if (!checkId) return;

        const analysis = await ctx.runAction(api.github.actions.analyzeRepoFiles, {
            owner,
            repo,
            commit_hash,
        });

        await ctx.runMutation(api.repositories.addCommit, {
            owner,
            repo,
            commit_hash,
            analysis: JSON.stringify(analysis),
        });

        const files = Array.isArray(analysis?.files) ? analysis.files : [];
        const total = files.reduce(
          (acc, file) => {
            const functions = Array.isArray(file?.functions) ? file.functions : [];
                const fileTotals = functions.reduce(
                  (fnAcc, fn) => {
                        const calls = Array.isArray(fn?.llm_calls) ? fn.llm_calls : [];
                        const cost = calls.reduce((callAcc, call) => callAcc + (call?.cost_per_1M_tokens ?? 0), 0);
                        return { cost: fnAcc.cost + cost, calls: fnAcc.calls + calls.length };
                    },
                    { cost: 0, calls: 0 },
                );
                return { cost: acc.cost + fileTotals.cost, calls: acc.calls + fileTotals.calls };
            },
            { cost: 0, calls: 0 },
        );

        const complete_commits = await ctx.runAction(api.github.actions.get_main_commits_with_code, {
            owner,
            repo,
        });

        await Promise.all(
            complete_commits.map(async (commit) => {
                await ctx.runMutation(api.repositories.addCompleteCommit, {
                    owner,
                    repo,
                    sha: commit.sha,
                    message: commit.message,
                    author: {
                        name: commit.author?.name,
                        email: commit.author?.email,
                        date: commit.author?.date,
                    },
                    files: commit.files.map((file) => ({
                        filename: file?.filename ?? "empty",
                        patch: file?.patch ?? "",
                        additions: file?.additions ?? 0,
                        deletions: file?.deletions ?? 0,
                        content: file?.content ?? "",
                    })),
                });
            }),
        );

      const withinLimits = total.calls < limits.calls && total.cost < limits.cost;

      const top3Files = files
        .map(file => {
          const functions = Array.isArray(file?.functions) ? file.functions : [];

          const acc = functions.reduce(
            (fnAcc, fn) => {
              const calls = Array.isArray(fn?.llm_calls) ? fn.llm_calls : [];

              calls.forEach(call => {
                fnAcc.cost += call?.cost_per_1M_tokens ?? 0;

                if (call?.position?.line != null && call?.position?.column != null) {
                  fnAcc.positions.push({
                    row: call.position.line,
                    col: call.position.column,
                  });
                }
              });

              return fnAcc;
            },
            {
              cost: 0,
              positions: [] as { row: number; col: number }[],
            },
          );

          return {
            filename: file.file_path ?? "unknown",
            cost: acc.cost,
            positions: acc.positions,
          };
        })
        .filter(file => file.cost > 0)
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 3);

      const expensiveFilesSummary =
        top3Files.length > 0
          ? [
              "### 💸 Most expensive files",
              "",
              ...top3Files.map((file, index) => {
                const positions =
                  file.positions.length > 0
                    ? file.positions
                        .map(pos => `(${pos.row}, ${pos.col})`)
                        .join(", ")
                    : "N/A";

                return (
                  `${index + 1}. **${file.filename}**\n` +
                  `   - Cost: **${file.cost}**\n` +
                  `   - Positions: ${positions}`
                );
              }),
            ].join("\n")
          : "No expensive files detected.";


        await ctx.runAction(api.github.actions.completeCommitCheck, {
            owner,
            repo,
            run_id: checkId,
            success: withinLimits,
            estimated_calls: total.calls,
            estimated_cost: total.cost,
            limit_cost: limits.cost,
          limit_calls: limits.calls,
          summary: expensiveFilesSummary
        });

        if (pull_number !== undefined && pull_number !== null) {
            const body = [
                "### VS Cost Analysis",
                "",
                `Commit: \`${commit_hash}\``,
                "",
                "| Metric | Usage | Limit |",
                "| --- | ---: | ---: |",
                `| LLM calls | ${total.calls} | ${limits.calls} |`,
                `| Est. cost (USD) | $${total.cost.toFixed(2)} | $${limits.cost.toFixed(2)} |`,
                "",
                withinLimits
                    ? "✅ This pull request is within the configured limits."
                : "⚠️ This pull request exceeds at least one configured limit.",
                "",
                `LLM Calls : ${total.calls}, Limit : ${limits.calls}`,
                        `Estimated Cost : ${total.cost}, Limit : ${limits.calls}`,
              "",
              expensiveFilesSummary
            ].join("\n");

            await ctx.runAction(api.github.actions.comment_pr, {
                owner,
                repo,
                issue_number: pull_number,
                body,
            });
        }
    },
});
