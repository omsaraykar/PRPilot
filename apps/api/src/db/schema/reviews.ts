import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";

import { pullRequests } from "./pull-requests";
import { reviewStatusEnum } from "./enums";

export const reviews = pgTable(
    "reviews",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        pullRequestId: uuid("pull_request_id")
            .notNull()
            .references(() => pullRequests.id, {
                onDelete: "cascade",
            }),

        headSha: varchar("head_sha", {
            length: 255,
        }).notNull(),

        status: reviewStatusEnum("status")
            .default("pending")
            .notNull(),

        summary: text("summary"),

        model: varchar("model", {
            length: 255,
        }),

        startedAt: timestamp("started_at", {
            withTimezone: true,
        }),

        completedAt: timestamp("completed_at", {
            withTimezone: true,
        }),

        error: text("error"),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        }).defaultNow().notNull(),
    },
    (table) => [
        index("reviews_pull_request_id_idx").on(
            table.pullRequestId
        ),

        index("reviews_head_sha_idx").on(table.headSha),
    ]
);