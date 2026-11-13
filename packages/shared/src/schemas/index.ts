import { z } from "zod";

export const ReviewStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed"
]);

export const ReviewSchema = z.object({
  id: z.string(),
  status: ReviewStatusSchema,
  repositoryName: z.string(),
  pullRequestNumber: z.number().int().positive()
});