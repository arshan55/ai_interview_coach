# AI Interview Coach

A comprehensive, AI-powered interview preparation platform that helps developers practice and master technical interviews through realistic scenarios, intelligent feedback, and detailed progress tracking.

**Live Demo:** [Coming Soon]  
**GitHub:** [Repository Link]  
**Documentation:** [Full Docs](./docs)

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technical Architecture](#technical-architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup and Installation](#setup-and-installation)
- [API Documentation](#api-documentation)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Project Overview

AI Interview Coach is designed to bridge the gap between learning and actual interview preparation. The platform creates a realistic interview environment where developers can:

- Practice with industry-relevant questions curated by experienced professionals
- Receive instant, AI-powered feedback on their technical responses
- Track performance metrics and identify improvement areas
- Build confidence through repeated practice sessions
- Learn from detailed explanations and best practices

The application combines modern web technologies with advanced AI capabilities to deliver a personalized, adaptive learning experience tailored to each user's skill level and goals.

### 🌟 Key Features

#### 1. **Role-Based Interview Practice**
   - **Frontend Development** - React, Vue, Angular, and CSS/HTML questions
   - **Backend Development** - Node.js, Python, Java, and database design questions
   - **Full Stack Development** - Complete system design and end-to-end scenarios
   - **Custom Scenarios** - Build personalized interview sessions based on your goals
   - **Difficulty Levels** - Junior, Mid, and Senior level questions with progressive difficulty

#### 2. **Real-Time AI Feedback System**
   - **Instant Analysis** - Get immediate feedback as you complete each answer
   - **Code Quality Assessment** - Receive detailed evaluation of code correctness, efficiency, and best practices
   - **Technical Accuracy** - Detailed feedback on technical concepts and implementation approaches
   - **Improvement Suggestions** - Actionable recommendations to enhance your responses
   - **Comparison Metrics** - See how your answers compare to ideal solutions and other candidates

#### 3. **Comprehensive Progress Tracking**
   - **Interview History** - Complete record of all practice sessions with timestamps
   - **Performance Analytics** - Detailed metrics including accuracy, response time, and confidence scores
   - **Improvement Trends** - Visual representations of your progress over time
   - **Skill Assessment** - Identify strengths and weaknesses across different technical domains
   - **Certification Ready** - Track readiness for specific certifications and interviews

#### 4. **Secure User Authentication**
   - **Email/Password Authentication** - Secure registration and login system
   - **Google OAuth Integration** - One-click sign-up with Google accounts
   - **JWT Token Management** - Stateless, secure session management
   - **Protected Routes** - Role-based access control for sensitive endpoints
   - **Secure Password Storage** - Industry-standard bcrypt hashing

#### 5. **Responsive & Modern Design**
   - **Mobile-First Approach** - Fully optimized for phones, tablets, and desktops
   - **Cross-Device Compatibility** - Seamless experience across all devices
   - **Intuitive UI/UX** - Clean, user-friendly interface with minimal learning curve
   - **Smooth Animations** - Professional transitions and visual feedback
   - **Accessibility Features** - WCAG compliant for users with various needs

## 🏗️ Technical Architecture

### Frontend Architecture

The frontend is built with **Next.js 14** and **TypeScript**, providing a fast, scalable, and developer-friendly experience:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 14 | Server-side rendering, static generation, API routes |
| **Language** | TypeScript | Type-safe development with compile-time checking |
| **Styling** | Tailwind CSS | Utility-first CSS framework for rapid UI development |
| **State Management** | React Hooks + Context API | Lightweight state management without external libraries |
| **Animations** | Framer Motion | Smooth, performant animations and transitions |
| **UI Components** | Custom + Headless UI | Accessible, unstyled component library |
| **API Client** | Axios/Fetch | HTTP client for backend communication |
| **Authentication** | NextAuth.js / JWT | Secure session and token management |
| **Routing** | Next.js App Router | File-based routing with layouts and segments |

**Key Features:**
- Server-side rendering for SEO optimization
- Incremental Static Regeneration (ISR) for dynamic content
- API routes for backend integration
- Environment-based configuration
- Hot module replacement for faster development

### Backend Architecture

The backend is powered by **Node.js** and **Express**, providing a RESTful API with advanced features:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js (v18+) | JavaScript runtime for server-side execution |
| **Framework** | Express.js | Lightweight web framework with middleware support |
| **Database** | MongoDB | NoSQL database for flexible data storage |
| **ODM** | Mongoose / Prisma | Object Document Mapping for schema validation |
| **Authentication** | JWT + Passport.js | Token-based and OAuth authentication |
| **API Design** | RESTful + JSON | Standard API architecture with JSON payloads |
| **Error Handling** | Custom Middleware | Centralized error management and logging |
| **Validation** | Joi / Zod | Request validation and data sanitization |
| **Security** | Helmet, CORS | HTTP headers and cross-origin protection |

**Key Features:**
- Middleware-based request processing
- Async/await for clean asynchronous code
- MongoDB connection pooling for performance
- Comprehensive error handling and logging
- Rate limiting and request throttling
- Input validation on every endpoint

### Database Schema

```
MongoDB Collections:
├── Users
│   ├── _id, email, passwordHash, googleId
│   ├── firstName, lastName, profileImage
│   ├── createdAt, updatedAt
│   └── preferences (theme, notifications, etc.)
│
├── Interviews
│   ├── _id, userId, role (frontend/backend/fullstack)
│   ├── questions (array of question IDs)
│   ├── startTime, endTime, duration
│   ├── score, status (completed/in-progress)
│   └── feedback (AI-generated)
│
├── Questions
│   ├── _id, text, category, difficulty
│   ├── expectedAnswerOutline
│   ├── tags (array of skill tags)
│   └── createdAt
│
└── Responses
    ├── _id, interviewId, questionId, userId
    ├── answer (user's response)
    ├── aiEvaluation (score, feedback, suggestions)
    └── timeSpent
```

## 📁 Project Structure

```
ai-interview-coach/
│
├── 📄 README.md                    # Project documentation
├── 📄 package.json                 # Root dependencies
├── 📄 AGENTS.md                    # AI Agent configuration
├── 📄 skills.md                    # System skills documentation
│
├── 🎨 frontend/                    # Next.js Frontend Application
│   ├── 📄 package.json             # Frontend dependencies
│   ├── 📄 tsconfig.json            # TypeScript configuration
│   ├── 📄 next.config.js           # Next.js configuration
│   ├── 📄 tailwind.config.js       # Tailwind CSS configuration
│   ├── 📄 postcss.config.js        # PostCSS configuration
│   │
│   ├── 🎯 app/                     # Next.js App Router
│   │   ├── 📄 layout.tsx           # Root layout component
│   │   ├── 📄 page.tsx             # Home page
│   │   ├── 📄 globals.css          # Global styles
│   │   │
│   │   ├── 🔐 api/                 # API Routes
│   │   │   └── auth/               # Authentication endpoints
│   │   │       ├── login/          # POST - User login
│   │   │       ├── register/       # POST - User registration
│   │   │       ├── dev-login/      # POST - Development login
│   │   │       └── google/         # Google OAuth flow
│   │   │           ├── callback/   # OAuth callback handler
│   │   │           └── user/       # Get OAuth user info
│   │   │
│   │   ├── 📝 interview/           # Interview pages
│   │   │   ├── page.tsx            # Interview selection
│   │   │   ├── [id]/page.tsx       # Interview session
│   │   │   ├── [id]/answer/        # Submit answer
│   │   │   └── role-select/        # Role selection page
│   │   │
│   │   ├── 👤 profile/             # User profile
│   │   ├── 🔑 login/               # Login page
│   │   └── ✍️  register/           # Registration page
│   │
│   ├── 🧩 components/              # Reusable React Components
│   │   ├── InterviewTopBar.tsx     # Interview header
│   │   ├── Navigation.tsx          # Navigation component
│   │   └── PageTransition.tsx      # Page animation wrapper
│   │
│   ├── 📚 lib/                     # Utility Functions
│   │   ├── devAuth.ts              # Development authentication
│   │   ├── interviewConstants.ts   # Interview configuration
│   │   └── prisma.ts               # Prisma client setup
│   │
│   ├── 💾 prisma/                  # Database Schema
│   │   └── schema.prisma           # Prisma schema definition
│   │
│   ├── 🔌 services/                # API Service Layer
│   │   └── interviewService.js     # Interview API calls
│   │
│   ├── 🖼️  public/                 # Static Assets
│   │   ├── images/
│   │   └── icons/
│   │
│   └── .env.local                  # Local environment variables
│
└── 🚀 backend/                     # Express Backend Server
    ├── 📄 package.json             # Backend dependencies
    ├── 📄 server.js                # Express app entry point
    │
    ├── 🗄️  models/                 # MongoDB Models
    │   ├── User.js                 # User data model
    │   └── Interview.js            # Interview data model
    │
    ├── 🛣️  routes/                 # API Routes
    │   └── api/
    │       ├── auth.js             # Authentication routes
    │       ├── interviews.js       # Interview CRUD routes
    │       └── users.js            # User management routes
    │
    ├── ⚙️  middleware/              # Express Middleware
    │   └── auth.js                 # JWT authentication middleware
    │
    ├── ⚙️  config/                  # Configuration Files
    │   └── db.js                   # MongoDB connection config
    │
    └── .env                        # Environment variables
```

### Key Directory Descriptions

**Frontend Structure:**
- **app/** - Contains all pages and API routes using Next.js App Router
- **components/** - Reusable React components for consistent UI
- **lib/** - Shared utilities, authentication helpers, and configurations
- **services/** - API integration layer for communicating with backend
- **prisma/** - Database schema and ORM configuration

**Backend Structure:**
- **models/** - Mongoose schemas defining data structure and validation
- **routes/** - Express route handlers for all API endpoints
- **middleware/** - Custom middleware for authentication, validation, error handling
- **config/** - Database connection and application configuration

## 🛠️ Prerequisites

Before setting up the project, ensure you have the following installed:

| Requirement | Version | Installation |
|------------|---------|--------------|
| **Node.js** | v18+ | [Download](https://nodejs.org/) |
| **npm** | v9+ | Comes with Node.js |
| **MongoDB** | v5.0+ | [Download](https://www.mongodb.com/try/download/community) or use Atlas |
| **Git** | Latest | [Download](https://git-scm.com/) |
| **Google Cloud Account** | - | [Create Account](https://cloud.google.com/) (for OAuth) |

### System Requirements

- **OS**: macOS, Linux, or Windows (WSL2 recommended)
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 2GB free space
- **Internet**: Required for OAuth and external API calls

## 📦 Setup and Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/arshan55/ai_interview_coach.git
cd ai_interview_coach
```

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory
```bash
cd backend
```

#### 2.2 Install Dependencies
```bash
npm install
```

#### 2.3 Environment Configuration

Create a `.env` file in the backend directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/interview_coach
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/dbname

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# AI/LLM Configuration (if applicable)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
```

#### 2.4 Configure MongoDB

**Option A: Local MongoDB**
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# Verify connection
mongosh
```

**Option B: MongoDB Atlas (Cloud)**
1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Get your connection string and add to `.env`

#### 2.5 Start Backend Server
```bash
npm run dev
# or for production
npm start
```

The backend will be available at `http://localhost:5000`

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory
```bash
cd ../frontend
```

#### 3.2 Install Dependencies
```bash
npm install
```

#### 3.3 Environment Configuration

Create a `.env.local` file in the frontend directory:

```env
# Backend API Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# Google OAuth (from Google Cloud Console)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Application Environment
NEXT_PUBLIC_ENV=development
```

#### 3.4 Start Frontend Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Step 4: Google OAuth Setup (Optional but Recommended)

1. **Create OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized URIs:
     - `http://localhost:3000`
     - `http://localhost:3000/api/auth/google/callback`

2. **Add Credentials to `.env` files:**
   - Frontend: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - Backend: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Verification Checklist

- [ ] MongoDB is running and accessible
- [ ] Backend server starts without errors on port 5000
- [ ] Frontend server starts without errors on port 3000
- [ ] Can access `http://localhost:3000` in browser
- [ ] Backend API responds at `http://localhost:5000/api/health`
- [ ] Google OAuth credentials are configured (optional)

## 🔌 API Documentation

### Base URL
```
Development: http://localhost:5000
Production: https://api.interviewcoach.com (example)
```

### Authentication

All endpoints require a JWT token (except auth endpoints) in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

### 🔐 Authentication Endpoints

#### Register New User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}

Response (201):
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "userId",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "success": true,
  "token": "jwt_token_here",
  "user": { /* user object */ }
}
```

#### Google OAuth Login Initiate
```
GET /api/auth/google

