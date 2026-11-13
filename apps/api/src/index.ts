import { Elysia } from "elysia";

const app = new Elysia()
    .get("/", () => {
        return {
            message: "PR Reviewer API is running!"
        };
    })
    .get("/health", () => {
        return {
            status: "healthy"
        };
    })
    .listen(3001);

console.log(
    `API running at http://${app.server?.hostname}:${app.server?.port}`
);