# Tools, Commands & Capabilities

## Agent rule — root docs
Do not edit **`AGENTS.md`**, **`llms.txt`**, or **`skills.md`** unless the user explicitly requests updates to those files.

```text
ROOT_DOCS_EDIT: Do not modify AGENTS.md, llms.txt, or skills.md unless the user explicitly asks you to update those files (or one of them). Routine code or config changes do not imply permission to touch these three.
```

See also **`AGENTS.md`** and **`llms.txt`**.

## Setup & Installation
- **Python (optional)**: `pip install -r requirements.txt` — only if you add Python tooling; the app itself uses Node (see `requirements.txt` header).
- **Root Dependencies** (optional): `npm install`
- **Backend**: `cd backend && npm install`
- **Frontend**: `cd frontend && npm install`

## Environment Variables
- **Backend (`backend/.env`)**:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `PORT=5000` (or your chosen port; must match `NEXT_PUBLIC_BACKEND_URL`)
- **Frontend (`frontend/.env.local`)**:
  - `NEXT_PUBLIC_BACKEND_URL=http://localhost:5000` (must point at the running Express API)
  - `DATABASE_URL` — required for Prisma (PostgreSQL) when using Prisma client / `npm run build` in `frontend/`

## Run & build commands
| Purpose | Command |
|--------|---------|
| Backend (dev, nodemon) | `cd backend && npm run dev` |
| Backend (production) | `cd backend && npm start` |
| Frontend (dev) | `cd frontend && npm run dev` |
| Frontend (lint) | `cd frontend && npm run lint` |
| Frontend (production build) | `cd frontend && npm run build` |
| Frontend (production server, after build) | `cd frontend && npm start` |
| Prisma client only (from frontend) | `cd frontend && npx prisma generate` |
| Prisma migrate (when migrations exist) | `cd frontend && npx prisma migrate dev` |

**Typical local dev (two terminals)**:
1. `cd backend && npm run dev`
2. `cd frontend && npm run dev`

## Available Tools (Agent Contract)
- Codebase exploration: list directories, read files, search the repo.
- Source modification: apply focused patches; prefer matching existing style.
- Terminal: use for installs, tests, and local dev servers unless the user restricts it. Do not run destructive commands without explicit approval.
