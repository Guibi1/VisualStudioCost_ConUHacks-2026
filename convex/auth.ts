import GitHub from "@auth/core/providers/github";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { type MutationCtx, type QueryCtx, query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
    providers: [
        GitHub({
            profile(profile) {
                console.log(profile);
                return {
                    id: profile.id.toString(),
                    username: profile.login,
                    name: profile.name ?? profile.login,
                    email: profile.email,
                    image: profile.avatar_url ?? profile.gravatar_id ?? undefined,
                };
            },
        }),
    ],
    callbacks: {
        async createOrUpdateUser(ctx: MutationCtx, args) {
            if (args.existingUserId) {
                await ctx.db.patch("users", args.existingUserId, {
                    username: args.profile.login as string,
                    name: (args.profile.name ?? args.profile.login) as string,
                    email: args.profile.email,
                    image: args.profile.image as string,
                });
                return args.existingUserId;
            }

            if (args.type !== "oauth" || args.provider.type !== "oauth" || args.provider.id !== "github") {
                throw new Error("Can only login using github.");
            }

            const existingUser = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", args.profile.email as string))
                .first();
            if (existingUser) return existingUser._id;

            return await ctx.db.insert("users", args.profile as Doc<"users">);
        },
    },
});

export const currentUser = query({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null) return null;

        return await ctx.db.get(userId);
    },
});

export async function getAuthUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
    return ctx.runQuery(api.auth.currentUser);
}
