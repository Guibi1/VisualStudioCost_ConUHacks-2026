import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        if (!repository) return null;
        return { cost: repository.costLimit, calls: repository.callsLimit };
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
        return await ctx.db.insert("commits", args);
    },
});
