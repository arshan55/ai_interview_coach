'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Question {
  question: string;
  answer?: string;
  feedback?: string;
  score?: number;
}

interface Interview {
  id: string;
  title: string;
  role: string;
  programmingLanguage?: string;
  questions: Question[];
  status: string;
  createdAt: string;
  overallFeedback?: string;
  overallScore?: number;
}

export default function InterviewDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSection, setShowSection] = useState<'overall' | 'questions' | 'feedback'>('overall');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Speech Recognition setup
  const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const spokenText = event.results[0][0].transcript;
      setAnswer(spokenText);
    };

    recognition.onerror = (event: Event) => {
      const errorEvent = event as unknown as SpeechRecognitionErrorEvent;
      console.error('Speech recognition error:', errorEvent.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
  }

  const startRecording = (index: number) => {
    if (recognition) {
      setCurrentQuestionIndex(index);
      setAnswer('');
      setIsRecording(true);
      recognition.start();
    } else {
      alert('Speech recognition not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const response = await fetch(`/api/interviews/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch interview');
        }
        const data = await response.json();
        setInterview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [params.id]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-4">Loading...</div>;
  }

  if (error || !interview) {
    return <div className="min-h-screen bg-gray-900 text-white p-4">Error: {error || 'Interview not found'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{interview.title}</h1>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setShowSection('overall')}
            className={`px-4 py-2 rounded ${showSection === 'overall' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Overall
          </button>
          <button
            onClick={() => setShowSection('questions')}
            className={`px-4 py-2 rounded ${showSection === 'questions' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Questions
          </button>
          <button
            onClick={() => setShowSection('feedback')}
            className={`px-4 py-2 rounded ${showSection === 'feedback' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Feedback
          </button>
        </div>

        <AnimatePresence mode="wait">
          {showSection === 'overall' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-800 p-6 rounded-lg"
            >
              <h2 className="text-2xl font-semibold mb-4">Interview Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Role</p>
                  <p className="text-lg">{interview.role}</p>
                </div>
                {interview.programmingLanguage && (
                  <div>
                    <p className="text-gray-400">Programming Language</p>
                    <p className="text-lg">{interview.programmingLanguage}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className="text-lg">{interview.status}</p>
                </div>
                <div>
                  <p className="text-gray-400">Date</p>
                  <p className="text-lg">{new Date(interview.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {interview.overallFeedback && (
                <div className="mt-6">
                  <h3 className="text-xl font-semibold mb-2">Overall Feedback</h3>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{interview.overallFeedback}</ReactMarkdown>
                  </div>
                </div>
              )}
              {interview.overallScore && (
                <div className="mt-4">
                  <h3 className="text-xl font-semibold mb-2">Overall Score</h3>
                  <p className="text-2xl font-bold">{interview.overallScore}/10</p>
                </div>
              )}
            </motion.div>
          )}

          {showSection === 'questions' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {interview.questions.map((question, index) => (
                <Card key={index} className="bg-gray-800 p-6">
                  <h2 className="text-xl font-semibold mb-2">Question {index + 1}</h2>
                  <div className="prose prose-invert max-w-none overflow-y-auto">
                    <ReactMarkdown>{question.question}</ReactMarkdown>
                  </div>

                  {question.answer && (
                    <div className="mt-4 bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Your Answer</h3>
                      <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{question.answer}</p>
                    </div>
                  )}

                  {!question.answer && (
                    <div className="mt-4">
                      <button
                        onClick={() => isRecording ? stopRecording() : startRecording(index)}
                        className={`px-4 py-2 rounded transition-colors ${isRecording && currentQuestionIndex === index ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                        text-white font-semibold`}
                      >
                        {isRecording && currentQuestionIndex === index ? 'Stop Recording' : 'Speak Answer'}
                      </button>
                      {answer && currentQuestionIndex === index && (
                        <div className="mt-2 p-3 bg-gray-700 rounded-lg">
                          <h3 className="text-md font-semibold mb-1">Recognized Text:</h3>
                          <p className="text-gray-200">{answer}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {question.feedback && (
                    <div className="mt-4 bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Feedback</h3>
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown>{question.feedback}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {question.score && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold mb-2">Score</h3>
                      <p className="text-2xl font-bold">{question.score}/10</p>
                    </div>
                  )}
                </Card>
              ))}
            </motion.div>
          )}

          {showSection === 'feedback' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-800 p-6 rounded-lg"
            >
              <h2 className="text-2xl font-semibold mb-4">Detailed Feedback</h2>
              {interview.overallFeedback ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{interview.overallFeedback}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-400">No detailed feedback available yet.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 