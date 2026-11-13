import { eq } from "drizzle-orm";

import { db } from "../../db";
import { users } from "../../db/schema";

export const usersService = {
    async findById(id: string) {
        const result = await db
            .select({
                id: users.id,
                githubId: users.githubId,
                username: users.username,
                email: users.email,
                avatarUrl: users.avatarUrl,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        return result[0] ?? null;
    },
};