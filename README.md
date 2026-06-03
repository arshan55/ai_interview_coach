# AI Interview Coach

Practice technical interviews with AI-driven feedback, role-based scenarios, and progress tracking. This repo contains a Next.js 14 frontend and an Express + MongoDB backend.

## Highlights

- Role-based interview practice (Frontend, Backend, Full Stack)
- Real-time AI feedback on responses
- Interview history and performance insights
- JWT and Google OAuth authentication
- Responsive UI with smooth transitions

## Tech Stack

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT + Google OAuth

## Project Structure

```
ai-interview-coach/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages
│   ├── components/          # Reusable React components
│   ├── public/              # Static assets
│   └── prisma/              # Prisma schema
└── backend/                 # Express backend application
    ├── routes/              # API route handlers
    ├── models/              # MongoDB models
    ├── middleware/          # Custom middleware
    └── config/              # Configuration files
```

## Requirements

- Node.js 18+
- MongoDB (local or Atlas)
- Google Cloud project for OAuth

## Quick Start

### 1) Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
PORT=5000
```

Start the API server:

```bash
npm run dev
```

### 2) Frontend

```bash
cd ../frontend
npm install
```

Create a `.env.local` file in `frontend/`:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

Start the web app:

```bash
npm run dev
```

Open http://localhost:3000

## API Overview

**Auth**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/google`
- `GET /api/auth`

**Interviews**
- `GET /api/interviews`
- `POST /api/interviews`
- `GET /api/interviews/:id`
- `PUT /api/interviews/:id`
- `DELETE /api/interviews/:id`

## Scripts

**backend/**
- `npm run dev` - start API server

**frontend/**
- `npm run dev` - start Next.js app

## Roadmap

- Video interview support
- Collaborative coding sessions
- Advanced feedback analytics
- PWA and offline support

## Contributing

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a pull request

