import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    ...authTables,
    users: defineTable({
        username: v.string(),
        name: v.string(),
        image: v.optional(v.string()),
        email: v.string(),
    }).index("by_email", ["email"]),
    repositories: defineTable({
        owner: v.string(),
        repo: v.string(),
        enabled: v.boolean(),
        latest: v.optional(v.string()),
        costLimit: v.number(),
        callsLimit: v.number(),
    })
        .index("by_owner", ["owner"])
        .index("by_name", ["owner", "repo"]),
    commits: defineTable({
        owner: v.string(),
        repo: v.string(),
        date: v.number(),
        commit_hash: v.string(),
        analysis: v.string(),
    })
        .index("by_hash", ["commit_hash"])
        .index("by_repo", ["owner", "repo"]),
    complete_commits: defineTable({
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
    }).index("by_repo", ["owner", "repo"]),
});
