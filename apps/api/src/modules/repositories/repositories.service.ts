import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { repositories } from "../../db/schema";

interface SaveRepositoryInput {
  installationId: string;
  githubRepoId: number | string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch?: string | null;
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
        defaultBranch: input.defaultBranch ?? null,
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
          defaultBranch: input.defaultBranch ?? null,
          isPrivate: input.isPrivate,
          htmlUrl: input.htmlUrl,
          updatedAt: new Date()
        }
      })
      .returning();

    return repository;
  },

  async findByGithubId(githubRepoId: number | string) {
    const [repository] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.githubRepoId, String(githubRepoId)))
      .limit(1);

    return repository ?? null;
  },

  async deleteByGithubId(githubRepoId: number | string) {
    const [deleted] = await db
      .delete(repositories)
      .where(eq(repositories.githubRepoId, String(githubRepoId)))
      .returning();

    return deleted ?? null;
  },

  async deleteManyByGithubIds(githubRepoIds: (number | string)[]) {
    if (githubRepoIds.length === 0) {
      return [];
    }

    const stringIds = githubRepoIds.map(String);
    return db
      .delete(repositories)
      .where(inArray(repositories.githubRepoId, stringIds))
      .returning();
  }
};