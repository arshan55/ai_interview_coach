# AI Interview Coach

AI Interview Coach is a comprehensive interview preparation platform that leverages artificial intelligence to help users practice and improve their technical interview skills. The platform provides real-time feedback, tracks progress, and offers a personalized learning experience.

## Project Overview

The AI Interview Coach is designed to help developers prepare for technical interviews by providing a realistic interview environment. It simulates actual interview scenarios and provides immediate feedback on responses, helping users identify areas for improvement and build confidence.

### Key Features

1. **Role-Based Interview Practice**
   - Frontend Development interviews
   - Backend Development interviews
   - Full Stack Development interviews
   - Customizable interview scenarios

2. **Real-Time AI Feedback**
   - Instant analysis of responses
   - Detailed feedback on technical accuracy
   - Suggestions for improvement
   - Code quality assessment

3. **Progress Tracking**
   - Interview history
   - Performance metrics
   - Improvement trends
   - Skill assessment

4. **User Authentication**
   - Secure login system
   - Google OAuth integration
   - JWT-based authentication
   - Protected routes

5. **Responsive Design**
   - Mobile-first approach
   - Cross-device compatibility
   - Intuitive user interface
   - Smooth animations

## Technical Architecture

### Frontend Architecture

The frontend is built using Next.js 14, providing a robust and scalable user interface:

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Hooks and Context API
- **Animations**: Framer Motion for smooth transitions
- **API Integration**: RESTful API calls with error handling
- **Authentication**: JWT token management
- **Routing**: Next.js App Router

### Backend Architecture

The backend is powered by Node.js and Express, providing a secure and efficient API:

- **Server**: Node.js with Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT and Google OAuth
- **API Design**: RESTful architecture
- **Error Handling**: Centralized error management
- **Security**: Input validation and sanitization

## Project Structure

```
ai-interview-coach/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages
│   ├── components/          # Reusable React components
│   ├── context/            # React context providers
│   ├── types/              # TypeScript type definitions
│   └── public/             # Static assets
│
└── backend/                 # Express backend application
    ├── routes/             # API route handlers
    ├── models/             # MongoDB models
    ├── middleware/         # Custom middleware
    ├── config/             # Configuration files
    └── utils/              # Utility functions
```

## Setup and Installation

### Prerequisites

- Node.js (v18 or higher)
- MongoDB
- Google Cloud Platform account (for OAuth)
- Git

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/arshan55/ai_interview_coach.git
   cd ai-interview-coach/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   PORT=5000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth` - Get user profile

### Interview Endpoints

- `GET /api/interviews` - Get all interviews
- `POST /api/interviews` - Create new interview
- `GET /api/interviews/:id` - Get interview details
- `PUT /api/interviews/:id` - Update interview
- `DELETE /api/interviews/:id` - Delete interview

## Development Workflow

1. **Feature Development**
   - Create a new branch for each feature
   - Follow the established code structure
   - Write tests for new features
   - Document API changes

2. **Code Review**
   - Submit pull requests for review
   - Address review comments
   - Ensure all tests pass
   - Update documentation

3. **Deployment**
   - Frontend: Vercel
   - Backend: Render
   - Database: MongoDB Atlas

## Security Considerations

- JWT token-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- Rate limiting
- Secure environment variables

## Performance Optimization

- Frontend code splitting
- Image optimization
- API response caching
- Database indexing
- Lazy loading components

## Future Enhancements

1. **Technical Features**
   - Video interview support
   - Real-time code collaboration
   - Advanced AI feedback system
   - Custom interview templates

2. **User Experience**
   - Dark/Light theme
   - Offline support
   - Progressive Web App
   - Mobile application

3. **Analytics**
   - Detailed performance metrics
   - Skill gap analysis
   - Learning path recommendations
   - Progress visualization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

