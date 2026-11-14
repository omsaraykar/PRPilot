import { githubApp } from "../../lib/github";

interface FetchPullRequestInput {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
}

export const githubService = {
  async fetchPullRequest(input: FetchPullRequestInput) {
    console.log("[GitHub] Creating installation client...");

    const octokit = await githubApp.getInstallationOctokit(
      input.installationId
    );

    console.log("[GitHub] Installation client created.");

    console.log("[GitHub] Fetching PR details...");

    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber
    });

    console.log("[GitHub] PR details fetched.");

    console.log("[GitHub] Fetching changed files...");

    const files = await octokit.paginate(
      octokit.rest.pulls.listFiles,
      {
        owner: input.owner,
        repo: input.repo,
        pull_number: input.pullNumber,
        per_page: 100
      }
    );

    console.log("[GitHub] Changed files fetched.");

    return {
      number: pullRequest.number,
      title: pullRequest.title,
      body: pullRequest.body,
      state: pullRequest.state,
      author: pullRequest.user?.login,
      baseBranch: pullRequest.base.ref,
      headBranch: pullRequest.head.ref,
      baseSha: pullRequest.base.sha,
      headSha: pullRequest.head.sha,
      htmlUrl: pullRequest.html_url,
      files: files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch ?? null
      }))
    };
  }
};