import { Elysia } from "elysia";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";

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
        console.log("Pull request event:", {
            action: payload.action,
            repository: payload.repository?.full_name,
            number: payload.pull_request?.number,
            headSha: payload.pull_request?.head?.sha
        });

        // Next phase: persist the PR and enqueue a review job.
    }

    return { success: true, message: "Webhook received" };
});