import { Elysia } from "elysia";

export const errorHandler = new Elysia({
    name: "error-handler",
}).onError(({ code, error, set }) => {
    console.error("API Error:", error);

    if (code === "VALIDATION") {
        set.status = 400;

        return {
            success: false,
            message: "Invalid request data",
        };
    }

    if (code === "NOT_FOUND") {
        set.status = 404;

        return {
            success: false,
            message: "Resource not found",
        };
    }

    set.status = 500;

    return {
        success: false,
        message: "Internal server error",
    };
});