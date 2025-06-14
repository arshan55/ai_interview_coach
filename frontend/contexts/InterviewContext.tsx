'use client';

import React, { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Interview {
  id: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed';
  role: string;
  questions: Array<{
    id: string;
    questionText: string;
    answer?: string;
    feedback?: string;
    score?: number;
  }>;
}

interface InterviewContextType {
  currentInterview: Interview | null;
  isLoading: boolean;
  error: string | null;
  startInterview: () => Promise<void>;
  endInterview: () => Promise<void>;
  submitAnswer: (questionId: string, answer: string) => Promise<void>;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export function InterviewProvider({ children }: { children: React.ReactNode }) {
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const startInterview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: 'Software Engineer' }) // TODO: Make role configurable
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json();
      setCurrentInterview(data);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start interview');
      setIsLoading(false);
    }
  };

  const endInterview = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!currentInterview) {
        throw new Error('No active interview');
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/interviews/${currentInterview.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!response.ok) {
        throw new Error('Failed to end interview');
      }

      setCurrentInterview(null);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end interview');
      setIsLoading(false);
    }
  };

  const submitAnswer = async (questionId: string, answer: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!currentInterview) {
        throw new Error('No active interview');
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/interviews/${currentInterview.id}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ questionId, answer })
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();
      setCurrentInterview(prev => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.map(q => 
            q.id === questionId ? { ...q, answer, feedback: data.feedback, score: data.score } : q
          )
        };
      });
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
      setIsLoading(false);
    }
  };

  return (
    <InterviewContext.Provider value={{
      currentInterview,
      isLoading,
      error,
      startInterview,
      endInterview,
      submitAnswer
    }}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
} 