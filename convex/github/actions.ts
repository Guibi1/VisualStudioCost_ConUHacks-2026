"use node";

import { createAppAuth } from "@octokit/auth-app";
import { v } from "convex/values";
import JSZip from "jszip";
import { Octokit } from "octokit";
import { analyze_code } from "vscost-parser";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: process.env.GITHUB_APP_ID, privateKey: process.env.GITHUB_PRIVATE_KEY },
});

const getInstallationOctokit = async (owner: string, repo: string) => {
    const { data: installation } = await appOctokit.rest.apps.getRepoInstallation({
        owner,
        repo,
    });

    return new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: process.env.GITHUB_APP_ID,
            privateKey: process.env.GITHUB_PRIVATE_KEY,
            installationId: installation.id,
        },
    });
};

export const analyzeRepoFiles = action({
    args: {
        owner: v.string(),
        repo: v.string(),
        commit_hash: v.string(),
    },
    handler: async (_ctx, args) => {
        const installationOctokit = await getInstallationOctokit(args.owner, args.repo);

        const response = await installationOctokit.rest.repos.downloadZipballArchive({
            owner: args.owner,
            repo: args.repo,
            ref: args.commit_hash,
        });

        const zip = await JSZip.loadAsync(response.data as any);
        const fileContents: Record<string, string> = {};

        const rootPrefix = `${Object.keys(zip.files)[0].split("/")[0]}/`;
        for (const [zipPath, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;

            if (!zipPath.startsWith(rootPrefix)) continue;
            const relativePath = zipPath.slice(rootPrefix.length);

            const ext = relativePath.slice(relativePath.lastIndexOf("."));
            if (!ALLOWED_EXTENSIONS.has(ext)) continue;

            const content = await entry.async("string");
            fileContents[relativePath] = content;
        }

        return analyze_code(
            Object.entries(fileContents).map(([path, _]) => path),
            fileContents,
        );
    },
});

export const startCommitCheck = action({
    args: {
        owner: v.string(),
        repo: v.string(),
        commit_hash: v.string(),
    },
    handler: async (_ctx, args) => {
        try {
            const installationOctokit = await getInstallationOctokit(args.owner, args.repo);

            const check = await installationOctokit.rest.checks.create({
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

export const completeCommitCheck = action({
    args: {
        owner: v.string(),
        repo: v.string(),
        run_id: v.number(),
        success: v.boolean(),
    },
    handler: async (_ctx, args) => {
        try {
            const installationOctokit = await getInstallationOctokit(args.owner, args.repo);

            await installationOctokit.rest.checks.update({
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
    handler: async (_ctx, args) => {
        try {
            const installationOctokit = await getInstallationOctokit(args.owner, args.repo);

            await installationOctokit.rest.issues.createComment({
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

export const get_main_commits_with_code = action({
    args: {
        owner: v.string(),
        repo: v.string(),
        limit: v.optional(v.number()), // max number of commits
    },

    handler: async (ctx, args) => {
        try {
            const limit = args.limit ?? 10;

            const installationOctokit = await getInstallationOctokit(args.owner, args.repo);

            // 1️⃣ List recent commits on main
            const { data: commits } = await installationOctokit.rest.repos.listCommits({
                owner: args.owner,
                repo: args.repo,
                sha: "main",
                per_page: limit,
            });

            const existant_commits: string[] =
                (await ctx.runQuery(api.repositories.complete_commits_query, { repo: args.repo })) ?? [];

            // 2️⃣ For each commit, fetch changed files + code
            const results = await Promise.all(
                commits
                    .filter((commit) => existant_commits.includes(commit.sha))
                    .map(async (commit) => {
                        const { data: fullCommit } = await installationOctokit.rest.repos.getCommit({
                            owner: args.owner,
                            repo: args.repo,
                            ref: commit.sha,
                        });

                        const files = await Promise.all(
                            (fullCommit.files ?? []).map(async (file) => {
                                if (file.status === "removed") return null;

                                try {
                                    const { data: content } = await installationOctokit.rest.repos.getContent({
                                        owner: args.owner,
                                        repo: args.repo,
                                        path: file.filename,
                                        ref: commit.sha,
                                    });

                                    if ("content" in content && content.encoding === "base64") {
                                        return {
                                            filename: file.filename,
                                            status: file.status,
                                            patch: file.patch,
                                            additions: file.additions,
                                            deletions: file.deletions,
                                            content: Buffer.from(content.content, "base64").toString("utf-8"),
                                        };
                                    }

                                    return null;
                                } catch {
                                    return null; // binary / large file
                                }
                            }),
                        );

                        return {
                            sha: commit.sha,
                            message: commit.commit.message,
                            author: commit.commit.author,
                            date: commit.commit.author?.date,
                            files: files.filter(Boolean),
                        };
                    }),
            );

            return results;
        } catch (error: any) {
            if (error.response) {
                console.error(`Error ${error.response.status}: ${error.response.data.message}`);
            } else {
                console.error(error);
            }
            throw error;
        }
    },
});
