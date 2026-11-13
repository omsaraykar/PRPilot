import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.url(),

    GITHUB_APP_ID: z.string().min(1),
    GITHUB_PRIVATE_KEY: z.string().min(1),
    GITHUB_WEBHOOK_SECRET: z.string().min(1)
});

export const env = envSchema.parse(process.env);