Redirects to Google login page
```

#### Google OAuth Callback
```
GET /api/auth/google/callback?code=auth_code

Response (302 redirect with token):
Redirects to frontend with token in query: http://localhost:3000?token=jwt_token
```

#### Get Current User Profile
```
GET /api/auth/user
Headers: Authorization: Bearer <token>

Response (200):
{
  "id": "userId",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImage": "url_or_null",
  "createdAt": "2024-01-15T10:00:00Z",
  "statistics": {
    "totalInterviews": 5,
    "averageScore": 78.5,
    "totalTimeSpent": 3600
  }
}
```

#### Logout
```
POST /api/auth/logout
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 📝 Interview Endpoints

#### Get All Interviews for User
```
GET /api/interviews
Headers: Authorization: Bearer <token>

Query Parameters:
- role: frontend|backend|fullstack (optional filter)
- status: completed|in-progress (optional filter)
- limit: number (default: 10)
- page: number (default: 1)

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "interviewId",
      "userId": "userId",
      "role": "frontend",
      "questions": ["q1", "q2", "q3"],
      "score": 85,
      "status": "completed",
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T11:00:00Z",
      "duration": 3600,
      "feedback": "Good performance..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

#### Create New Interview
```
POST /api/interviews
Headers: Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "frontend",
  "difficulty": "intermediate",
  "questionCount": 5
}

