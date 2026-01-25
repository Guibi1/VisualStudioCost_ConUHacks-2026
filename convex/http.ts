import { Webhooks } from "@octokit/webhooks";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const webhooks = new Webhooks({ secret: process.env.GITHUB_WEBHOOK_SECRET! });

const http = httpRouter();

http.route({
    path: "/api/callback/github",
    method: "POST",
    handler: httpAction(async (_ctx, request) => {
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
                }
                break;

            case "installation_repositories":
                if (payload.action === "added") {
                }
                break;

            case "pull_request":
                if (payload.action === "opened" || payload.action === "synchronize") {
                }
                break;

            case "push": {
                // await workflow.start(ctx, internal.github.index.verify_pr, { owner:  });
                break;
            }
        }

        return new Response("ok", { status: 200 });
    }),
});

auth.addHttpRoutes(http);

export default http;
