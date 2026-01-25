import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./auth";

export const limits = query({
    args: {
        owner: v.string(),
        repo: v.string(),
    },
    handler: async (ctx, { owner, repo }) => {
        const repository = await ctx.db
            .query("repositories")
            .withIndex("by_name", (q) => q.eq("owner", owner).eq("repo", repo))
            .first();
        if (!repository || repository.enabled === false) return null;
        return { cost: repository.costLimit, calls: repository.callsLimit };
    },
});

export const getUserRepos = query({
    args: {},
    handler: async (ctx) => {
        const user = await getAuthUser(ctx);
        if (!user) return [];
        return await ctx.db
            .query("repositories")
            .withIndex("by_owner", (q) => q.eq("owner", user.username))
            .filter((q) => q.eq(q.field("enabled"), true))
            .collect();
    },
});

export const getCommit = query({
    args: {
        hash: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx);
        if (!user) return null;
        return await ctx.db
            .query("commits")
            .withIndex("by_hash", (q) => q.eq("commit_hash", args.hash))
            .unique();
    },
});

export const setSettings = mutation({
    args: {
        owner: v.string(),
        repo: v.string(),
        costLimit: v.number(),
        callsLimit: v.number(),
    },
    handler: async (ctx, args) => {
        const repository = await ctx.db
            .query("repositories")
            .withIndex("by_name", (q) => q.eq("owner", args.owner).eq("repo", args.repo))
            .first();
        if (!repository) return null;
        return await ctx.db.patch("repositories", repository._id, {
            costLimit: args.costLimit,
            callsLimit: args.callsLimit,
        });
    },
});

export const create = mutation({
    args: {
        owner: v.string(),
        repo: v.string(),
    },
    handler: async (ctx, args) => {
        const repository = await ctx.db
            .query("repositories")
            .withIndex("by_name", (q) => q.eq("owner", args.owner).eq("repo", args.repo))
            .first();
        if (repository) {
            return await ctx.db.patch("repositories", repository._id, {
                enabled: true,
            });
        }
        return await ctx.db.insert("repositories", {
            ...args,
            enabled: true,
            costLimit: 500,
            callsLimit: 10,
        });
    },
});

export const toggle = mutation({
    args: {
        owner: v.string(),
        repo: v.string(),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const repository = await ctx.db
            .query("repositories")
            .withIndex("by_name", (q) => q.eq("owner", args.owner).eq("repo", args.repo))
            .first();
        if (!repository) return null;
        await ctx.db.patch("repositories", repository._id, {
            enabled: args.enabled,
        });
    },
});

export const addCommit = mutation({
    args: {
        owner: v.string(),
        repo: v.string(),
        commit_hash: v.string(),
        analysis: v.string(),
    },
    handler: async (ctx, args) => {
        const repository = await ctx.db
            .query("repositories")
            .withIndex("by_name", (q) => q.eq("owner", args.owner).eq("repo", args.repo))
            .first();
        if (!repository) return null;
        await ctx.db.insert("commits", args);
        await ctx.db.patch("repositories", repository._id, { latest: args.commit_hash });
    },
});

export const addCompleteCommit = mutation({
    args: {
        owner: v.string(),
        repo: v.string(),
        sha: v.string(),
        message: v.string(),
        author: v.object({
            name: v.optional(v.string()),
            email: v.optional(v.string()),
            date: v.optional(v.string()),
        }),
        files: v.array(
            v.object({
                filename: v.string(),
                patch: v.optional(v.string()),
                additions: v.number(),
                deletions: v.number(),
                content: v.string(),
            }),
        ),
    },

    handler: async (ctx, args) => {
        // optional: prevent duplicates
        const existing = await ctx.db
            .query("complete_commits")
            .withIndex("by_repo", (q) => q.eq("owner", args.owner).eq("repo", args.repo))
            .filter((q) => q.eq(q.field("sha"), args.sha))
            .first();

        if (existing) {
            return existing._id;
        }

        return await ctx.db.insert("complete_commits", {
            owner: args.owner,
            repo: args.repo,
            sha: args.sha,
            message: args.message,
            author: args.author,
            files: args.files,
        });
    },
});

export const complete_commits_query = query({
    args: {
        owner: v.string(),
        repo: v.string(),
    },
    handler: async (ctx, args) => {
        const commits = await ctx.db
            .query("complete_commits")
            .withIndex("by_repo", (q) => q.eq("owner", args.owner).eq("repo", args.repo))
            .collect();
        if (!commits) return null;
        return commits;
    },
});