Response (201):
{
  "success": true,
  "data": {
    "id": "newInterviewId",
    "role": "frontend",
    "questions": [/* array of questions */],
    "status": "in-progress",
    "startTime": "2024-01-15T10:00:00Z"
  }
}
```

#### Get Interview Details
```
GET /api/interviews/:id
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "id": "interviewId",
    "role": "frontend",
    "questions": [/* questions array */],
    "responses": [/* user responses */],
    "score": 85,
    "status": "completed",
    "feedback": "Detailed feedback..."
  }
}
```

#### Submit Answer to Question
```
POST /api/interviews/:id/answer
Headers: Authorization: Bearer <token>
Content-Type: application/json

{
  "questionId": "questionId",
  "answer": "User's response text",
  "timeSpent": 120
}

Response (200):
{
  "success": true,
  "data": {
    "responseId": "responseId",
    "questionId": "questionId",
    "aiEvaluation": {
      "score": 80,
      "correctness": "Good",
      "feedback": "Your answer covers...",
      "suggestions": ["Consider...", "You could improve..."],
      "comparisonScore": 85
    }
  }
}
```

#### Update Interview (Save Progress)
```
PUT /api/interviews/:id
Headers: Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in-progress"
}

Response (200):
{
  "success": true,
  "data": { /* updated interview */ }
}
```

#### End Interview
```
POST /api/interviews/:id/end
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "interviewId": "interviewId",
    "finalScore": 82,
    "status": "completed",
    "completedAt": "2024-01-15T11:00:00Z"
  }
}
```

#### Delete Interview
```
DELETE /api/interviews/:id
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Interview deleted successfully"
}
```

### 👥 User Endpoints

#### Get User Profile
```
GET /api/users/:id
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": { /* user profile */ }
}
```

#### Update User Profile
```
PUT /api/users/:id
Headers: Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "profileImage": "image_url"
}

