import { Elysia } from "elysia";

import { env } from "./config/env";
import { errorHandler } from "./plugins/error-handler";

import { healthRoutes } from "./modules/health/health.routes";
import { usersRoutes } from "./modules/users/users.routes";

const app = new Elysia({
    name: "pr-reviewer-api",
})
    .use(errorHandler)
    .group("/api", (app) =>
        app
            .use(healthRoutes)
            .use(usersRoutes)
    )
    .listen(env.PORT);

console.log(
    `PR Reviewer API running at http://localhost:${env.PORT}`
);

export type App = typeof app;