'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function InterviewDetailsPage() {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const pathSegments = window.location.pathname.split('/');
        const interviewId = pathSegments[pathSegments.length - 1];

        const response = await fetch(`/api/interviews/${interviewId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 404) {
            router.push('/profile');
            return;
          }
          throw new Error(errorData.msg || 'Failed to fetch interview');
        }

        const data = await response.json();
        setInterview(data);
      } catch (err) {
        console.error('Error fetching interview:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [router]);

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
            onClick={() => router.push('/profile')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to Profile
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
            onClick={() => router.push('/profile')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to Profile
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
            onClick={() => router.push('/profile')}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Back to Profile
          </motion.button>
        </motion.div>

        <motion.div 
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8 hover:shadow-2xl transition-shadow"
        >
          <p className="text-gray-400 mb-2">Date: {formatDateTime(interview.date)}</p>
          {interview.overallScore && (
            <motion.p 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-semibold mb-2"
            >
              Overall Score: {interview.overallScore.toFixed(1)}/10
            </motion.p>
          )}
          {interview.overallFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4"
            >
              <h2 className="text-xl font-semibold mb-2">Overall Feedback</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{interview.overallFeedback}</p>
            </motion.div>
          )}
        </motion.div>

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
              <h2 className="text-xl font-semibold mb-4">Question {index + 1}</h2>
              <div className="prose prose-invert max-w-none">
                <p className="mb-4">{question.questionText}</p>
              </div>

              <AnimatePresence>
                {question.answerText && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <h3 className="text-lg font-semibold mb-2">Your Answer</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{question.answerText}</p>
                  </motion.div>
                )}

                {question.codeAnswer && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <h3 className="text-lg font-semibold mb-2">Your Code</h3>
                    <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                      <code>{question.codeAnswer}</code>
                    </pre>
                  </motion.div>
                )}

                {question.feedback && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <h3 className="text-lg font-semibold mb-2">Feedback</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{question.feedback}</p>
                  </motion.div>
                )}

                {question.codeFeedback && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <h3 className="text-lg font-semibold mb-2">Code Feedback</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{question.codeFeedback}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 flex items-center space-x-4"
              >
                {question.score !== null && (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gray-700 px-4 py-2 rounded"
                  >
                    <span className="font-semibold">Score: </span>
                    <span>{question.score.toFixed(1)}/10</span>
                  </motion.div>
                )}
                {question.codeScore !== null && (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gray-700 px-4 py-2 rounded"
                  >
                    <span className="font-semibold">Code Score: </span>
                    <span>{question.codeScore.toFixed(1)}/10</span>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
} 