Response (200):
{
  "success": true,
  "data": { /* updated user */ }
}
```

#### Get User Statistics
```
GET /api/users/:id/statistics
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "totalInterviews": 15,
    "completedInterviews": 12,
    "averageScore": 76.5,
    "highestScore": 92,
    "lowestScore": 65,
    "totalTimeSpent": 7200,
    "roleStatistics": {
      "frontend": { "count": 5, "avgScore": 78 },
      "backend": { "count": 4, "avgScore": 75 },
      "fullstack": { "count": 3, "avgScore": 76 }
    }
  }
}
```

### Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

## 🚀 Development Guide

### Running Both Servers Simultaneously

**Option 1: Using Two Terminal Windows**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Option 2: Using concurrently (from root)**
```bash
npm install -D concurrently

# Add to root package.json:
"scripts": {
  "dev": "concurrently \"cd backend && npm run dev\" \"cd frontend && npm run dev\""
}

npm run dev
```

### Development Workflow

#### 1. **Feature Development**

```bash
# Create a new branch for your feature
git checkout -b feature/your-feature-name

# Make your changes following the structure
# - For backend: add routes, models, middleware as needed
# - For frontend: add pages, components, services

# Test your changes locally
npm run dev

# Commit with descriptive messages
git add .
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name
```

#### 2. **Code Style & Conventions**

**TypeScript/JavaScript:**
- Use ESLint for linting
- Follow consistent naming conventions (camelCase for variables/functions)
- Add JSDoc comments for complex functions
- Keep functions small and focused

**React Components:**
- Use functional components with hooks
- Place components in appropriate folders
- Export components at the end
- Use TypeScript interfaces for props

**Backend:**
- Follow RESTful conventions
- Use middleware for cross-cutting concerns
- Validate all inputs
- Return consistent error responses

#### 3. **Testing**

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run tests in watch mode
npm run test:watch
```

