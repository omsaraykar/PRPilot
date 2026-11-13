import { Elysia } from "elysia";
import { sql } from "drizzle-orm";
import { db } from "./db";

const app = new Elysia()
    .get("/", () => ({
        message: "PR Reviewer API is running!",
    }))
    .get("/health", () => ({
        status: "healthy",
    }))
    .get("/health/db", async () => {
        try {
            await db.execute(sql`SELECT 1`);

            return {
                status: "connected",
                database: "Neon PostgreSQL",
            };
        } catch (error) {
            console.error("Database connection failed:", error);

            return {
                status: "error",
                message: "Database connection failed",
            };
        }
    })
    .listen(3001);

console.log(
    `API running at http://${app.server?.hostname}:${app.server?.port}`,
);