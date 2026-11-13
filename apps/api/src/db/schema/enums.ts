import { pgEnum } from "drizzle-orm/pg-core";

export const pullRequestStateEnum = pgEnum(
    "pull_request_state",
    ["open", "closed"]
);

export const reviewStatusEnum = pgEnum(
    "review_status",
    ["pending", "processing", "completed", "failed"]
);

export const findingSeverityEnum = pgEnum(
    "finding_severity",
    ["critical", "high", "medium", "low", "info"]
);

export const findingCategoryEnum = pgEnum(
    "finding_category",
    ["bug", "security", "performance", "quality", "style", "testing"]
);

export const findingSourceEnum = pgEnum(
    "finding_source",
    ["gemini", "semgrep"]
);