'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useSpeechRecognition from 'react-hook-speech-to-text';

interface ResultType {
  transcript: string;
  isFinal: boolean;
}

interface Question {
  questionText: string;
  answerText: string | null;
  feedback: string | null;
  score: number | null;
  codeAnswer?: string | null;
  programmingLanguage?: string | null;
  codeFeedback?: string | null;
  codeScore?: number | null;
  audioAnswer?: string | null;
  videoAnswer?: string | null;
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

export default function InterviewPage() {
  console.log('InterviewPage component rendered');
  const router = useRouter();
  const pathname = usePathname();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [selectedCodingLanguage, setSelectedCodingLanguage] = useState('');

  // State for recording
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const hasFetchedRef = useRef(false);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const {
    error: speechError,
    interimResult,
    isRecording: speechIsRecording,
    results,
    startSpeechToText,
    stopSpeechToText
  } = useSpeechRecognition({
    continuous: true,
    crossBrowser: true,
    googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY,
    useOnlyGoogleCloud: false,
    timeout: 10000
  });

  const toggleRecording = () => {
    if (speechIsRecording) {
      stopSpeechToText();
      setIsRecording(false);
    } else {
      startSpeechToText();
      setIsRecording(true);
    }
  };

  // Update transcribed text when results change
  useEffect(() => {
    if (results.length > 0) {
      setTranscribedText(results[results.length - 1].toString());
    }
  }, [results]);

  // Update interim text when interim result changes
  useEffect(() => {
    if (interimResult) {
      setInterimText(interimResult);
    }
  }, [interimResult]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscribedText(prev => prev + ' ' + finalTranscript);
          }
          setInterimText(interimTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError('Speech recognition failed. Please try again or use text input.');
          // Ensure transcription stops on error
          stopTranscribing();
        };

        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended. isTranscribing:', isTranscribing);
          // Removed automatic restart to prevent continuous unwanted transcription
        };
      }
    }

    return () => {
      console.log('Cleaning up speech recognition on unmount.');
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        // Explicitly set continuous to false during cleanup
        recognitionRef.current.continuous = false;
      }
    };
  }, []); // Removed isTranscribing from dependency array

  useEffect(() => {
    if (hasFetchedRef.current) {
        return;
    }

    const token = localStorage.getItem('token');
    console.log('Token retrieved from localStorage:', token);
    if (!token) {
      console.log('No token found, redirecting to login');
      router.push('/login');
      return;
    }

    const pathSegments = pathname.split('/');
    const interviewId = pathSegments[pathSegments.length - 1];

    const fetchInterview = async (id: string) => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching interview with ID: ${id}`);

        const response = await fetch(`/api/interviews/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 404) {
             console.log('Interview not found, redirecting to profile');
             router.push('/profile');
             return;
          }
          throw new Error(errorData.msg || 'Failed to fetch interview');
        }

        const data: Interview = await response.json();
        console.log('Interview fetched successfully:', data);
        setInterview(data);

        // Find the first unanswered question to resume
        const firstUnansweredIndex = data.questions.findIndex(q => q.answerText === null && q.codeAnswer === null);
        // If all questions are answered, set to the last question index (or 0 if no questions)
        setCurrentQuestionIndex(firstUnansweredIndex !== -1 ? firstUnansweredIndex : data.questions.length > 0 ? data.questions.length - 1 : 0);

      } catch (err) {
        console.error('Error fetching interview:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const startNewInterview = async (role: string, programmingLanguage?: string) => {
      try {
        setLoading(true);
        setError(null);
        console.log('Making API request to start new interview');

        const token = localStorage.getItem('token');
        const response = await fetch('/api/interviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role, programmingLanguage })
        });

        console.log('Interview API response status:', response.status);
        
        let responseBodyText = await response.text();
        console.log('Raw Interview API response body:', responseBodyText);

        if (!response.ok) {
          let errorMessage = 'Failed to start interview';
          try {
            const errorData = JSON.parse(responseBodyText); // Try parsing as JSON
            errorMessage = errorData.error || errorData.msg || errorMessage;
          } catch (e) {
            // If parsing fails, use the raw text
            errorMessage = responseBodyText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = JSON.parse(responseBodyText); // Use the already read text
        console.log('Interview started successfully:', data);
        setInterview(data);
        setCurrentQuestionIndex(0);
      } catch (err) {
        console.error('Error in startNewInterview:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Determine action based on URL and localStorage
    if (interviewId && interviewId !== 'interview') {
       fetchInterview(interviewId);
    } else {
      // No interview ID in URL, check localStorage for role data to start a new one
      const roleData = localStorage.getItem('selectedRole');
      console.log('Retrieved role data from localStorage:', roleData);
      
      if (roleData) {
        try {
          const { role, programmingLanguage } = JSON.parse(roleData);
          console.log('Attempting to start new interview with:', { role, programmingLanguage });
          startNewInterview(role, programmingLanguage);
        } catch (err) {
          console.error('Error parsing role data from localStorage:', err);
          setError('Invalid role data. Please try again.');
          setLoading(false);
        }
      } else {
        // No interview ID in URL and no role data in localStorage, redirect
        console.log('No interview ID in URL and no role data in localStorage, redirecting to role selection');
        router.push('/interview/role-select');
         setLoading(false);
      }
    }

    hasFetchedRef.current = true;

  }, [router, pathname]);

  const currentQuestion = interview?.questions?.[currentQuestionIndex];
  const isCodingQuestion = currentQuestion?.questionText?.startsWith('[CODING_PROBLEM]');
  // Ensure selectedCodingLanguage is set for coding questions
  useEffect(() => {
    if (isCodingQuestion && interview?.programmingLanguage) {
      setSelectedCodingLanguage(interview.programmingLanguage.toLowerCase());
    }
  }, [isCodingQuestion, interview?.programmingLanguage, currentQuestionIndex]);

  const startTranscribing = async () => {
    try {
      if (!recognitionRef.current) {
        throw new Error('Speech recognition is not supported in this browser.');
      }
      console.log('Attempting to start transcription.');
      setIsTranscribing(true);
      setTranscribedText('');
      setInterimText('');
      
      // Explicitly set continuous to true when starting
      recognitionRef.current.continuous = true;
      
      recognitionRef.current.start();
      console.log('Speech recognition started.');

    } catch (err) {
      console.error('Error starting transcription:', err);
      setError('Could not start speech recognition. Please check your microphone permissions.');
    }
  };

  const stopTranscribing = () => {
    console.log('Attempting to stop transcription.');
    if (recognitionRef.current) {
      // Explicitly set continuous to false when stopping
      recognitionRef.current.continuous = false;
      recognitionRef.current.stop();
      console.log('Speech recognition stopped.');
    }
    setIsTranscribing(false);
    setInterimText('');
  };

  const LoadingAnimation = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">Generating feedback...</p>
        <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
      </div>
    </div>
  );

  const submitAnswer = async () => {
    if (!interview) return;

    const isCodingQuestion = interview.questions[currentQuestionIndex].questionText.startsWith('[CODING_PROBLEM]');

    // For coding questions, only check for code and programming language
    let languageToUse = selectedCodingLanguage || interview.programmingLanguage?.toLowerCase() || '';
    if (isCodingQuestion) {
      if (!answer.trim() || !languageToUse) {
        setError('Please provide code and select a programming language.');
        return;
      }
    } else {
      // For non-coding questions, check for text answer or transcribed text
      const finalAnswer = transcribedText.trim() || answer.trim();
      if (!finalAnswer) {
        setError('Please provide an answer or use speech-to-text.');
        return;
      }
    }

    try {
      setIsGeneratingFeedback(true);
      setError(null);
      setLoading(true);

      const token = localStorage.getItem('token');
      const requestBody: any = {
        questionIndex: currentQuestionIndex,
      };

      if (isCodingQuestion) {
        requestBody.codeAnswer = answer;
        requestBody.programmingLanguage = languageToUse;
      } else {
        requestBody.answerText = transcribedText.trim() || answer.trim();
      }

      console.log('Request Body being sent:', requestBody);

      const response = await fetch(`/api/interviews/${interview._id}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      // Read the response body ONCE
      const responseData = await response.json();

      if (!response.ok) {
        console.error('Submission Error Response:', responseData);
        
        // Check for specific 503 Service Unavailable error
        if (response.status === 503) {
          throw new Error('The AI service is currently busy. Please wait a moment and try submitting your answer again.');
        } else {
          throw new Error(responseData.msg || responseData.error || 'Failed to submit answer');
        }
      }

      console.log('Received updated interview:', responseData);

      // Update the interview state with the complete updated interview from the backend
      setInterview(responseData);
      console.log('Interview state updated.', responseData);

      // After state is updated, check if the current question is now answered
      const updatedCurrentQuestion = responseData.questions[currentQuestionIndex];
      const isCurrentQuestionAnswered = updatedCurrentQuestion && (updatedCurrentQuestion.answerText !== null || updatedCurrentQuestion.codeAnswer !== null);
      console.log('Is current question answered after state update?', isCurrentQuestionAnswered);

      // Update feedback and score for the current question based on the response
      const submittedQuestion = responseData.questions[currentQuestionIndex];
      setFeedback(submittedQuestion.feedback);
      setScore(submittedQuestion.score);

      // Clear the answer input
      setAnswer('');
      setSelectedCodingLanguage('');
      setTranscribedText('');
      setInterimText('');

    } catch (err) {
      console.error('Error submitting answer:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGeneratingFeedback(false);
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    if (!interview) return;

    // Check if there is a next question available in the updated interview object
    if (currentQuestionIndex < interview.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      // Clear feedback and score when moving to the next question
      setFeedback(null);
      setScore(null);
      setAnswer(''); // Clear answer input for the new question
      setSelectedCodingLanguage(''); // Clear selected language for the new question
    } else if (interview.questions.length === 5) {
      // If all 5 questions are answered and this is the last one, finish the interview
      router.push('/');
    } else {
      // This case should ideally not be reached if the backend correctly adds a new question until 5 are reached.
      console.warn('Attempted to move to next question, but none available and interview not complete.');
    }
  };

  if (loading && !interview) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 text-white">
        <p className="text-xl">Loading interview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 text-white">
        <p className="text-red-500 text-xl">Error: {error}</p>
        <button
          onClick={() => router.push('/interview/role-select')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!interview || !interview.questions || interview.questions.length === 0) {
    return (
       <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 text-white">
         <p className="text-yellow-500 text-xl">No interview data found or interview is empty.</p>
          <button
            onClick={() => router.push('/interview/role-select')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start a New Interview
          </button>
       </div>
    );
  }

  // Check if the current question has been answered based on the *latest* interview state
  const isAnswered = currentQuestion && (currentQuestion.answerText !== null || currentQuestion.codeAnswer !== null);

  const codingQuestionText = isCodingQuestion ? currentQuestion?.questionText?.replace('[CODING_PROBLEM]', '').trim() : currentQuestion?.questionText;

  const programmingLanguages = [
    'JavaScript',
    'Python',
    'Java',
    'C++',
    'Ruby',
    'Go',
    'Rust',
    'TypeScript',
    'PHP',
    'C#'
  ];

  return (
    <div className="min-h-screen text-white">
      {isGeneratingFeedback && <LoadingAnimation />}
      {isCodingQuestion && currentQuestion ? (
        <div className="flex-1 flex flex-col md:flex-row md:gap-6 p-4 md:p-8">
          {/* Left: Coding Problem */}
          <div className="card w-full md:w-1/2 h-[80vh] flex flex-col p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 rounded-lg">
                  Question {currentQuestionIndex + 1} of {interview.questions.length}
                </h2>
                {isAnswered ? (
                  <span className="text-green-500 text-xl font-bold bg-green-900/30 px-4 py-2 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Answered
                  </span>
                ) : (
                  <span className="text-yellow-500 text-xl font-bold bg-yellow-900/30 px-4 py-2 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Unanswered
                  </span>
                )}
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-6 text-blue-300 border-b border-slate-700 pb-4">Coding Problem</h3>
            <div className="prose prose-invert max-w-none">
            {(() => {
                const questionText = currentQuestion?.questionText?.replace('[CODING_PROBLEM]', '').trim() || '';
                const parts = questionText.split(/```(\w+)?/);
                return parts.map((part, index) => {
                  if (index % 2 === 1) {
                return (
                      <pre key={index} className="bg-slate-900/50 p-4 rounded-lg my-4 overflow-x-auto border border-slate-700">
                        <code className="text-sm text-slate-300">{part}</code>
                      </pre>
                    );
                  }
                  return <p key={index} className="mb-4 leading-relaxed text-slate-200">{part}</p>;
                });
            })()}
            </div>
          </div>

          {/* Right: Code Editor */}
          <div className="card w-full md:w-1/2 h-[80vh] flex flex-col p-8 overflow-y-auto">
            <label htmlFor="language-select" className="block text-lg font-medium text-slate-300 mb-2">
              Programming Language:
            </label>
            <select
              id="language-select"
              name="language-select"
              className="input mb-6"
              value={selectedCodingLanguage || interview?.programmingLanguage?.toLowerCase() || ''}
              disabled
            >
              <option value="">{interview?.programmingLanguage || 'Select a language'}</option>
            </select>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-200">Your Solution</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={submitAnswer}
                    className="btn btn-secondary text-sm"
                    title="Submit code"
                  >
                    Submit Code
                  </button>
                </div>
              </div>
            <textarea
              id="answer"
              name="answer"
              rows={20}
                className="input flex-1 font-mono text-base"
              value={answer}
              onChange={e => currentQuestion && setAnswer(e.target.value)}
                placeholder="Write your code here..."
                disabled={isGeneratingFeedback}
            />
            </div>

            <div className="mt-6 flex justify-between items-center">
            <button
              onClick={submitAnswer}
                disabled={isGeneratingFeedback || !answer.trim()}
                className={`btn btn-primary flex items-center gap-2 ${
                  isGeneratingFeedback ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isGeneratingFeedback ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Feedback...
                  </>
                ) : (
                  'Submit Code'
                )}
              </button>
            </div>

            {/* Feedback and Navigation for Coding Questions */}
            {isAnswered && (
              <div className="mt-6 space-y-6">
                {/* Code Feedback */}
                {currentQuestion?.codeFeedback && (
                  <div className="card p-6 bg-purple-900/30 border-purple-700">
                    <h3 className="text-lg font-medium text-purple-200 mb-4">Code Feedback:</h3>
                    <p className="text-purple-100 leading-relaxed">{currentQuestion.codeFeedback}</p>
                  </div>
                )}

                {/* General Feedback */}
                {currentQuestion?.feedback && (
                  <div className="card p-6 bg-blue-900/30 border-blue-700">
                    <h3 className="text-lg font-medium text-blue-200 mb-4">General Feedback:</h3>
                    <p className="text-blue-100 leading-relaxed">{currentQuestion.feedback}</p>
                  </div>
                )}

                {/* Score Display */}
                {(currentQuestion?.codeScore !== null && currentQuestion?.codeScore !== undefined) && (
                  <div className={`px-6 py-3 rounded-lg font-semibold text-white inline-block ${
                    currentQuestion.codeScore >= 7 ? 'bg-green-700' : currentQuestion.codeScore >= 4 ? 'bg-yellow-600' : 'bg-red-700'
                  }`}>
                    Code Score: {currentQuestion.codeScore}/10
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous Question
                  </button>
                  {currentQuestionIndex < interview.questions.length - 1 ? (
                    <button
                      onClick={nextQuestion}
                      className="btn btn-secondary flex items-center gap-2"
            >
                      Next Question
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push('/')}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      Finish Interview
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
            </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            {interview.role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Interview'}
            {interview.programmingLanguage && ` - ${interview.programmingLanguage}`}
          </h1>
          <div className="card p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 rounded-lg">
                  Question {currentQuestionIndex + 1} of {interview.questions.length}
                </h2>
              {isAnswered ? (
                  <span className="text-green-500 text-xl font-bold bg-green-900/30 px-4 py-2 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Answered
                  </span>
              ) : (
                  <span className="text-yellow-500 text-xl font-bold bg-yellow-900/30 px-4 py-2 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Unanswered
                  </span>
              )}
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-slate-200">{currentQuestion?.questionText}</p>
            </div>
          </div>

          {/* Answer Input / Display and Navigation Buttons */}
          <div className="space-y-6">
          {!isAnswered ? (
              <div className="card p-6">
                <h3 className="text-lg font-medium text-slate-300 mb-4">Your Answer:</h3>
                <div className="flex flex-col space-y-4">
                  <textarea
                    className="input flex-1 font-mono text-base"
                    value={transcribedText || answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer or use speech-to-text..."
                    rows={6}
                    disabled={isGeneratingFeedback}
                  />
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={toggleRecording}
                      className={`btn ${
                        speechIsRecording ? 'btn-error' : 'btn-secondary'
                      } flex items-center gap-2`}
                      disabled={isGeneratingFeedback}
                    >
                      {speechIsRecording ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                          </svg>
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Start Recording
                        </>
                      )}
                    </button>
                    {interimText && (
                      <span className="text-sm text-slate-400">Listening...</span>
                    )}
                  </div>
                  <button
                    onClick={submitAnswer}
                    disabled={isGeneratingFeedback || (!transcribedText.trim() && !answer.trim())}
                    className={`btn btn-primary w-full flex items-center justify-center gap-2 ${
                      isGeneratingFeedback ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isGeneratingFeedback ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Feedback...
                      </>
                    ) : (
                      'Submit Answer'
                    )}
                  </button>
                </div>
              </div>
          ) : (
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-lg font-medium text-slate-300 mb-4">Your Answer:</h3>
                {currentQuestion?.videoAnswer ? (
                  <div className="mt-2">
                    <video 
                      src={`data:video/webm;base64,${currentQuestion.videoAnswer}`}
                      controls
                        className="w-full rounded-lg"
                    />
                  </div>
                ) : (
                    <p className="mt-2 text-slate-300 leading-relaxed">{currentQuestion?.answerText}</p>
                )}
              </div>
                {currentQuestion?.feedback && (
                  <div className="card p-6 bg-blue-900/30 border-blue-700">
                    <h3 className="text-lg font-medium text-blue-200 mb-4">Feedback:</h3>
                    <p className="text-blue-100 leading-relaxed">{currentQuestion.feedback}</p>
                </div>
              )}
              {(currentQuestion?.score !== null && currentQuestion?.score !== undefined) && (
                  <div className={`px-6 py-3 rounded-lg font-semibold text-white inline-block ${
                    currentQuestion.score >= 7 ? 'bg-green-700' : currentQuestion.score >= 4 ? 'bg-yellow-600' : 'bg-red-700'
                  }`}>
                    Score: {currentQuestion.score}/10
                  </div>
                )}
                </div>
              )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                className="btn btn-secondary flex items-center gap-2"
                >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                  Previous Question
                </button>
                    <button
                      onClick={nextQuestion}
                disabled={currentQuestionIndex === interview.questions.length - 1}
                className="btn btn-secondary flex items-center gap-2"
                    >
                      Next Question
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                    </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}