import { v } from "convex/values";
import { workflow } from ".";
import { action } from "./_generated/server";
import { App, Octokit } from "octokit";

const oktobaby = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const verify_pr = workflow.define({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args): Promise<void> => {},
});

export const startcheck_pr = action({
    args: {
        owner: v.string(),
        repo: v.string(),
        commit_hash: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            const check = await oktobaby.rest.checks.create({
                owner: args.owner,
                repo: args.repo,
                name: "VS Cost",
                head_sha: args.commit_hash,
                status: "in_progress",
                started_at: new Date().toISOString(),
                output: {
                    title: "Review started",
                    summary: "Running automated review",
                },
            });

            return check.data.id;
        } catch (error) {
            if (error.response) {
                console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
            } else {
                console.error(error);
            }
        }
    },
});

export const comment_pr = action({
    args: { owner: v.string(), repo: v.string(), issue_number: v.number(), body: v.string() },
    handler: async (ctx, args) => {
        try {
            await oktobaby.rest.issues.createComment({
                owner: args.owner,
                repo: args.repo,
                issue_number: args.issue_number,
                body: args.body,
            });
        } catch (error) {
            if (error.response) {
                console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
            } else {
                console.error(error);
            }
        }
    },
});

export const resolve_pr = action({
    args: {
        owner: v.string(),
        repo: v.string(),
        run_id: v.number(),
        success: v.boolean(),
    },
    handler: async (ctx, args) => {
        try {
            const check = await oktobaby.rest.checks.update({
                owner: args.owner,
                repo: args.repo,
                check_run_id: args.run_id,
                status: "completed",
                completed_at: new Date().toISOString(),
                output: {
                    title: "TODODODODODODODOOOODODOODODODODODODODODODODODODDO",
                    summary: "Done with automated review",
                },
                conclusion: args.success ? "success" : "failure",
            });

            return check.data.id;
        } catch (error) {
            if (error.response) {
                console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
            } else {
                console.error(error);
            }
        }
    },
});
