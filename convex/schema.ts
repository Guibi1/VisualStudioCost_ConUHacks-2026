import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    ...authTables,
    users: defineTable({
        name: v.string(),
        image: v.optional(v.string()),
        email: v.string(),
        discordId: v.string(),
        discordUsername: v.string(),

        team: v.optional(v.id("teams")),
    })
        .index("by_email", ["email"])
        .index("by_team", ["team"]),
    teams: defineTable({
        name: v.string(),
        code: v.string(),
    }).index("by_code", ["code"]),
});
