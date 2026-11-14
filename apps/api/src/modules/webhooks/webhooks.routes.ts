import { Elysia } from "elysia";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { githubService } from "../github/github.service";

function verifyGitHubSignature(
    rawBody: Buffer,
    signature: string | null
): boolean {
    if (!signature?.startsWith("sha256=")) {
        return false;
    }

    const receivedHex = signature.slice(7);

    if (!/^[a-f0-9]{64}$/i.test(receivedHex)) {
        return false;
    }

    const expected = createHmac("sha256", env.GITHUB_WEBHOOK_SECRET)
        .update(rawBody)
        .digest();

    const received = Buffer.from(receivedHex, "hex");

    return (
        received.length === expected.length &&
        timingSafeEqual(received, expected)
    );
}

export const webhooksRoutes = new Elysia({
    prefix: "/webhooks"
}).post("/github", async ({ request, set }) => {
    const rawBody = Buffer.from(await request.arrayBuffer());
    const signature = request.headers.get("x-hub-signature-256");

    if (!verifyGitHubSignature(rawBody, signature)) {
        set.status = 401;
        return { success: false, message: "Invalid webhook signature" };
    }

    const event = request.headers.get("x-github-event");
    const deliveryId = request.headers.get("x-github-delivery");

    let payload: any;

    try {
        payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
        set.status = 400;
        return { success: false, message: "Invalid JSON payload" };
    }

    console.log("GitHub webhook received:", {
        event,
        deliveryId
    });

    if (event === "ping") {
        return { success: true, message: "GitHub webhook connected" };
    }

    if (event === "pull_request") {
        const supportedActions = [
            "opened",
            "synchronize",
            "reopened",
            "ready_for_review"
        ];

        if (!supportedActions.includes(payload.action)) {
            return {
                success: true,
                message: `Pull request action ignored: ${payload.action}`
            };
        }

        const installationId = payload.installation?.id;
        const owner = payload.repository?.owner?.login;
        const repo = payload.repository?.name;
        const pullNumber = payload.pull_request?.number;

        if (
            !installationId ||
            !owner ||
            !repo ||
            !pullNumber
        ) {
            set.status = 400;
            return {
                success: false,
                message: "Missing pull request or installation information"
            };
        }

        try {
            console.log("Fetching PR using GitHub App:", {
                installationId,
                owner,
                repo,
                pullNumber
            });
            const pullRequest = await githubService.fetchPullRequest({
                installationId,
                owner,
                repo,
                pullNumber
            });

            console.log("Pull request fetched successfully:", {
                repository: `${owner}/${repo}`,
                number: pullRequest.number,
                title: pullRequest.title,
                author: pullRequest.author,
                headSha: pullRequest.headSha,
                changedFiles: pullRequest.files.length
            });

            console.log(
                "Changed files:",
                pullRequest.files.map((file) => ({
                    filename: file.filename,
                    status: file.status,
                    additions: file.additions,
                    deletions: file.deletions
                }))
            );
        } catch (error) {
            if (error instanceof Error) {
                console.error("Failed to fetch pull request:", {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            } else {
                console.error("Unknown GitHub API error:", error);
            }

            set.status = 500;
            return {
                success: false,
                message: "Failed to fetch pull request from GitHub"
            };
        }
    }

    return { success: true, message: "Webhook received" };
});