#### 4. **Code Review Process**

1. Push your branch to your fork
2. Create a Pull Request on GitHub
3. Describe what your changes do
4. Link any related issues
5. Wait for review feedback
6. Address review comments
7. Merge when approved

#### 5. **Commit Messages**

Follow conventional commits:

```
feat: add new interview role selection
fix: resolve API token expiration issue
docs: update API documentation
refactor: restructure interview service
test: add tests for authentication
chore: update dependencies
```

### Useful NPM Scripts

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm test            # Run tests
```

**Backend:**
```bash
npm run dev          # Start with nodemon (auto-restart)
npm start           # Start server
npm test            # Run tests
npm run lint        # Run ESLint
```

### Database Management

**MongoDB Compass** (GUI for MongoDB):
```bash
# Download: https://www.mongodb.com/try/download/compass
# Connect to: mongodb://localhost:27017
```

**Common Database Operations:**
```bash
# Using mongosh (MongoDB shell)
mongosh

# List databases
show dbs

# Use a database
use interview_coach

# List collections
show collections

# View a collection
db.users.find()

# Count documents
db.interviews.countDocuments()
```

### Environment Management

**Development:**
- Use `.env` files (not committed to git)
- Include mock/test credentials
- Use local MongoDB

**Production:**
- Use environment variables from hosting platform
- Use MongoDB Atlas for database
- Update all API keys and secrets

### Debugging

**Frontend:**
```bash
# Chrome DevTools
- F12 or Cmd+Option+I
- Network tab for API requests
- Console for errors
- React DevTools browser extension
```

**Backend:**
```bash
# Console logs
console.log(), console.error()

# Debugging with VS Code
- Add breakpoints
- Press F5 or Run → Start Debugging
- Use Debug Console
```

### Performance Optimization Tips

**Frontend:**
- Use React DevTools Profiler
- Lazy load components with React.lazy()
- Optimize images
- Use Next.js Image component

**Backend:**
- Use database indexing
- Implement caching strategies
- Monitor API response times
- Profile with Node profiler

## 🔒 Security Considerations

### Authentication & Authorization
- **JWT Tokens** - Secure, stateless authentication with expiration
- **Password Hashing** - bcrypt for secure password storage
- **Token Refresh** - Implement refresh tokens for extended sessions
- **HTTPS** - Always use HTTPS in production
- **CORS** - Restrict origins to trusted domains

### Data Protection
- **Input Validation** - Sanitize and validate all user inputs
- **SQL Injection Prevention** - Use parameterized queries
- **XSS Protection** - Sanitize user-generated content
- **Rate Limiting** - Prevent brute force attacks
- **OWASP Compliance** - Follow OWASP Top 10 guidelines

### Environment Security
- **Secret Management** - Never commit `.env` files
- **API Keys** - Rotate keys periodically
- **Secure Headers** - Use Helmet.js for security headers
- **Database Access** - Use least privilege principle
- **Monitoring** - Log and monitor suspicious activities

### OAuth Security
- **State Parameter** - Prevent CSRF attacks
- **Redirect URI** - Whitelist authorized redirect URIs
- **Scope Limitation** - Request only necessary permissions
- **Token Storage** - Store tokens securely (HttpOnly cookies)

## ⚡ Performance Optimization

### Frontend Optimization
- **Code Splitting** - Dynamic imports with React.lazy()
- **Image Optimization** - Use Next.js Image component
- **CSS Optimization** - Purge unused CSS with Tailwind
- **Caching** - Implement service workers
- **Bundle Analysis** - Monitor bundle size growth
- **SEO** - Meta tags and structured data

### Backend Optimization
- **Database Indexing** - Index frequently queried fields
- **Query Optimization** - Use lean() for Mongoose queries
- **Caching Layer** - Implement Redis for frequently accessed data
- **Connection Pooling** - Reuse database connections
- **API Response** - Paginate large datasets
- **Compression** - Enable gzip compression

### Monitoring & Metrics
```bash
# Frontend Performance
- Lighthouse CI
- Web Vitals
- User Experience Metrics

