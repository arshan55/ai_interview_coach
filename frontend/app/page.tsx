'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Eye, EyeOff, MessageSquare, Users, BookOpen, Play, ArrowRight, TrendingUp, Calendar, Award, Target, Trash2 } from 'lucide-react';

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

const AIInterviewCoach = () => {
  const [currentView, setCurrentView] = useState('home');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [interviewsError, setInterviewsError] = useState<string | null>(null);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showAllInterviews, setShowAllInterviews] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    // Fetch interviews and stats if authenticated
    if (token) {
      const fetchData = async () => {
        setInterviewsLoading(true);
        setInterviewsError(null);
        try {
          // Fetch interviews
          const interviewsResponse = await fetch('/api/interviews/user', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!interviewsResponse.ok) {
            if (interviewsResponse.status === 401) {
              localStorage.removeItem('token');
              setIsAuthenticated(false);
              throw new Error('Session expired. Please sign in again.');
            }
            
            let errorMessage = 'Failed to fetch interviews';
            try {
              const errorData = JSON.parse(await interviewsResponse.text());
              errorMessage = errorData.error || errorData.msg || errorMessage;
            } catch (e) {
              // If parsing fails, use the raw text as the error message
              errorMessage = await interviewsResponse.text() || errorMessage;
            }
            throw new Error(errorMessage);
          }

          // If response is OK, parse the already-read text as JSON
          const interviewsData = JSON.parse(await interviewsResponse.text());
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setIsAuthenticated(true);
        setCurrentView('dashboard');
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Handle error display here
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentView('home');
    setStats(null);
    setInterviews([]);
  };

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
        setCurrentView('login');
        return;
      }

      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete interview');
      }

      // Remove the deleted interview from the state
      setInterviews(prevInterviews => prevInterviews.filter(interview => interview._id !== interviewId));
      
      // Update stats
      if (stats) {
        const updatedStats = {
          ...stats,
          totalInterviews: stats.totalInterviews - 1,
          recentInterviews: stats.recentInterviews.filter(interview => interview._id !== interviewId)
        };
        setStats(updatedStats);
      }
    } catch (err) {
      console.error('Error deleting interview:', err);
      setInterviewsError(err instanceof Error ? err.message : 'Failed to delete interview');
    }
  };

  // Add smooth scroll handler
  const handleSmoothScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // PatternBackground, LoginView, DashboardView, HomeView definitions
  const PatternBackground = () => (
    <div className="absolute inset-0 opacity-20">
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23475569' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px'
      }} />
    </div>
  );

  const LoginView = () => (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
      <PatternBackground />
      <div className="relative z-10 w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Welcome Back</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                required
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-500" onClick={() => setShowPassword(false)} />
                ) : (
                  <Eye className="h-5 w-5 text-gray-500" onClick={() => setShowPassword(true)} />
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            {/* Removed Remember Me and Forgot Password features */}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Sign In
          </button>
          <p className="text-center text-sm text-gray-700">
            Don't have an account? <Link href="/register" className="text-blue-600 hover:underline">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  );

  const DashboardView = () => (
    <div className="min-h-screen bg-[#F0F4F8] flex">
      <PatternBackground />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">AI Interview Coach</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {localStorage.getItem('email')?.split('@')[0] || 'User'}!</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Interviews</p>
                  <p className="text-3xl font-bold text-gray-800">{stats?.totalInterviews || 0}</p>
                </div>
                <div className="bg-[#3563E9] p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Average Score</p>
                  <p className="text-3xl font-bold text-gray-800">{stats?.averageScore.toFixed(1) || '0.0'}/10</p>
                </div>
                <div className="bg-[#2C7A7B] p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Best Score</p>
                  <p className="text-3xl font-bold text-gray-800">{stats?.bestScore || 0}/10</p>
                </div>
                <div className="bg-[#3563E9] p-3 rounded-full">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-6">Recent Interviews</h2>
          {interviewsLoading ? (
            <p>Loading interviews...</p>
          ) : interviewsError ? (
            <p className="text-red-500">{interviewsError}</p>
          ) : interviews.length === 0 ? (
            <p>No recent interviews. Start a new one!</p>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview: Interview) => (
                <div key={interview._id} className="flex items-center justify-between w-full border-b border-gray-300 py-3 px-2 hover:bg-gray-100 transition-colors cursor-pointer text-base">
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#3563E9] p-1 rounded-full">
                      <Play className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-base">{interview.role?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDateTime(interview.date)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className="text-lg font-bold text-gray-800">{interview.overallScore ? interview.overallScore + '/10' : '--'}</p>
                    <p className="text-xs text-gray-600">Score</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/interview/${interview._id}`); }}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium shadow"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteInterview(interview._id); }}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-700 text-xs font-medium shadow flex items-center"
                    >
                      <Trash2 className="h-3 w-3 mr-0.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );

  const HomeView = () => (
    <div className="min-h-screen bg-[#F0F4F8] relative" style={{ backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Overlay to lighten background */}
      <div className="absolute inset-0 w-full h-full bg-white/70 z-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Hero Section - full width */}
        <section className="w-full relative flex flex-col items-center justify-center py-20 px-4 overflow-hidden">
          {/* Hero background image */}
          <img src="/background.png" alt=" " className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none z-0" />
          <div className="max-w-4xl w-full bg-white rounded-2xl shadow-lg p-12 text-left flex flex-col md:flex-row items-center md:items-center gap-10 relative z-10">
            <div className="flex-1">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800 mb-4 leading-tight text-left">
                <span className="block">
                  Level up your <span className="font-bold text-teal-600">Interview Game</span>
                </span>
                <span className="block">
                  with <span className="font-bold text-teal-600">AI Training Buddy</span>
                </span>
              </h2>
              <p className="text-gray-600 text-lg mt-2 text-left">
                Practice interviews anytime, get feedback instantly, and boost your confidence with every session.
              </p>
              <div className="mt-8 flex justify-start">
                {isAuthenticated ? (
                  <Link
                    href="/interview/role-select"
                    className="flex items-center space-x-2 bg-[#3563E9] hover:bg-[#2C7A7B] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
                  >
                    <Play className="h-5 w-5" />
                    <span>Start Interview</span>
                  </Link>
                ) : (
                  <Link
                    href="/register"
                    className="flex items-center space-x-2 bg-[#3563E9] hover:bg-[#2C7A7B] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
                  >
                    <span>Get Started</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 flex justify-center items-center w-full md:w-auto">
              <div className="w-72 h-72 flex items-center justify-center overflow-hidden">
                <img
                  src="/logoo.png"
                  alt="Interview Buddy"
                  className="w-64 h-64 object-cover rounded-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards (if authenticated and stats available) */}
        {isAuthenticated && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Interviews</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalInterviews}</p>
                </div>
                <div className="bg-[#3563E9] p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Average Score</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.averageScore.toFixed(1)}/10</p>
                </div>
                <div className="bg-[#2C7A7B] p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Best Score</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.bestScore}/10</p>
                </div>
                <div className="bg-[#3563E9] p-3 rounded-full">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Interviews (if authenticated) */}
        {isAuthenticated && interviews && interviews.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Interviews</h3>
            <div className="space-y-4">
              {(() => {
                const interviewsToShow = showAllInterviews ? interviews : interviews.slice(0, 4);
                return (
                  <>
                    {interviewsToShow.map((interview: Interview) => (
                      <div key={interview._id} className="flex items-center justify-between w-full border-b border-gray-300 py-3 px-2 hover:bg-gray-100 transition-colors cursor-pointer text-base">
                        <div className="flex items-center space-x-3">
                          <div className="bg-[#3563E9] p-1 rounded-full">
                            <Play className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-base">{interview.role?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDateTime(interview.date)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <p className="text-lg font-bold text-gray-800">{interview.overallScore ? interview.overallScore + '/10' : '--'}</p>
                          <p className="text-xs text-gray-600">Score</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/interview/${interview._id}`); }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium shadow"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteInterview(interview._id); }}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-700 text-xs font-medium shadow flex items-center"
                          >
                            <Trash2 className="h-3 w-3 mr-0.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {interviews.length > 4 && !showAllInterviews && (
                      <button
                        className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-medium"
                        onClick={() => setShowAllInterviews(true)}
                      >
                        More
                      </button>
                    )}
                    {showAllInterviews && interviews.length > 4 && (
                      <button
                        className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-medium"
                        onClick={() => setShowAllInterviews(false)}
                      >
                        Show Less
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
        {/* Features Section */}
        <div id="features" className="w-full flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 lg:grid-rows-2 gap-8 gap-y-8 mb-8 max-w-5xl w-full">
            <div className="bg-blue-200 border-4 border-black p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-blue-300 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Realistic Questions</h3>
              <p className="text-gray-700">
                Practice with AI-powered questions tailored to your field and experience level.
              </p>
            </div>
            <div className="bg-green-200 border-4 border-black p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-green-300 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Personalized Feedback</h3>
              <p className="text-gray-700">
                Receive instant, actionable feedback to help you improve after every session.
              </p>
            </div>
            <div className="bg-yellow-200 border-4 border-black p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-yellow-300 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Track Progress</h3>
              <p className="text-gray-700">
                Monitor your growth with detailed stats and see how you stack up over time.
              </p>
            </div>
            <div className="bg-purple-200 border-4 border-black p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-purple-300 rounded-lg flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Flexible Practice</h3>
              <p className="text-gray-700">
                Practice anytime, anywhere, and tailor your sessions to your schedule and needs.
              </p>
            </div>
          </div>
        </div>
        {/* About Us Footer */}
        <footer id="about-footer" className="bg-[#D9E2EC] border-t border-slate-300 py-8 mt-12 w-full">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">About Us</h2>
            <p className="text-slate-700 mb-4">
              AI Interview Coach is dedicated to helping you master your interview skills with personalized, AI-powered practice and feedback. Our mission is to make interview preparation accessible, effective, and confidence-boosting for everyone.
            </p>
            <div className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} AI Interview Coach. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </div>
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const section = sessionStorage.getItem('scrollToSection');
      if (section) {
        const el = document.getElementById(section);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth' });
          }, 200); // Wait a bit for the DOM to render
        }
        sessionStorage.removeItem('scrollToSection');
      }
    }
  }, []);

  // For simplicity, render HomeView always (or switch based on currentView if you want to enable login/dashboard switching)
  if (currentView === 'dashboard') return DashboardView();
  if (currentView === 'login') return LoginView();
  return HomeView();
};

export default AIInterviewCoach;
