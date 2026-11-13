import {
    pgTable,
    uuid,
    integer,
    varchar,
    text,
    timestamp,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

import { repositories } from "./repositories";
import { pullRequestStateEnum } from "./enums";

export const pullRequests = pgTable(
    "pull_requests",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        repositoryId: uuid("repository_id")
            .notNull()
            .references(() => repositories.id, {
                onDelete: "cascade",
            }),

        githubPrNumber: integer("github_pr_number")
            .notNull(),

        title: text("title").notNull(),

        state: pullRequestStateEnum("state")
            .default("open")
            .notNull(),

        authorLogin: varchar("author_login", {
            length: 255,
        }).notNull(),

        headSha: varchar("head_sha", {
            length: 255,
        }).notNull(),

        baseSha: varchar("base_sha", {
            length: 255,
        }).notNull(),

        htmlUrl: text("html_url").notNull(),

        mergedAt: timestamp("merged_at", {
            withTimezone: true,
        }),

        githubCreatedAt: timestamp("github_created_at", {
            withTimezone: true,
        }),

        githubUpdatedAt: timestamp("github_updated_at", {
            withTimezone: true,
        }),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        }).defaultNow().notNull(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("pull_requests_repo_number_idx").on(
            table.repositoryId,
            table.githubPrNumber
        ),

        index("pull_requests_state_idx").on(table.state),
    ]
);