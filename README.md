# PRPilot 🚀

[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ElysiaJS](https://img.shields.io/badge/ElysiaJS-black.svg?style=flat)](https://elysiajs.com/)
[![React 19](https://img.shields.io/badge/React_19-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%23316192.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?style=flat)](https://neon.tech/)

> **PRPilot** is an automated, AI-powered GitHub Pull Request reviewer and code intelligence platform. It listens for pull request events via GitHub Webhooks, analyzes code changes with static analysis engines and modern Large Language Models (LLMs), and stores granular findings to deliver actionable review feedback directly to development teams.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Monorepo Architecture](#-monorepo-architecture)
- [Key Features](#-key-features)
- [How It Works (Review Lifecycle)](#-how-it-works-review-lifecycle)
- [Database Schema & Data Model](#-database-schema--data-model)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Local Setup](#-installation--local-setup)
- [GitHub App Configuration](#-github-app-configuration)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [API Endpoints](#-api-endpoints)
- [Project Directory Structure](#-project-directory-structure)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔭 Overview

Modern software development moves fast, but manual code reviews often become bottlenecks or miss subtle regressions, performance snags, and security flaws. **PRPilot** acts as a 24/7 automated peer reviewer directly integrated into your GitHub pull request workflows.

Built on top of a lightning-fast Bun-powered TypeScript monorepo, PRPilot:
- Receives cryptographically verified GitHub webhooks.
- Authenticates securely as a GitHub App using short-lived installation access tokens.
- Ingests changed files, patches, and commit metadata.
- Persists repository hierarchies, pull requests, and multi-run review sessions in a PostgreSQL database using Drizzle ORM.
- Coordinates static analysis (Semgrep) and LLM-assisted reasoning (Gemini) to categorize findings with exact line numbers, code snippets, severity tags, and remediation suggestions.

---

## 🏗 Monorepo Architecture

The repository is structured as a Bun workspace monorepo consisting of distinct apps and packages:

```
PRPilot/
├── apps/
│   ├── api/          # Core backend REST API & GitHub Webhook ingress (ElysiaJS)
│   ├── web/          # Modern frontend dashboard (React 19 + Vite)
│   └── worker/       # Background asynchronous review job processor
└── packages/
    └── shared/       # Shared TypeScript types, Zod schemas, and data transfer models
```

### Component Breakdown

| Package | Path | Purpose |
| :--- | :--- | :--- |
| **`@pr-reviewer/api`** | `apps/api` | Fast HTTP service built on ElysiaJS. Handles GitHub webhook signature verification (`HMAC-SHA256`), Octokit installation auth, database models (Drizzle ORM), and health checks. |
| **`@pr-reviewer/worker`** | `apps/worker` | Dedicated background runner for executing CPU- and AI-intensive review tasks, diff parsing, Semgrep scans, and Gemini inference. |
| **`@pr-reviewer/web`** | `apps/web` | Single-page application built with React 19 and Vite for review dashboards, metrics, and repository management. |
| **`@pr-reviewer/shared`** | `packages/shared` | Central source of truth for contracts, domain types (`Review`, `ReviewStatus`), and Zod validation schemas shared across services. |

---

## ✨ Key Features

- **GitHub App Native**: Authenticates via GitHub App installation tokens, eliminating personal access token (PAT) security risks.
- **HMAC Signature Verification**: Every webhook request is validated against `GITHUB_WEBHOOK_SECRET` using timing-safe buffer comparisons (`x-hub-signature-256`).
- **Relational Integrity**: Complete schema tracking installations, accounts, repositories, pull requests, review snapshots per commit SHA, and categorized findings.
- **Multi-Source Code Analysis**:
  - **Gemini**: Deep context reasoning for design defects, readability, edge-case testing, and code quality.
  - **Semgrep**: Fast, deterministic AST-based static pattern matching for common security vulnerabilities (OWASP top 10, CWEs).
- **Categorized & Prioritized Findings**:
  - **Severities**: `critical`, `high`, `medium`, `low`, `info`
  - **Categories**: `bug`, `security`, `performance`, `quality`, `style`, `testing`
- **Idempotent Storage**: Safe to re-trigger on push updates (`synchronize`) or PR re-openings without duplicating parent records.
- **Full Type-Safety**: End-to-end TypeScript from Drizzle schema definitions and Zod validations to API responses.

---

## 🔄 How It Works (Review Lifecycle)

The following sequence illustrates how PRPilot processes incoming GitHub pull request events:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant GH as GitHub
    participant API as PRPilot API (Elysia)
    participant DB as Neon PostgreSQL (Drizzle)
    participant Worker as Background Worker
    participant AI as Gemini & Semgrep

    Dev->>GH: Open / Update Pull Request
    GH->>API: POST /api/webhooks/github (x-hub-signature-256)
    Note over API: Verify HMAC-SHA256 signature
    API->>GH: Authenticate as GitHub App (Octokit)
    API->>GH: Fetch PR details & changed file patches
    GH-->>API: PR metadata & file diffs
    API->>DB: Upsert Installation, Repository, PR & Review
    API-->>GH: 200 OK (Webhook received)
    API->>Worker: Enqueue analysis task
    Worker->>AI: Run static rules (Semgrep) & LLM review (Gemini)
    AI-->>Worker: Generated findings & suggestions
    Worker->>DB: Persist findings & update review status to "completed"
    Worker->>GH: Post inline review comments & PR summary
```

---

## 🗄 Database Schema & Data Model

The database is built on PostgreSQL (Neon Serverless) and managed using **Drizzle ORM**.

```mermaid
erDiagram
    users ||--o{ installations : "created_by"
    installations ||--o{ repositories : "contains"
    repositories ||--o{ pull_requests : "receives"
    pull_requests ||--o{ reviews : "has"
    reviews ||--o{ findings : "produces"

    users {
        uuid id PK
        varchar github_id UK
        varchar username
        varchar email
        text avatar_url
        timestamp created_at
        timestamp updated_at
    }

    installations {
        uuid id PK
        varchar github_installation_id UK
        varchar account_login
        varchar account_type
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    repositories {
        uuid id PK
        uuid installation_id FK
        varchar github_repo_id UK
        varchar name
        varchar full_name
        varchar owner
        varchar default_branch
        boolean is_private
        text html_url
        timestamp created_at
        timestamp updated_at
    }

    pull_requests {
        uuid id PK
        uuid repository_id FK
        integer github_pr_number
        text title
        pull_request_state state
        varchar author_login
        varchar head_sha
        varchar base_sha
        text html_url
        timestamp merged_at
        timestamp github_created_at
        timestamp github_updated_at
        timestamp created_at
        timestamp updated_at
    }

    reviews {
        uuid id PK
        uuid pull_request_id FK
        varchar head_sha
        review_status status
        text summary
        varchar model
        timestamp started_at
        timestamp completed_at
        text error
        timestamp created_at
    }

    findings {
        uuid id PK
        uuid review_id FK
        finding_category category
        finding_severity severity
        finding_source source
        varchar title
        text description
        text suggestion
        text file_path
        integer start_line
        integer end_line
        numeric confidence
        varchar fingerprint
        varchar github_comment_id
        boolean is_posted
        timestamp created_at
    }
```

### Schema Enums

- **`pull_request_state`**: `'open'`, `'closed'`
- **`review_status`**: `'pending'`, `'processing'`, `'completed'`, `'failed'`
- **`finding_severity`**: `'critical'`, `'high'`, `'medium'`, `'low'`, `'info'`
- **`finding_category`**: `'bug'`, `'security'`, `'performance'`, `'quality'`, `'style'`, `'testing'`
- **`finding_source`**: `'gemini'`, `'semgrep'`

---

## 💻 Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **API Framework**: [ElysiaJS](https://elysiajs.com/)
- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Oxlint](https://oxc.rs/)
- **Database & Query Layer**: [Neon Serverless PostgreSQL](https://neon.tech/), [Drizzle ORM](https://orm.drizzle.team/), `drizzle-kit`
- **GitHub Integration**: [`@octokit/app`](https://github.com/octokit/app.js), [`@octokit/rest`](https://github.com/octokit/rest.js), [`octokit`](https://github.com/octokit/octokit.js)
- **Validation**: [Zod](https://zod.dev/)

---

## 📋 Prerequisites

Ensure you have the following installed on your development machine:

1. **Bun** (v1.1+ or later):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
2. **PostgreSQL Database**: A hosted PostgreSQL instance (e.g., [Neon](https://neon.tech/)) or a local PostgreSQL database.
3. **GitHub Account**: To create and install your GitHub App.
4. **Webhook Tunneling Tool** *(for local development)*: [smee.io](https://smee.io/) or [ngrok](https://ngrok.com/) to route GitHub webhooks to `http://localhost:3001`.

---

## 🚀 Installation & Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/omsaraykar/PRPilot.git
cd PRPilot
```

### 2. Install Dependencies

Install all dependencies across the workspace using Bun:

```bash
bun install
```

### 3. Configure Environment Variables

Create the `.env` file in `apps/api`:

```bash
cp apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and supply your actual credentials (see [Environment Variables](#-environment-variables) below for details):

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:password@ep-sample-pooler.region.neon.tech/neondb?sslmode=require

GITHUB_APP_ID="123456"
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET="your-secure-webhook-secret"
```

### 4. Run Database Migrations

Generate and apply the Drizzle schema migrations to your database:

```bash
# Apply pending migrations
bun --filter @pr-reviewer/api db:migrate
```

*(Optional)* Open Drizzle Studio to inspect and edit database records visually in your browser:

```bash
bun --filter @pr-reviewer/api db:studio
```

### 5. Start the Services

You can run individual services or develop them simultaneously:

```bash
# Start API in development mode (with hot reloading)
bun dev:api

# Start Web Frontend in development mode
bun dev:web

# Start Worker in development mode
bun dev:worker
```

The services will be accessible at:
- **API**: `http://localhost:3001`
- **Web App**: `http://localhost:5173`
- **API Health Check**: `http://localhost:3001/api/health`

---

## 🤖 GitHub App Configuration

To connect PRPilot with GitHub repositories, set up a GitHub App:

### 1. Create the GitHub App
1. Go to your GitHub profile or organization settings:
   - **Personal**: `Settings` > `Developer Settings` > `GitHub Apps` > **New GitHub App**
   - **Organization**: `Organization Settings` > `Developer Settings` > `GitHub Apps` > **New GitHub App**
2. Fill in the basic info:
   - **GitHub App name**: `PRPilot-Dev` (or a unique name)
   - **Homepage URL**: `https://github.com/omsaraykar/PRPilot`
3. Configure the **Webhook**:
   - Check **Active**.
   - **Webhook URL**: Your public webhook tunnel URL (e.g. from [smee.io](https://smee.io/) or `https://<your-subdomain>.ngrok-free.app/api/webhooks/github`).
   - **Webhook secret**: Enter a strong random secret and copy it into `GITHUB_WEBHOOK_SECRET` in `apps/api/.env`.

### 2. Set Permissions
Under **Repository permissions**, grant the following:
- **Pull requests**: `Read and write` (needed to inspect diffs and post review comments)
- **Contents**: `Read-only` (needed to read repository files)
- **Metadata**: `Read-only` (mandatory for all GitHub Apps)

### 3. Subscribe to Webhook Events
Under **Subscribe to events**, select:
- ✅ **Pull request**

### 4. Generate Private Key & App ID
1. Once created, note the numeric **App ID** displayed on the app's General settings page. Set this as `GITHUB_APP_ID`.
2. Scroll down to **Private keys** and click **Generate a private key**.
3. A `.pem` file will download. Convert its contents to an environment-safe string with escaped newlines (`\n`):
   ```bash
   awk '{printf "%s\\n", $0}' your-app-private-key.pem
   ```
4. Paste the escaped key into `GITHUB_PRIVATE_KEY` in `apps/api/.env`.

### 5. Install the GitHub App
Navigate to **Install App** in your GitHub App's settings sidebar, select your account or organization, and choose **All repositories** or select specific test repositories.

---

## 🔐 Environment Variables

The `apps/api` service validates required variables on startup using Zod:

| Variable | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `PORT` | `number` | No | `3001` | Port on which the Elysia API server listens. |
| `NODE_ENV` | `enum` | No | `development` | Application mode: `development`, `production`, or `test`. |
| `DATABASE_URL` | `string` | **Yes** | — | PostgreSQL connection string (supports Neon Serverless Postgres). |
| `GITHUB_APP_ID` | `string` | **Yes** | — | Numeric App ID of your registered GitHub App. |
| `GITHUB_PRIVATE_KEY` | `string` | **Yes** | — | RSA Private Key for the GitHub App (newline-escaped format). |
| `GITHUB_WEBHOOK_SECRET`| `string` | **Yes** | — | Secret token used to verify GitHub HMAC-SHA256 webhook signatures. |

---

## 📜 Available Scripts

Run these scripts from the repository root:

```bash
# Start the API service in watch mode
bun dev:api

# Start the Web UI dev server
bun dev:web

# Start the Worker service in watch mode
bun dev:worker

# Install all workspace dependencies
bun install:all
```

### Application-Specific Scripts

#### `@pr-reviewer/api` (`apps/api`)
- `bun --filter @pr-reviewer/api dev` - Starts API server with hot reloading (`bun --watch src/index.ts`).
- `bun --filter @pr-reviewer/api start` - Starts API server in production mode.
- `bun --filter @pr-reviewer/api db:generate` - Generates SQL migration files from Drizzle schema definitions.
- `bun --filter @pr-reviewer/api db:migrate` - Applies migrations to the database.
- `bun --filter @pr-reviewer/api db:studio` - Launches Drizzle Studio GUI on `http://local.drizzle.studio`.

#### `@pr-reviewer/web` (`apps/web`)
- `bun --filter @pr-reviewer/web dev` - Starts Vite dev server.
- `bun --filter @pr-reviewer/web build` - Type-checks and builds the production bundle.
- `bun --filter @pr-reviewer/web lint` - Fast linting with Oxlint.
- `bun --filter @pr-reviewer/web preview` - Previews the production build locally.

#### `@pr-reviewer/worker` (`apps/worker`)
- `bun --filter @pr-reviewer/worker dev` - Runs worker with hot reloading.
- `bun --filter @pr-reviewer/worker start` - Runs worker in production mode.

---

## 🔌 API Endpoints

All REST routes are served under the `/api` prefix by default.

### 1. Health Checks

#### `GET /api/health`
Returns the status of the API server.
```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "status": "healthy",
    "service": "PR Reviewer API"
  }
}
```

#### `GET /api/health/db`
Validates connectivity to PostgreSQL via Neon serverless connection.
```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "status": "connected",
    "database": "Neon PostgreSQL"
  }
}
```

---

### 2. GitHub Webhooks

#### `POST /api/webhooks/github`
Endpoint configured in your GitHub App settings to receive webhook payloads.

- **Headers required**:
  - `x-hub-signature-256`: HMAC-SHA256 signature generated by GitHub using your webhook secret.
  - `x-github-event`: Event type (e.g. `ping`, `pull_request`).
  - `x-github-delivery`: Unique delivery UUID.

- **Handled Events & Actions**:
  - `ping`: Confirms active webhook connection.
  - `pull_request`: Actions supported: `opened`, `synchronize`, `reopened`, `ready_for_review`.
    - Automatically fetches changed files and patch summaries.
    - Upserts installation, repository, and pull request records.
    - Creates or retrieves the review entry associated with the commit's `head_sha`.

---

### 3. Users

#### `GET /api/users/:id`
Retrieves a registered user by UUID.
- **Path Parameter**: `id` (`uuid`)
- **Responses**:
  - `200 OK`: Returns user profile.
  - `404 Not Found`: Returns `"User not found"`.

---

## 📁 Project Directory Structure

```plaintext
PRPilot/
├── apps/
│   ├── api/
│   │   ├── drizzle/               # Drizzle migration SQL files & snapshots
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── env.ts         # Zod schema validation for environment variables
│   │   │   ├── db/
│   │   │   │   ├── index.ts       # Neon HTTP driver & Drizzle client instance
│   │   │   │   └── schema/        # Relational schema definitions & pgEnums
│   │   │   │       ├── enums.ts
│   │   │   │       ├── findings.ts
│   │   │   │       ├── installations.ts
│   │   │   │       ├── pull-requests.ts
│   │   │   │       ├── repositories.ts
│   │   │   │       ├── reviews.ts
│   │   │   │       └── users.ts
│   │   │   ├── lib/
│   │   │   │   ├── api-response.ts # Standardized JSON envelope helpers
│   │   │   │   └── github.ts       # Octokit App instance with private key
│   │   │   ├── modules/
│   │   │   │   ├── github/         # GitHub API fetching & persistence services
│   │   │   │   ├── health/         # System and DB health endpoints
│   │   │   │   ├── installations/  # Installation entity queries
│   │   │   │   ├── pull-requests/  # Pull request upsert & retrieval
│   │   │   │   ├── repositories/   # Repository upsert & retrieval
│   │   │   │   ├── reviews/        # Review creation & state updates
│   │   │   │   ├── users/          # User routes & controller
│   │   │   │   └── webhooks/       # GitHub webhook verification & router
│   │   │   ├── plugins/
│   │   │   │   └── error-handler.ts # Global Elysia error plugin
│   │   │   └── index.ts            # API server entrypoint & route registration
│   │   ├── drizzle.config.ts       # Drizzle Kit configuration
│   │   └── package.json
│   ├── web/
│   │   ├── src/                    # React 19 UI components & styles
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── worker/
│       ├── src/
│       │   └── index.ts            # Background job consumer & analyzer
│       └── package.json
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── schemas/            # Shared Zod validation schemas
│       │   ├── types/              # Shared TypeScript contracts (Review, Status)
│       │   └── index.ts
│       └── package.json
├── bun.lock                        # Bun lockfile
├── package.json                    # Workspace root scripts & config
├── tsconfig.json                   # Root TypeScript configuration
└── README.md                       # Project documentation
```

---

## 🗺 Roadmap

- [x] Monorepo scaffold with Bun workspace & TypeScript
- [x] ElysiaJS API with Drizzle ORM and Neon PostgreSQL
- [x] Secure GitHub Webhook signature verification (`x-hub-signature-256`)
- [x] Octokit GitHub App authentication & PR diff pagination
- [x] Relational schema for installations, repos, PRs, reviews, and findings
- [ ] Worker queue integration (e.g., BullMQ or Redis-backed message bus)
- [ ] Gemini 1.5 / 2.0 integration for context-aware code review generation
- [ ] Semgrep static analysis runner containerized in worker
- [ ] Inline GitHub comments & review summary submission
- [ ] Interactive React dashboard to view findings, filter by severity, and adjust rule settings
- [ ] Custom user review rules and repository `.prpilot.yml` config file support

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) (or the repository's open source terms).
