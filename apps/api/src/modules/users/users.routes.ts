import { Elysia, t } from "elysia";

import { usersController } from "./users.controller";
import {
    successResponse,
    errorResponse,
} from "../../lib/api-response";

export const usersRoutes = new Elysia({
    prefix: "/users",
}).get(
    "/:id",
    async ({ params, set }) => {
        const user = await usersController.getUser(params.id);

        if (!user) {
            set.status = 404;
            return errorResponse("User not found");
        }

        return successResponse(user, "User fetched successfully");
    },
    {
        params: t.Object({
            id: t.String({ format: "uuid" }),
        }),
    }
);