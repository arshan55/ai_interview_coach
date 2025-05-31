'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Add Web Speech API type definitions
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

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
        
        if (!response.ok) {
          let errorMessage = 'Failed to start interview';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.msg || errorMessage;
          } catch (e) {
            // If response is not JSON, get the text
            const text = await response.text();
            console.error('Non-JSON error response:', text);
            errorMessage = text || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
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

  const submitAnswer = async () => {
    if (!interview) return;

    const isCodingQuestion = interview.questions[currentQuestionIndex].questionText.startsWith('[CODING_PROBLEM]');

    // For coding questions, only check for code and programming language
    if (isCodingQuestion) {
      if (!answer.trim() || !selectedCodingLanguage) {
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
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const requestBody: any = {
        questionIndex: currentQuestionIndex,
      };

      if (isCodingQuestion) {
        requestBody.codeAnswer = answer;
        requestBody.programmingLanguage = selectedCodingLanguage;
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
      router.push('/profile');
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

  const currentQuestion = interview.questions[currentQuestionIndex];
  const isCodingQuestion = currentQuestion.questionText.startsWith('[CODING_PROBLEM]');
  // Check if the current question has been answered based on the *latest* interview state
  const isAnswered = currentQuestion && (currentQuestion.answerText !== null || currentQuestion.codeAnswer !== null);

  const codingQuestionText = isCodingQuestion ? currentQuestion.questionText.replace('[CODING_PROBLEM]', '').trim() : currentQuestion.questionText;

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
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          {interview.role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Interview'}
          {interview.programmingLanguage && ` - ${interview.programmingLanguage}`}
        </h1>

        {/* Question Number and Status */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Question {currentQuestionIndex + 1} of {interview.questions.length}</h2>
            {/* Display Answered/Unanswered status */}
            {isAnswered ? (
               <span className="text-green-500 text-xl font-bold">Answered</span>
            ) : (
               <span className="text-yellow-500 text-xl font-bold">Unanswered</span>
            )}
          </div>

          <div className="prose prose-invert max-w-none">
             <p>{codingQuestionText}</p>
          </div>
        </div>

        {/* Answer Input / Display and Navigation Buttons */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-6">

          {!isAnswered ? (
            // Input area if question is unanswered
            <div>
              <h3 className="text-lg font-medium text-gray-400 mb-3">Your Answer:</h3>
              {!isCodingQuestion && (
                <div className="mb-4">
                  <div className="flex space-x-4 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setAnswer('');
                        setTranscribedText('');
                      }}
                      className={`px-4 py-2 rounded-md ${
                        !isTranscribing && !answer.trim()
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      Write Answer
                    </button>
                    <button
                      type="button"
                      onClick={isTranscribing ? stopTranscribing : startTranscribing}
                      className={`px-4 py-2 rounded-md ${
                        isTranscribing
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {isTranscribing ? 'Stop Speaking' : 'Speak Answer'}
                    </button>
                  </div>

                  {isTranscribing && (
                    <div className="mb-4">
                      <div className="bg-gray-700 p-4 rounded-md">
                        <p className="text-gray-300 mb-2">Transcribing...</p>
                        <p className="text-white">{transcribedText}</p>
                        {interimText && (
                          <p className="text-gray-400 italic">
                            {interimText}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <textarea
                    id="answer"
                    name="answer"
                    rows={5}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-500"
                    value={transcribedText || answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setTranscribedText('');
                    }}
                    placeholder="Type your answer here or use speech-to-text..."
                    disabled={loading || isTranscribing}
                  />
                </div>
              )}

               {isCodingQuestion && (
                 <div className="mb-4">
                    <label htmlFor="language-select" className="block text-sm font-medium text-gray-400 mb-2">
                      Programming Language:
                    </label>
                    <select
                      id="language-select"
                      name="language-select"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-white"
                      value={selectedCodingLanguage}
                      onChange={(e) => setSelectedCodingLanguage(e.target.value)}
                    >
                      <option value="">Select a language</option>
                      {programmingLanguages.map((lang) => (
                        <option key={lang} value={lang.toLowerCase()}>
                          {lang}
                        </option>
                      ))}
                    </select>
                 </div>
               )}

              {isCodingQuestion && (
                <textarea
                  id="answer"
                  name="answer"
                  rows={10}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-500"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your code here..."
                  disabled={loading}
                />
              )}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={submitAnswer}
                  disabled={
                    loading || 
                    (isCodingQuestion 
                      ? (!answer.trim() || !selectedCodingLanguage) 
                      : (!answer.trim() && !transcribedText.trim())
                    )
                  }
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
            </div>
          ) : (
            // Display area and navigation if question is answered
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-400">Your {isCodingQuestion ? 'Code' : 'Answer'}:</h3>
                {isCodingQuestion ? (
                   <pre className="mt-2 p-4 bg-gray-700 rounded-md text-white overflow-auto text-sm">{currentQuestion.codeAnswer}</pre>
                ) : currentQuestion.videoAnswer ? (
                   <div className="mt-2">
                     <video 
                       src={`data:video/webm;base64,${currentQuestion.videoAnswer}`}
                       controls
                       className="w-full rounded-md"
                     />
                   </div>
                ) : (
                   <p className="mt-2 text-gray-300">{currentQuestion.answerText}</p>
                )}
              </div>

              {(currentQuestion.feedback || currentQuestion.codeFeedback) && (
                 <div>
                   <h3 className="text-lg font-medium text-gray-400">Feedback:</h3>
                   <p className="mt-2 text-gray-300">{currentQuestion.feedback || currentQuestion.codeFeedback}</p>
                 </div>
              )}

              {(currentQuestion.score !== null || currentQuestion.codeScore !== null) && (
                 <div>
                   <h3 className="text-lg font-medium text-gray-400">Score:</h3>
                   <p className={`mt-2 text-gray-300 ${ (isCodingQuestion ? (currentQuestion.codeScore ?? 0) : (currentQuestion.score ?? 0)) >= 7 ? 'text-green-500' : (isCodingQuestion ? (currentQuestion.score ?? 0) : (currentQuestion.score ?? 0)) >= 4 ? 'text-yellow-500' : 'text-red-500' }`}>
                     {isCodingQuestion ? currentQuestion.codeScore : currentQuestion.score}/10
                   </p>
                 </div>
              )}

              {/* Navigation buttons */}
              <div className="mt-4 flex justify-between">
                 {/* Previous Question button */}
                 <button
                   type="button"
                   onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                   disabled={currentQuestionIndex === 0}
                   className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
                 >
                   Previous Question
                 </button>

                 {/* Next Question or Finish Interview button */}
                 {isAnswered && ( // Only show navigation buttons if the question is answered
                   currentQuestionIndex < interview.questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={nextQuestion}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Next Question
                      </button>
                   ) : ( interview.questions.length === 5 && // Only show finish if it's the last of 5 questions
                      <button
                        type="button"
                        onClick={() => router.push('/profile')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        Finish Interview
                      </button>
                   )
                 )}
              </div>
            </div>
          )}
        </div>

        {/* Moved Previous/Next navigation inside the answered state display */}


      </div>
    </div>
  );
}