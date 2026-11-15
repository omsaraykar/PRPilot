import { installationsService } from "../installations/installations.service";
import { repositoriesService } from "../repositories/repositories.service";
import { pullRequestsService } from "../pull-requests/pull-requests.service";
import { reviewsService } from "../reviews/reviews.service";

interface PersistPullRequestInput {
  installationId: number;
  installationAccount: string;
  installationAccountType: string;

  repository: {
    id: number;
    name: string;
    fullName: string;
    owner: string;
    defaultBranch: string | null;
    isPrivate: boolean;
    htmlUrl: string;
  };

  pullRequest: {
    number: number;
    title: string;
    state: "open" | "closed";
    author: string;
    headSha: string;
    baseSha: string;
    htmlUrl: string;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
}

export const githubPersistenceService = {
  async persistPullRequest(input: PersistPullRequestInput) {
    const installation = await installationsService.upsert({
      githubInstallationId: input.installationId,
      accountLogin: input.installationAccount,
      accountType: input.installationAccountType
    });

    if (!installation) {
      throw new Error("Failed to save GitHub installation");
    }

    const repository = await repositoriesService.upsert({
      installationId: installation.id,
      githubRepoId: input.repository.id,
      name: input.repository.name,
      fullName: input.repository.fullName,
      owner: input.repository.owner,
      defaultBranch: input.repository.defaultBranch,
      isPrivate: input.repository.isPrivate,
      htmlUrl: input.repository.htmlUrl
    });

    if (!repository) {
      throw new Error("Failed to save repository");
    }

    const pullRequest = await pullRequestsService.upsert({
      repositoryId: repository.id,
      githubPrNumber: input.pullRequest.number,
      title: input.pullRequest.title,
      state: input.pullRequest.state,
      authorLogin: input.pullRequest.author,
      headSha: input.pullRequest.headSha,
      baseSha: input.pullRequest.baseSha,
      htmlUrl: input.pullRequest.htmlUrl,
      githubCreatedAt: input.pullRequest.createdAt,
      githubUpdatedAt: input.pullRequest.updatedAt
    });

    if (!pullRequest) {
      throw new Error("Failed to save pull request");
    }

    const review = await reviewsService.createOrGet({
      pullRequestId: pullRequest.id,
      headSha: input.pullRequest.headSha
    });

    if (!review) {
      throw new Error("Failed to create or retrieve review");
    }

    return {
      installation,
      repository,
      pullRequest,
      review
    };
  }
};