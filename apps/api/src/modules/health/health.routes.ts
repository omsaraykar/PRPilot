import { Elysia } from "elysia";
import { sql } from "drizzle-orm";

import { db } from "../../db";
import { successResponse } from "../../lib/api-response";

export const healthRoutes = new Elysia({
    prefix: "/health",
})
    .get("/", () => {
        return successResponse({
            status: "healthy",
            service: "PR Reviewer API",
        });
    })
    .get("/db", async ({ set }) => {
        try {
            await db.execute(sql`SELECT 1`);

            return successResponse({
                status: "connected",
                database: "Neon PostgreSQL",
            });
        } catch (error) {
            console.error("Database health check failed:", error);

            set.status = 503;

            return {
                success: false,
                message: "Database unavailable",
            };
        }
    });