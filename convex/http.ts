import { Webhooks } from "@octokit/webhooks";
import { httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { workflow } from "./index";

const webhooks = new Webhooks({ secret: process.env.GITHUB_WEBHOOK_SECRET! });

const http = httpRouter();

http.route({
    path: "/api/callback/github",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const signature = request.headers.get("x-hub-signature-256");
        const event = request.headers.get("x-github-event");
        const id = request.headers.get("x-github-delivery");

        if (!signature || !event || !id) {
            return new Response("Missing headers", { status: 400 });
        }

        const text = await request.text();
        try {
            await webhooks.verifyAndReceive({
                id,
                name: event,
                signature,
                payload: text,
            });
        } catch {
            return new Response("Invalid signature from GitHub.", { status: 401 });
        }

        const payload = JSON.parse(text);
        if (!payload) {
            console.error("No payload received from GitHub.");
            return new Response("Invalid payload", { status: 400 });
        }

        console.log(event, payload);
        console.log(payload.repository);

        switch (event) {
            case "installation":
                if (payload.action === "created") {
                    for (const repository of payload.repositories) {
                        const [owner, repo] = repository.full_name.split("/");
                        if (!owner || !repo) {
                            console.error("Invalid repository name:", repository.full_name);
                            break;
                        }
                        await ctx.runMutation(api.repositories.create, {
                            owner,
                            repo,
                        });
                    }
                } else if (payload.action === "deleted") {
                    for (const repository of payload.repositories) {
                        const [owner, repo] = repository.full_name.split("/");
                        await ctx.runMutation(api.repositories.toggle, {
                            owner,
                            repo,
                            enabled: false,
                        });
                    }
                }
                break;

            case "installation_repositories": {
                const repositoriesAdded = payload.repositories_added ?? [];
                for (const repository of repositoriesAdded) {
                    const [owner, repo] = repository.full_name.split("/");
                    if (!owner || !repo) {
                        console.error("Invalid repository name:", repository.full_name);
                        break;
                    }
                    await ctx.runMutation(api.repositories.create, {
                        owner,
                        repo,
                    });
                }

                const repositoriesRemoved = payload.repositories_removed ?? [];
                for (const repository of repositoriesRemoved) {
                    const [owner, repo] = repository.full_name.split("/");
                    await ctx.runMutation(api.repositories.toggle, {
                        owner,
                        repo,
                        enabled: false,
                    });
                }
                break;
            }

            case "pull_request": {
                if (!["opened", "synchronize", "reopened"].includes(payload.action)) {
                    break;
                }
                const pr = payload.pull_request;
                if (!pr) {
                    console.error("Missing pull_request payload for action:", payload.action);
                    break;
                }
                if (pr.state !== "open" || pr.draft === true) {
                    console.log("Skipping pull request workflow for closed or draft PR:", pr.number);
                    break;
                }
                const repositoryInfo = payload.repository ?? pr.base?.repo;
                if (!repositoryInfo?.full_name) {
                    console.error("Missing repository information on pull_request payload");
                    break;
                }
                if (repositoryInfo.disabled || repositoryInfo.archived) {
                    console.log(
                        "Repository disabled or archived, skipping pull request workflow for:",
                        repositoryInfo.full_name,
                    );
                    break;
                }
                const [owner, repo] = repositoryInfo.full_name.split("/", 2);
                if (!owner || !repo) {
                    console.error("Invalid repository name:", repositoryInfo.full_name);
                    break;
                }
                const repositoryLimits = await ctx.runQuery(api.repositories.limits, { owner, repo });
                if (!repositoryLimits) {
                    console.log(
                        "Repository not enabled in Convex, skipping pull request workflow for:",
                        repositoryInfo.full_name,
                    );
                    break;
                }
                const commitHash = pr.head?.sha;
                if (!commitHash) {
                    console.error("Missing head commit hash for pull request:", payload.number);
                    break;
                }
                await workflow.start(ctx, internal.github.index.verify_pr, {
                    owner,
                    repo,
                    commit_hash: commitHash,
                    pull_number: pr.number,
                });
                break;
            }

            case "push": {
                if (!payload.ref?.startsWith("refs/heads/")) {
                    console.log("Ignoring push event for non-branch ref:", payload.ref);
                    break;
                }
                if (payload.repository?.disabled || payload.repository?.archived) {
                    console.log(
                        "Repository disabled or archived, skipping push workflow for:",
                        payload.repository?.full_name,
                    );
                    break;
                }
                const [owner, repo] = payload.repository.full_name.split("/", 2);
                if (!owner || !repo) {
                    console.error("Invalid repository name:", payload.repository.full_name);
                    break;
                }
                const repositoryLimits = await ctx.runQuery(api.repositories.limits, { owner, repo });
                if (!repositoryLimits) {
                    console.log(
                        "Repository not enabled in Convex, skipping push workflow for:",
                        payload.repository.full_name,
                    );
                    break;
                }
                const commits = payload.commits ?? [];
                const commitHashes: string[] = [];
                for (const commit of commits) {
                    if (!commit?.id || commit.distinct === false) continue;
                    commitHashes.push(commit.id);
                }
                if (commitHashes.length === 0) {
                    const headCommit = payload.head_commit;
                    if (headCommit?.id && headCommit.distinct !== false) {
                        commitHashes.push(headCommit.id);
                    } else if (payload.after) {
                        commitHashes.push(payload.after);
                    }
                }
                for (const commitHash of commitHashes) {
                    await workflow.start(ctx, internal.github.index.verify_pr, {
                        owner,
                        repo,
                        commit_hash: commitHash,
                    });
                }
                break;
            }
        }

        return new Response("ok", { status: 200 });
    }),
});

auth.addHttpRoutes(http);

export default http;
