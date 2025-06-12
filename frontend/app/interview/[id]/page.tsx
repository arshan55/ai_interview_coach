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
        className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 text-white"
      >
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
        >
          <p className="text-xl">Loading interview details...</p>
        </motion.div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 text-white"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-red-500 text-xl mb-4">Error: {error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
        className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 text-white"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-yellow-500 text-xl mb-4">Interview not found.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
      className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div 
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-3xl font-bold">
            {interview.role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Interview
            {interview.programmingLanguage && ` - ${interview.programmingLanguage}`}
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Back to Home
          </motion.button>
        </motion.div>

        {/* Three-way Toggle Switch */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 p-2 rounded-lg inline-flex items-center space-x-4">
            <button
              onClick={() => setShowSection('overall')}
              className={`px-6 py-2 rounded-lg transition-colors ${
                showSection === 'overall' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Overall Feedback
            </button>
            <button
              onClick={() => setShowSection('questions')}
              className={`px-6 py-2 rounded-lg transition-colors ${
                showSection === 'questions' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Questions & Answers
            </button>
            <button
              onClick={() => setShowSection('feedback')}
              className={`px-6 py-2 rounded-lg transition-colors ${
                showSection === 'feedback' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
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
            className="bg-transparent mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Overall Feedback</h2>
              {interview.overallScore && (
                <div
                  className={`text-xl font-semibold px-4 py-2 rounded ml-4 ${
                    interview.overallScore >= 7
                      ? 'bg-green-700 text-white'
                      : interview.overallScore >= 4
                      ? 'bg-yellow-600 text-gray-900'
                      : 'bg-red-700 text-white'
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
                    <div className="bg-blue-900/80 border-l-4 border-blue-400 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-1 text-blue-200">Summary</h3>
                      <div className="text-blue-100">
                        <ReactMarkdown>{mainSummary}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Key Strengths */}
                  {strengthsMatch && strengthsMatch[1] && (
                    <div className="bg-green-900/80 border-l-4 border-green-400 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-1 text-green-200">Key Strengths</h3>
                      <div className="text-green-100">
                        <ReactMarkdown>{strengthsMatch[1].trim()}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Areas for Improvement */}
                  {improvementMatch && improvementMatch[1] && (
                    <div className="bg-yellow-900/80 border-l-4 border-yellow-400 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-1 text-yellow-200">Areas for Improvement</h3>
                      <div className="text-yellow-100">
                        <ReactMarkdown>{improvementMatch[1].trim()}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Recommendations */}
                  {recommendationsMatch && recommendationsMatch[1] && (
                    <div className="bg-purple-900/80 border-l-4 border-purple-400 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-1 text-purple-200">Recommendations</h3>
                      <div className="text-purple-100">
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
                className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2">Question {index + 1}</h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-lg leading-relaxed">{question.questionText}</p>
                  </div>

                  {question.answerText && (
                    <div className="mt-4 bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Your Answer</h3>
                      <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{question.answerText}</p>
                    </div>
                  )}

                  {question.codeAnswer && (
                    <div className="mt-4 bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Your Code</h3>
                      <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm">{question.codeAnswer}</code>
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
                className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2">Question {index + 1}</h2>
                  {/* General Feedback Section */}
                  {question.feedback && (
                    <div className="bg-blue-900/80 border-l-4 border-blue-400 p-4 rounded-lg mb-2">
                      <h3 className="text-lg font-semibold mb-1 text-blue-200">General Feedback</h3>
                      <div className="text-blue-100">
                        <ReactMarkdown>{question.feedback}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Code Feedback Section */}
                  {question.codeFeedback && (
                    <div className="bg-purple-900/80 border-l-4 border-purple-400 p-4 rounded-lg mb-2">
                      <h4 className="text-lg font-semibold mb-1 text-purple-200">Code Feedback</h4>
                      <div className="text-purple-100">
                        <ReactMarkdown>{question.codeFeedback}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {/* Score Badges */}
                  <div className="flex items-center space-x-4 mt-2">
                    {question.score !== null && (
                      <div className={`px-4 py-2 rounded font-semibold text-white ${
                        question.score >= 7 ? 'bg-green-700' : question.score >= 4 ? 'bg-yellow-600 text-gray-900' : 'bg-red-700'
                      }`}>
                        Score: {question.score.toFixed(1)}/10
                      </div>
                    )}
                    {question.codeScore !== null && (
                      <div className={`px-4 py-2 rounded font-semibold text-white ${
                        question.codeScore >= 7 ? 'bg-green-700' : question.codeScore >= 4 ? 'bg-yellow-600 text-gray-900' : 'bg-red-700'
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