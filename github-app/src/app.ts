import { createNodeMiddleware } from "@octokit/webhooks";
import dotenv from "dotenv";
import fs from "node:fs";
import http from "node:http";
import { App, Octokit } from "octokit";
import { verifyBudget } from "./budget"

// Load environment variables from .env file
dotenv.config();

// Set configured values
const appId = process.env.APP_ID ?? "";
const privateKeyPath = process.env.PRIVATE_KEY_PATH ?? "";
const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const secret = process.env.WEBHOOK_SECRET ?? "";
const enterpriseHostname = process.env.ENTERPRISE_HOSTNAME;

// Create an authenticated Octokit client authenticated as a GitHub App
const app = new App({
    appId,
    privateKey,
    webhooks: {
        secret,
    }
});

// Optional: Get & log the authenticated app's name
const { data } = await app.octokit.request("/app");

// Read more about custom logging: https://github.com/octokit/core.js#logging
app.octokit.log.debug(`Authenticated as '${data.name}'`);

// Subscribe to the "pull_request.opened" webhook event
app.webhooks.on("pull_request.opened", async ({ octokit, payload }) => {
  console.log(`Received a pull request event for #${payload.pull_request.number}`);

  verifyBudget

  const changed_files = payload.pull_request.changed_files;

  const file_content =


  try {
      await octokit.rest.issues.createComment({
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          issue_number: payload.pull_request.number,
          body: messageForNewPRs,
      });
  } catch (error) {
      if (error.response) {
          console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
      } else {
          console.error(error);
      }
  }
});

// Optional: Handle errors
app.webhooks.onError((error) => {
    if (error.name === "AggregateError") {
        // Log Secret verification errors
        console.log(`Error processing request: ${error.event}`);
    } else {
        console.log(error);
    }
});
