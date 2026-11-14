import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import { env } from "../config/env";

const privateKey = env.GITHUB_PRIVATE_KEY.replace(/\\n/g, "\n");

export const githubApp = new App({
    appId: env.GITHUB_APP_ID,
    privateKey,
    Octokit
});