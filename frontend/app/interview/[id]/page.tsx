'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Question {
  questionText: string;
  answerText: string | null;
  codeAnswer: string | null;
  feedback: string | null;
  score: number | null;
  codeFeedback: string | null;
  codeScore: number | null;
}

interface Interview {
  _id: string;
  role: string;
  programmingLanguage?: string;
  questions: Question[];
  date: string;
  overallFeedback?: string;
  overallScore?: number;
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function InterviewDetailsPage({ params }: { params: { id: string } }) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSection, setShowSection] = useState<'overall' | 'questions' | 'feedback'>('overall');
  const router = useRouter();

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/interviews/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch interview');
        }

        const data = await response.json();
        setInterview(data);
      } catch (err) {
        console.error('Error fetching interview:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch interview');
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [params.id, router]);

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

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#F0F4F8] relative flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8"
        style={{ backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 w-full h-full bg-white/70 z-0 pointer-events-none" />
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative z-10"
        >
          <p className="text-xl text-gray-800">Loading interview details...</p>
        </motion.div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#F0F4F8] relative flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8"
        style={{ backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 w-full h-full bg-white/70 z-0 pointer-events-none" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <p className="text-red-500 text-xl mb-4">Error: {error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow"
          >
            Back to Home
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  if (!interview) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#F0F4F8] relative flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8"
        style={{ backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 w-full h-full bg-white/70 z-0 pointer-events-none" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <p className="text-yellow-500 text-xl mb-4">Interview not found.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow"
          >
            Back to Home
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#F0F4F8] relative py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 w-full h-full bg-white/70 z-0 pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div 
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800">
            {interview.role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Interview
            {interview.programmingLanguage && ` - ${interview.programmingLanguage}`}
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow"
          >
            Back to Home
          </motion.button>
        </motion.div>

        {/* Three-way Toggle Switch */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-2 rounded-lg inline-flex items-center space-x-4 shadow border border-slate-200">
            <button
              onClick={() => setShowSection('overall')}
              className={`px-6 py-2 rounded-lg transition-colors font-semibold ${
                showSection === 'overall' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Overall Feedback
            </button>
            <button
              onClick={() => setShowSection('questions')}
              className={`px-6 py-2 rounded-lg transition-colors font-semibold ${
                showSection === 'questions' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Questions & Answers
            </button>
            <button
              onClick={() => setShowSection('feedback')}
              className={`px-6 py-2 rounded-lg transition-colors font-semibold ${
                showSection === 'feedback' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Feedback on Questions
            </button>
          </div>
        </div>

        {/* Overall Feedback Section */}
        {showSection === 'overall' && interview.overallFeedback && (
          <motion.div 
            variants={fadeIn}
            initial="initial"
            animate="animate"
            className="bg-white mb-8 rounded-xl shadow-lg p-6 border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Overall Feedback</h2>
              {interview.overallScore && (
                <div
                  className={`text-xl font-semibold px-4 py-2 rounded ml-4 ${
                    interview.overallScore >= 7
                      ? 'bg-green-200 text-green-800'
                      : interview.overallScore >= 4
                      ? 'bg-yellow-200 text-yellow-900'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  Score: {interview.overallScore.toFixed(1)}/10
                </div>
              )}
            </div>
            {/* Sectioned and Color-coded Overall Feedback */}
            {(() => {
              const text = interview.overallFeedback;
              // Split by known section headers (only declare each variable once)
              const strengthsMatch = text.match(/Key Strengths:([\s\S]*?)(Areas for Improvement:|Recommendations(?: for Future Interviews)?:|Future Interviews Tips:|Tips for Future Interviews:|$)/);
              const improvementMatch = text.match(/Areas for Improvement:([\s\S]*?)(Recommendations(?: for Future Interviews)?:|Future Interviews Tips:|Tips for Future Interviews:|$)/);
              const recommendationsMatch = text.match(/(?:Recommendations(?: for Future Interviews)?|Future Interviews Tips|Tips for Future Interviews):([\s\S]*)$/);
              const mainSummary = text.split('Key Strengths:')[0].trim();
              return (
                <div className="space-y-4">
                  {/* Main Summary */}
                  {mainSummary && (
                    <div className="bg-blue-100 border-l-4 border-blue-400 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-1 text-blue-800">Summary</h3>
                      <div className="text-blue-900">
                        <ReactMarkdown>{mainSummary}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Key Strengths */}
                  {strengthsMatch && strengthsMatch[1] && (
                    <div className="bg-green-100 border-l-4 border-green-400 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-1 text-green-800">Key Strengths</h3>
                      <div className="text-green-900">
                        <ReactMarkdown>{strengthsMatch[1].trim()}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Areas for Improvement */}
                  {improvementMatch && improvementMatch[1] && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-1 text-yellow-800">Areas for Improvement</h3>
                      <div className="text-yellow-900">
                        <ReactMarkdown>{improvementMatch[1].trim()}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Recommendations */}
                  {recommendationsMatch && recommendationsMatch[1] && (
                    <div className="bg-purple-100 border-l-4 border-purple-400 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-1 text-purple-800">Recommendations</h3>
                      <div className="text-purple-900">
                        <ReactMarkdown>{recommendationsMatch[1].trim()}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Questions and Answers View */}
        {showSection === 'questions' && (
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            {interview.questions.map((question, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-2xl transition-all duration-300"
              >
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2 text-gray-800">Question {index + 1}</h2>
                  <div className="prose max-w-none overflow-y-auto">
                    <ReactMarkdown>{question.questionText}</ReactMarkdown>
                  </div>

                  {question.answerText && (
                    <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-blue-800">Your Answer</h3>
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{question.answerText}</p>
                    </div>
                  )}

                  {question.codeAnswer && (
                    <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-blue-800">Your Code</h3>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-800">{question.codeAnswer}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Feedback on Questions View */}
        {showSection === 'feedback' && (
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            {interview.questions.map((question, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-2xl transition-all duration-300"
              >
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2 text-gray-800">Question {index + 1}</h2>
                  {/* General Feedback Section */}
                  {question.feedback && (
                    <div className="bg-blue-100 border-l-4 border-blue-400 p-4 rounded-lg mb-2">
                      <h3 className="text-lg font-semibold mb-1 text-blue-800">General Feedback</h3>
                      <div className="text-blue-900">
                        <ReactMarkdown>{question.feedback}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Code Feedback Section */}
                  {question.codeFeedback && (
                    <div className="bg-purple-100 border-l-4 border-purple-400 p-4 rounded-lg mb-2">
                      <h4 className="text-lg font-semibold mb-1 text-purple-800">Code Feedback</h4>
                      <div className="text-purple-900">
                        <ReactMarkdown>{question.codeFeedback}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Score Badges */}
                  <div className="flex items-center space-x-4 mt-2">
                    {question.score !== null && (
                      <div className={`px-4 py-2 rounded font-semibold ${
                        question.score >= 7 ? 'bg-green-200 text-green-800' : question.score >= 4 ? 'bg-yellow-200 text-yellow-900' : 'bg-red-200 text-red-800'
                      }`}>
                        Score: {question.score.toFixed(1)}/10
                      </div>
                    )}
                    {question.codeScore !== null && (
                      <div className={`px-4 py-2 rounded font-semibold ${
                        question.codeScore >= 7 ? 'bg-green-200 text-green-800' : question.codeScore >= 4 ? 'bg-yellow-200 text-yellow-900' : 'bg-red-200 text-red-800'
                      }`}>
                        Code Score: {question.codeScore.toFixed(1)}/10
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
} 