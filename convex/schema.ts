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
        latest: v.string(),
        costLimit: v.number(),
        callsLimit: v.number(),
    })
        .index("by_owner", ["owner"])
        .index("by_name", ["owner", "repo"]),
    commits: defineTable({
        owner: v.string(),
        repo: v.string(),
        commit_hash: v.string(),
        analysis: v.string(),
    })
        .index("by_hash", ["commit_hash"])
        .index("by_repo", ["owner", "repo"]),
});
