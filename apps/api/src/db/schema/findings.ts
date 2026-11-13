import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    numeric,
    timestamp,
    boolean,
    index,
} from "drizzle-orm/pg-core";

import { reviews } from "./reviews";

import {
    findingSeverityEnum,
    findingCategoryEnum,
    findingSourceEnum,
} from "./enums";

export const findings = pgTable(
    "findings",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        reviewId: uuid("review_id")
            .notNull()
            .references(() => reviews.id, {
                onDelete: "cascade",
            }),

        category: findingCategoryEnum("category")
            .notNull(),

        severity: findingSeverityEnum("severity")
            .notNull(),

        source: findingSourceEnum("source")
            .notNull(),

        title: varchar("title", {
            length: 500,
        }).notNull(),

        description: text("description").notNull(),

        suggestion: text("suggestion"),

        filePath: text("file_path").notNull(),

        startLine: integer("start_line"),

        endLine: integer("end_line"),

        confidence: numeric("confidence", {
            precision: 4,
            scale: 3,
        }),

        fingerprint: varchar("fingerprint", {
            length: 255,
        }),

        githubCommentId: varchar("github_comment_id", {
            length: 255,
        }),

        isPosted: boolean("is_posted")
            .default(false)
            .notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        }).defaultNow().notNull(),
    },
    (table) => [
        index("findings_review_id_idx").on(table.reviewId),

        index("findings_severity_idx").on(table.severity),

        index("findings_source_idx").on(table.source),
    ]
);