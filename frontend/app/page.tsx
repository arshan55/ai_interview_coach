'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Interview {
  _id: string;
  date: string;
  role?: string;
  programmingLanguage?: string;
  overallScore?: number;
  overallFeedback?: string;
}

interface InterviewStats {
  totalInterviews: number;
  averageScore: number;
  bestScore: number;
  recentInterviews: Interview[];
  totalQuestions: number;
  lastInterviewDate?: string;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [interviewsError, setInterviewsError] = useState<string | null>(null);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Token present:', !!token);
    setIsAuthenticated(!!token);

    // Fetch interviews and stats if authenticated
    if (token) {
      const fetchData = async () => {
        setInterviewsLoading(true);
        setInterviewsError(null);
        try {
          console.log('Fetching interviews...');
          // Fetch interviews
          const interviewsResponse = await fetch('/api/interviews/user', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('Response status:', interviewsResponse.status);
          console.log('Response headers:', Object.fromEntries(interviewsResponse.headers.entries()));

          // Read the response body as text once
          const responseBodyText = await interviewsResponse.text();
          console.log('Raw response body:', responseBodyText);

          if (!interviewsResponse.ok) {
            if (interviewsResponse.status === 401) {
              console.log('Token expired or invalid');
              localStorage.removeItem('token');
              setIsAuthenticated(false);
              throw new Error('Session expired. Please sign in again.');
            }
            
            let errorMessage = 'Failed to fetch interviews';
            try {
              const errorData = JSON.parse(responseBodyText);
              errorMessage = errorData.error || errorData.msg || errorMessage;
            } catch (e) {
              // If parsing fails, use the raw text as the error message
              console.error('Non-JSON error response:', responseBodyText);
              errorMessage = responseBodyText || errorMessage;
            }
            throw new Error(errorMessage);
          }

          // If response is OK, parse the already-read text as JSON
          const interviewsData = JSON.parse(responseBodyText);
          console.log('Interviews data:', interviewsData);
          setInterviews(interviewsData);

          // Calculate stats
          const statsData: InterviewStats = {
            totalInterviews: interviewsData.length,
            averageScore: interviewsData.length > 0 
              ? interviewsData.reduce((sum: number, interview: Interview) => sum + (interview.overallScore || 0), 0) / interviewsData.length 
              : 0,
            bestScore: interviewsData.length > 0 
              ? Math.max(...interviewsData.map((interview: Interview) => interview.overallScore || 0))
              : 0,
            recentInterviews: interviewsData.slice(0, 3),
            totalQuestions: interviewsData.length,
            lastInterviewDate: interviewsData.length > 0 ? interviewsData[interviewsData.length - 1].date : undefined
          };
          setStats(statsData);
        } catch (err) {
          console.error('Error fetching interviews:', err);
          setInterviewsError(err instanceof Error ? err.message : 'Failed to fetch interviews');
          setInterviews([]);
          setStats(null);
        } finally {
          setInterviewsLoading(false);
        }
      };

      fetchData();
    }
  }, [isAuthenticated]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const deleteInterview = async (interviewId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete interview');
      }

      // Remove the deleted interview from the state
      setInterviews(prevInterviews => prevInterviews.filter(interview => interview._id !== interviewId));
    } catch (err) {
      console.error('Error deleting interview:', err);
      setInterviewsError(err instanceof Error ? err.message : 'Failed to delete interview');
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
              <span className="block">Master Your Interview Skills</span>
              <span className="block text-blue-500">with AI-Powered Practice</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-slate-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Get personalized feedback and improve your interview performance with our AI-powered interview coach.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              {isAuthenticated ? (
                <Link
                  href="/interview/role-select"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                >
                  Start Interview
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>

          {/* Stats Section for Authenticated Users */}
          {isAuthenticated && stats && (
            <div className="mt-16">
              <h2 className="text-3xl font-bold text-white mb-8">Your Interview Stats</h2>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700">
                  <h3 className="text-xl font-semibold text-white mb-2">Total Interviews</h3>
                  <p className="text-3xl font-bold text-blue-500">{stats.totalInterviews}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700">
                  <h3 className="text-xl font-semibold text-white mb-2">Average Score</h3>
                  <p className="text-3xl font-bold text-blue-500">{stats.averageScore.toFixed(1)}/10</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700">
                  <h3 className="text-xl font-semibold text-white mb-2">Questions Answered</h3>
                  <p className="text-3xl font-bold text-blue-500">{stats.totalQuestions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Interviews Section */}
          {isAuthenticated && (
            <div className="mt-16">
              <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
                <h2 className="text-2xl font-semibold text-white mb-4">Your Interviews</h2>

                {interviewsLoading ? (
                  <p className="text-gray-300">Loading your interviews...</p>
                ) : interviewsError ? (
                  <p className="text-red-500">Error loading interviews: {interviewsError}</p>
                ) : interviews.length > 0 ? (
                  <ul className="space-y-4">
                    {interviews.map((interview: Interview) => (
                      <li key={interview._id} className="bg-gray-700 p-4 rounded-md flex justify-between items-center">
                        <div>
                          <p className="text-lg font-semibold text-white">{interview.role?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                          {interview.programmingLanguage && (
                            <p className="text-sm text-gray-400">Language: {interview.programmingLanguage}</p>
                          )}
                          <p className="text-sm text-gray-400">{formatDateTime(interview.date)}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/interview/${interview._id}`}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => deleteInterview(interview._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-300">You haven't completed any interviews yet. Start one above!</p>
                )}
              </div>
            </div>
          )}

          {/* Features Section */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-white mb-8">Why Choose Our AI Interview Coach?</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-2">Practice with Realistic Questions</h3>
                <p className="text-base text-slate-300">
                  Our AI-powered interview coach provides you with realistic interview questions tailored to your field and experience level.
                </p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-2">Get Personalized Feedback</h3>
                <p className="text-base text-slate-300">
                  Receive personalized feedback on your responses to help you improve your interview performance.
                </p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-2">Track Your Progress</h3>
                <p className="text-base text-slate-300">
                  Monitor your improvement over time with detailed performance analytics.
                </p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-2">Improve Your Skills</h3>
                <p className="text-base text-slate-300">
                  Focus on improving your skills and increasing your confidence with our AI-powered interview coach.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
