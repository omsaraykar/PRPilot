import { db } from "../../db";
import { pullRequests } from "../../db/schema";

interface SavePullRequestInput {
  repositoryId: string;
  githubPrNumber: number;
  title: string;
  state: "open" | "closed";
  authorLogin: string;
  headSha: string;
  baseSha: string;
  htmlUrl: string;
  githubCreatedAt: Date | null;
  githubUpdatedAt: Date | null;
}

export const pullRequestsService = {
  async upsert(input: SavePullRequestInput) {
    const [pullRequest] = await db
      .insert(pullRequests)
      .values(input)
      .onConflictDoUpdate({
        target: [
          pullRequests.repositoryId,
          pullRequests.githubPrNumber
        ],
        set: {
          title: input.title,
          state: input.state,
          authorLogin: input.authorLogin,
          headSha: input.headSha,
          baseSha: input.baseSha,
          htmlUrl: input.htmlUrl,
          githubUpdatedAt: input.githubUpdatedAt,
          updatedAt: new Date()
        }
      })
      .returning();

    if (!pullRequest) {
      throw new Error("Failed to save pull request");
    }

    return pullRequest;
  }
};