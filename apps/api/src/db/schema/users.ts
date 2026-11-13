import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),

    githubId: varchar("github_id", {
        length: 255,
    }).notNull().unique(),

    username: varchar("username", {
        length: 255,
    }).notNull(),

    email: varchar("email", {
        length: 255,
    }),

    avatarUrl: text("avatar_url"),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    }).defaultNow().notNull(),
});