# Backend Performance
- Response time tracking
- Database query monitoring
- Error rate tracking
- Request rate monitoring
```

## 🐛 Troubleshooting

### Common Issues and Solutions

#### MongoDB Connection Issues
```bash
# Error: "connect ECONNREFUSED 127.0.0.1:27017"
# Solution 1: Start MongoDB
brew services start mongodb-community

# Solution 2: Check connection string in .env
# Should be: mongodb://localhost:27017/interview_coach

# Solution 3: Use MongoDB Atlas
# Update MONGODB_URI to: mongodb+srv://user:password@cluster.mongodb.net/dbname
```

#### Port Already in Use
```bash
# Error: "EADDRINUSE: address already in use :::5000"

# Find process using port 5000
lsof -i :5000

# Kill the process (macOS/Linux)
kill -9 <PID>

# Or use a different port
PORT=5001 npm run dev
```

#### Node Module Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

#### CORS Errors
```
Error: "Access to XMLHttpRequest blocked by CORS policy"

Solution:
1. Check CORS configuration in backend/server.js
2. Verify FRONTEND_URL in .env matches actual frontend URL
3. Ensure credentials are included in frontend requests

axios.defaults.withCredentials = true;
```

#### JWT Token Expiration
```
Error: "Unauthorized - Invalid token"

Solution:
1. Check token expiration time in JWT_EXPIRE
2. Implement refresh token mechanism
3. Clear localStorage and login again
```

#### Environment Variables Not Loading
```bash
# Ensure .env file exists in correct location
# .env for backend (backend/.env)
# .env.local for frontend (frontend/.env.local)

# Restart dev server after changing .env
```

### Getting Help

1. **Check Existing Issues** - GitHub Issues page
2. **Read Documentation** - Check README and API docs
3. **Search Stack Overflow** - Use relevant tags
4. **Ask in Community** - Create detailed GitHub issue

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Setting Up Development Environment

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/ai_interview_coach.git
cd ai_interview_coach

# 3. Add upstream remote
git remote add upstream https://github.com/original/ai_interview_coach.git

# 4. Create a new branch
git checkout -b feature/your-feature-name
```

### Contribution Guidelines

1. **Create Feature Branch** - Branch naming: `feature/`, `fix/`, `docs/`
2. **Follow Code Style** - Use existing conventions
3. **Write Tests** - Add tests for new features
4. **Update Documentation** - Keep README and docs updated
5. **Commit Clearly** - Use conventional commit messages
6. **Create Pull Request** - Describe changes and link issues
7. **Respond to Reviews** - Address feedback from reviewers
8. **No Merge Conflicts** - Rebase if needed

### Commit Guidelines

```bash
# Good commit message
git commit -m "feat: add interview history filtering

- Add role-based filtering
- Add date range filtering
- Update API endpoint

Fixes #123"

# Poor commit message
git commit -m "update stuff"
```

### Pull Request Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
Describe how to test these changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for clarity
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No new warnings generated

## Screenshots
If applicable, add screenshots

## Related Issues
Fixes #(issue)
```

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details

## 📞 Support & Contact

- **Issues** - [GitHub Issues](https://github.com/arshan55/ai_interview_coach/issues)
- **Email** - [contact email]
- **Documentation** - [Full Docs](./docs)
- **Discord** - [Community Server]

## 🙏 Acknowledgments

- MongoDB for the excellent database
- Next.js team for the amazing framework
- Express.js community
- All contributors who have helped this project

## 🗺️ Roadmap

### Q2 2024
- [ ] Video interview support
- [ ] Advanced AI feedback system
- [ ] Custom interview templates

### Q3 2024
- [ ] Real-time code collaboration
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard

### Q4 2024
- [ ] Certification track system
- [ ] AI-powered interview recommendations
- [ ] Interview scheduling with peers

---

**Made with ❤️ by the AI Interview Coach Team**

Last Updated: 2024-01-15

