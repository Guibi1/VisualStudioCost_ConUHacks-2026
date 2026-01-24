import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
    path: "/api/callback/github",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        // try {
        //     await octokit.rest.issues.createComment({
        //         owner: payload.repository.owner.login,
        //         repo: payload.repository.name,
        //         issue_number: payload.pull_request.number,
        //         body: messageForNewPRs,
        //     });
        // } catch (error) {
        //     if (error.response) {
        //         console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        //     } else {
        //         console.error(error);
        //     }
        // }

        return new Response();
    }),
});

auth.addHttpRoutes(http);

export default http;
