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
    })
      .index("by_email", ["email"]),
    repositories: defineTable({
        name: v.string(),
        latest: v.string(),
    }),
    commits: defineTable({
        repo: v.string(),
        cost: v.string(),
    }).index("by_repo", ["repo"]),
});
