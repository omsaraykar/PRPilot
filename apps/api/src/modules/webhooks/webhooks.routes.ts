import { Elysia } from "elysia";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { githubService } from "../github/github.service";
import { githubPersistenceService } from "../github/github-persistence.service";

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
        action: payload.action,
        deliveryId
    });

    if (event === "ping") {
        return { success: true, message: "GitHub webhook connected" };
    }

    // 1. Handle installation lifecycle events
    if (event === "installation") {
        const installationId = payload.installation?.id;
        const accountLogin =
            payload.installation?.account?.login ??
            payload.sender?.login ??
            "unknown";
        const accountType =
            payload.installation?.account?.type ?? "User";

        if (!installationId) {
            set.status = 400;
            return {
                success: false,
                message: "Missing installation ID in webhook payload"
            };
        }

        if (payload.action === "created" || payload.action === "unsuspend") {
            try {
                const rawRepos = payload.repositories ?? [];
                const repositories = rawRepos.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    fullName: r.full_name,
                    owner: r.full_name?.split("/")[0] ?? accountLogin,
                    defaultBranch: r.default_branch ?? null,
                    isPrivate: Boolean(r.private),
                    htmlUrl: r.html_url ?? `https://github.com/${r.full_name}`
                }));

                const result = await githubPersistenceService.persistInstallation({
                    installationId,
                    accountLogin,
                    accountType,
                    repositories
                });

                console.log(`Installation ${payload.action} processed:`, {
                    installationId,
                    accountLogin,
                    repositoriesCount: result.repositories.length
                });

                return {
                    success: true,
                    message: `Installation ${payload.action} processed successfully`,
                    data: {
                        installationId: result.installation.id,
                        accountLogin: result.installation.accountLogin,
                        repositoriesCount: result.repositories.length
                    }
                };
            } catch (error) {
                console.error("Failed to persist installation:", error);
                set.status = 500;
                return {
                    success: false,
                    message: "Failed to persist installation"
                };
            }
        }

        if (payload.action === "deleted") {
            try {
                const deleted = await githubPersistenceService.removeInstallation(
                    installationId
                );

                console.log("Installation deleted:", {
                    installationId,
                    deletedId: deleted?.id
                });

                return {
                    success: true,
                    message: "Installation deleted and associated resources removed"
                };
            } catch (error) {
                console.error("Failed to delete installation:", error);
                set.status = 500;
                return {
                    success: false,
                    message: "Failed to delete installation"
                };
            }
        }

        return {
            success: true,
            message: `Installation action ignored: ${payload.action}`
        };
    }

    // 2. Handle installation repositories added / removed
    if (event === "installation_repositories") {
        const installationId = payload.installation?.id;
        const accountLogin =
            payload.installation?.account?.login ??
            payload.sender?.login ??
            "unknown";
        const accountType =
            payload.installation?.account?.type ?? "User";

        if (!installationId) {
            set.status = 400;
            return {
                success: false,
                message: "Missing installation ID in webhook payload"
            };
        }

        if (payload.action === "added") {
            try {
                const addedRepos = payload.repositories_added ?? [];
                const repositories = addedRepos.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    fullName: r.full_name,
                    owner: r.full_name?.split("/")[0] ?? accountLogin,
                    defaultBranch: r.default_branch ?? null,
                    isPrivate: Boolean(r.private),
                    htmlUrl: r.html_url ?? `https://github.com/${r.full_name}`
                }));

                const result = await githubPersistenceService.addRepositories({
                    installationId,
                    accountLogin,
                    accountType,
                    repositories
                });

                console.log("Repositories added to installation:", {
                    installationId,
                    addedCount: result.repositories.length
                });

                return {
                    success: true,
                    message: `Added ${result.repositories.length} repository/repositories`,
                    data: {
                        installationId: result.installation.id,
                        addedCount: result.repositories.length
                    }
                };
            } catch (error) {
                console.error("Failed to add repositories:", error);
                set.status = 500;
                return {
                    success: false,
                    message: "Failed to add repositories to installation"
                };
            }
        }

        if (payload.action === "removed") {
            try {
                const removedRepos = payload.repositories_removed ?? [];
                const repoIds = removedRepos.map((r: any) => r.id);

                await githubPersistenceService.removeRepositories(repoIds);

                console.log("Repositories removed from installation:", {
                    installationId,
                    removedCount: repoIds.length
                });

                return {
                    success: true,
                    message: `Removed ${repoIds.length} repository/repositories`
                };
            } catch (error) {
                console.error("Failed to remove repositories:", error);
                set.status = 500;
                return {
                    success: false,
                    message: "Failed to remove repositories from installation"
                };
            }
        }

        return {
            success: true,
            message: `Installation repositories action ignored: ${payload.action}`
        };
    }

    // 3. Handle pull request events
    if (event === "pull_request") {
        const supportedActions = [
            "opened",
            "synchronize",
            "reopened",
            "ready_for_review",
            "closed"
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

        // Handle closed pull request
        if (payload.action === "closed") {
            try {
                console.log("Persisting closed pull request:", {
                    installationId,
                    owner,
                    repo,
                    pullNumber
                });

                const result = await githubPersistenceService.persistPullRequest({
                    installationId,
                    installationAccount:
                        payload.installation?.account?.login ?? owner,
                    installationAccountType:
                        payload.installation?.account?.type ??
                        (payload.repository?.owner?.type ?? "User"),
                    repository: {
                        id: payload.repository.id,
                        name: payload.repository.name,
                        fullName: payload.repository.full_name,
                        owner,
                        defaultBranch:
                            payload.repository.default_branch ?? "main",
                        isPrivate: Boolean(payload.repository.private),
                        htmlUrl:
                            payload.repository.html_url ??
                            `https://github.com/${payload.repository.full_name}`
                    },
                    pullRequest: {
                        number: pullNumber,
                        title: payload.pull_request.title ?? `PR #${pullNumber}`,
                        state: "closed",
                        author:
                            payload.pull_request.user?.login ?? "unknown",
                        headSha: payload.pull_request.head?.sha ?? "",
                        baseSha: payload.pull_request.base?.sha ?? "",
                        htmlUrl:
                            payload.pull_request.html_url ??
                            `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
                        mergedAt: payload.pull_request.merged_at
                            ? new Date(payload.pull_request.merged_at)
                            : null,
                        createdAt: payload.pull_request.created_at
                            ? new Date(payload.pull_request.created_at)
                            : null,
                        updatedAt: payload.pull_request.updated_at
                            ? new Date(payload.pull_request.updated_at)
                            : null
                    }
                });

                return {
                    success: true,
                    message: "Pull request closed state persisted successfully",
                    data: {
                        repository: result.repository.fullName,
                        prNumber: result.pullRequest.githubPrNumber,
                        state: result.pullRequest.state,
                        mergedAt: result.pullRequest.mergedAt
                    }
                };
            } catch (error) {
                console.error("Failed to persist closed pull request:", error);
                set.status = 500;
                return {
                    success: false,
                    message: "Failed to persist closed pull request"
                };
            }
        }

        // Handle active review actions (opened, synchronize, reopened, ready_for_review)
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

            // Persist installation, repository, pull request, and review
            const result = await githubPersistenceService.persistPullRequest({
                installationId,
                installationAccount:
                    payload.installation?.account?.login ?? owner,
                installationAccountType:
                    payload.installation?.account?.type ??
                    (payload.repository?.owner?.type ?? "User"),
                repository: {
                    id: payload.repository.id,
                    name: payload.repository.name,
                    fullName: payload.repository.full_name,
                    owner,
                    defaultBranch:
                        payload.repository.default_branch ?? "main",
                    isPrivate: Boolean(payload.repository.private),
                    htmlUrl:
                        payload.repository.html_url ??
                        `https://github.com/${payload.repository.full_name}`
                },
                pullRequest: {
                    number: pullRequest.number,
                    title: pullRequest.title,
                    state: (pullRequest.state === "closed"
                        ? "closed"
                        : "open") as "open" | "closed",
                    author:
                        pullRequest.author ??
                        payload.pull_request?.user?.login ??
                        "unknown",
                    headSha: pullRequest.headSha,
                    baseSha: pullRequest.baseSha,
                    htmlUrl: pullRequest.htmlUrl,
                    mergedAt: pullRequest.mergedAt,
                    createdAt: pullRequest.createdAt,
                    updatedAt: pullRequest.updatedAt
                }
            });

            console.log("Pull request persisted successfully:", {
                installationId: result.installation.id,
                repositoryId: result.repository.id,
                pullRequestId: result.pullRequest.id,
                reviewId: result.review?.id,
                reviewStatus: result.review?.status
            });

            return {
                success: true,
                message: "Pull request fetched and persisted successfully",
                data: {
                    repository: result.repository.fullName,
                    prNumber: result.pullRequest.githubPrNumber,
                    headSha: result.pullRequest.headSha,
                    reviewId: result.review?.id,
                    reviewStatus: result.review?.status,
                    changedFilesCount: pullRequest.files.length
                }
            };
        } catch (error) {
            if (error instanceof Error) {
                console.error("Failed to process pull request:", {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            } else {
                console.error("Unknown error processing pull request:", error);
            }

            set.status = 500;
            return {
                success: false,
                message: "Failed to process pull request from GitHub"
            };
        }
    }

    return {
        success: true,
        message: `Event received: ${event}`
    };
});
