import {
    pgTable,
    uuid,
    varchar,
    boolean,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";

import { installations } from "./installations";

export const repositories = pgTable(
    "repositories",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        installationId: uuid("installation_id")
            .notNull()
            .references(() => installations.id, {
                onDelete: "cascade",
            }),

        githubRepoId: varchar("github_repo_id", {
            length: 255,
        }).notNull().unique(),

        name: varchar("name", {
            length: 255,
        }).notNull(),

        fullName: varchar("full_name", {
            length: 512,
        }).notNull(),

        owner: varchar("owner", {
            length: 255,
        }).notNull(),

        defaultBranch: varchar("default_branch", {
            length: 255,
        }),

        isPrivate: boolean("is_private")
            .default(false)
            .notNull(),

        htmlUrl: text("html_url").notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        }).defaultNow().notNull(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        }).defaultNow().notNull(),
    },
    (table) => [
        index("repositories_installation_id_idx").on(
            table.installationId
        ),
    ]
);