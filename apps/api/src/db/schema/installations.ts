import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    index,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const installations = pgTable(
    "installations",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        githubInstallationId: varchar(
            "github_installation_id",
            { length: 255 }
        ).notNull().unique(),

        accountLogin: varchar("account_login", {
            length: 255,
        }).notNull(),

        accountType: varchar("account_type", {
            length: 50,
        }).notNull(),

        createdBy: uuid("created_by").references(
            () => users.id,
            { onDelete: "set null" }
        ),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        }).defaultNow().notNull(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        }).defaultNow().notNull(),
    },
    (table) => [
        index("installations_created_by_idx").on(table.createdBy),
    ]
);