import { db } from "../../db";
import { repositories } from "../../db/schema";

interface SaveRepositoryInput {
  installationId: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string | null;
  isPrivate: boolean;
  htmlUrl: string;
}

export const repositoriesService = {
  async upsert(input: SaveRepositoryInput) {
    const [repository] = await db
      .insert(repositories)
      .values({
        installationId: input.installationId,
        githubRepoId: String(input.githubRepoId),
        name: input.name,
        fullName: input.fullName,
        owner: input.owner,
        defaultBranch: input.defaultBranch,
        isPrivate: input.isPrivate,
        htmlUrl: input.htmlUrl
      })
      .onConflictDoUpdate({
        target: repositories.githubRepoId,
        set: {
          installationId: input.installationId,
          name: input.name,
          fullName: input.fullName,
          owner: input.owner,
          defaultBranch: input.defaultBranch,
          isPrivate: input.isPrivate,
          htmlUrl: input.htmlUrl,
          updatedAt: new Date()
        }
      })
      .returning();

    return repository;
  }
};