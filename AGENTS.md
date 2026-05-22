# Agent Guardrails & Tech Stack

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Prisma, Lucide React, React Webcam
- **Backend**: Node.js, Express, MongoDB, Mongoose ODM
- **Authentication**: JWT, Google OAuth
- **AI Integration**: Google Generative AI (`@google/generative-ai`)

## Coding Rules
- Follow strictly the Next.js App Router conventions.
- Use TypeScript for all frontend components and ensure strict typing.
- Separate business logic into `services/` and `lib/` in the frontend, and `routes/`, `models/`, and `middleware/` in the backend.
- Format code according to existing `package.json` standard.
- Prefer Tailwind CSS utility classes. Avoid creating custom CSS files unless necessary.

## Agent Permissions & Rules
- **MUST**:
  - Always verify code execution through existing test suites if available before claiming task completion.
  - Inform the user explicitly when modifying `package.json` or installing new dependencies.
  - Prioritize code editing tools over bash commands for source modification.
- **FORBIDDEN**:
  - Do NOT delete files or directories without explicit user permission.
  - Do NOT modify the database connection strings or secrets without authorization.
  - Do NOT push code to production directly. Always rely on the CI/CD pipeline (Vercel/Render).
  - Do NOT use wildcards for root-level permissions.

## Project documentation (root companion files)
These files describe structure, commands, and tooling:
- **`llms.txt`** — high-level project map and architecture notes for LLM context.
- **`skills.md`** — setup, env vars, and npm/CLI commands agents and humans use.
- **`requirements.txt`** — optional Python/pip packages only; the app runs on Node (npm in `frontend/` and `backend/`).

**Editing rule for agents**

```text
ROOT_DOCS_EDIT: Do not modify AGENTS.md, llms.txt, or skills.md unless the user explicitly asks you to update those files (or one of them). Routine code or config changes do not imply permission to touch these three.
```
