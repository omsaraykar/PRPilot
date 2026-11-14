import { eq } from "drizzle-orm";
import { db } from "../../db";
import { installations } from "../../db/schema";

interface SaveInstallationInput {
  githubInstallationId: number;
  accountLogin: string;
  accountType: string;
}

export const installationsService = {
  async upsert(input: SaveInstallationInput) {
    const installationId = String(input.githubInstallationId);

    const [installation] = await db
      .insert(installations)
      .values({
        githubInstallationId: installationId,
        accountLogin: input.accountLogin,
        accountType: input.accountType
      })
      .onConflictDoUpdate({
        target: installations.githubInstallationId,
        set: {
          accountLogin: input.accountLogin,
          accountType: input.accountType,
          updatedAt: new Date()
        }
      })
      .returning();

    return installation;
  },

  async findByGithubId(githubInstallationId: number) {
    const [installation] = await db
      .select()
      .from(installations)
      .where(
        eq(
          installations.githubInstallationId,
          String(githubInstallationId)
        )
      )
      .limit(1);

    return installation ?? null;
  }
};