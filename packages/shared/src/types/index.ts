export type ReviewStatus =
    | "pending"
    | "processing"
    | "completed"
    | "failed";

export interface Review {
    id: string;
    status: ReviewStatus;
    repositoryName: string;
    pullRequestNumber: number;
}