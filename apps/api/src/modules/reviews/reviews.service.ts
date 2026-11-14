import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { reviews } from "../../db/schema";

interface CreateReviewInput {
  pullRequestId: string;
  headSha: string;
}

export const reviewsService = {
  async createOrGet(input: CreateReviewInput) {
    const existing = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.pullRequestId, input.pullRequestId),
          eq(reviews.headSha, input.headSha)
        )
      )
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const [review] = await db
      .insert(reviews)
      .values({
        pullRequestId: input.pullRequestId,
        headSha: input.headSha,
        status: "pending"
      })
      .returning();

    return review;
  }
};