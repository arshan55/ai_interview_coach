'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import {
  VIDEO_ANSWER_PLACEHOLDER,
  isVideoAnswerPlaceholder,
} from '@/lib/interviewConstants';

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

const MAX_RECORDING_SECONDS = 30;
const MAX_VIDEO_BYTES = 4 * 1024 * 1024;
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

const isQuestionAnswered = (q: Question) =>
  q.answerText != null || q.codeAnswer != null;

function InterviewMessagePage({
  title,
  message,
  variant = 'error',
  primaryLabel,
  onPrimary,
}: {
  title: string;
  message: string;
  variant?: 'error' | 'warning';
  primaryLabel: string;
  onPrimary: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            variant === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {variant === 'error' ? '!' : '?'}
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
        <p
          className={`text-sm mb-6 leading-relaxed ${
            variant === 'error' ? 'text-red-700' : 'text-amber-800'
          }`}
        >
          {message}
        </p>
        <button type="button" onClick={onPrimary} className="btn btn-primary w-full">
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}

const resetVideoAnswerState = (
  setters: {
    setRecordedVideoUrl: (v: string | null) => void;
    setRecordedBlob: (v: Blob | null) => void;
    setRecordedAudioBlob: (v: Blob | null) => void;
    setRecordingTimer: (v: number) => void;
    setIsCameraActive: (v: boolean) => void;
    setIsRecording: (v: boolean) => void;
    setAnswerMode: (v: 'text' | 'video') => void;
  },
  stopCameraFn: () => void,
  audioRecorderRef: React.MutableRefObject<MediaRecorder | null>,
  audioChunksRef: React.MutableRefObject<Blob[]>
) => {
  stopCameraFn();
  if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
    audioRecorderRef.current.stop();
  }
  audioRecorderRef.current = null;
  audioChunksRef.current = [];
  setters.setRecordedVideoUrl(null);
  setters.setRecordedBlob(null);
  setters.setRecordedAudioBlob(null);
  setters.setRecordingTimer(0);
  setters.setIsCameraActive(false);
  setters.setIsRecording(false);
  setters.setAnswerMode('text');
};

export default function InterviewPage() {
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

  // Camera & Video Recording States & Refs
  const [answerMode, setAnswerMode] = useState<'text' | 'video'>('text');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordingTimer, setRecordingTimer] = useState(0);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 480 },
          height: { ideal: 360 },
          facingMode: 'user',
        },
        audio: true,
      });
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setRecordedVideoUrl(null);
      setRecordedBlob(null);
      setRecordedAudioBlob(null);
      setRecordingTimer(0);

      // Feed stream to live video element
      setTimeout(() => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera and microphone. Please ensure permissions are granted.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    
    recordedChunksRef.current = [];
    setRecordingTimer(0);

    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }
    }

    try {
      const recorder = new MediaRecorder(mediaStreamRef.current, {
        ...options,
        videoBitsPerSecond: 200_000,
        audioBitsPerSecond: 48_000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        if (blob.size > MAX_VIDEO_BYTES) {
          setError(`Recording is too large. Please keep answers under ${MAX_RECORDING_SECONDS} seconds.`);
          recordedChunksRef.current = [];
          return;
        }
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(videoUrl);
        setRecordedBlob(blob);

        setTimeout(() => {
          if (previewVideoRef.current) {
            previewVideoRef.current.src = videoUrl;
          }
        }, 100);
      };

      // Audio-only track for faster AI evaluation (video stays for local preview only)
      audioChunksRef.current = [];
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        let audioMime = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(audioMime)) audioMime = 'audio/webm';
        const audioRecorder = new MediaRecorder(new MediaStream(audioTracks), {
          mimeType: audioMime,
          audioBitsPerSecond: 48_000,
        });
        audioRecorderRef.current = audioRecorder;
        audioRecorder.ondataavailable = (e) => {
          if (e.data?.size > 0) audioChunksRef.current.push(e.data);
        };
        audioRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: audioRecorder.mimeType || 'audio/webm',
          });
          if (audioBlob.size > 0 && audioBlob.size <= MAX_AUDIO_BYTES) {
            setRecordedAudioBlob(audioBlob);
          }
        };
        audioRecorder.start(250);
      }

      recorder.start(250);
      setIsRecording(true);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTimer((prev) => {
          if (prev >= MAX_RECORDING_SECONDS) {
            if (mediaRecorderRef.current?.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            if (audioRecorderRef.current?.state !== 'inactive') {
              audioRecorderRef.current.stop();
            }
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setIsRecording(false);
            stopCamera();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error starting MediaRecorder:', err);
      setError('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioRecorderRef.current?.state !== 'inactive') {
      audioRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    stopCamera();
  };

  const resetRecording = () => {
    setRecordedVideoUrl(null);
    setRecordedBlob(null);
    setRecordedAudioBlob(null);
    setRecordingTimer(0);
    startCamera();
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const hasFetchedRef = useRef(false);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

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
          setError('Speech recognition failed. Please try again or use text input.');
          stopTranscribing();
        };

        recognitionRef.current.onend = () => {
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.continuous = false;
      }
    };
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const pathSegments = pathname.split('/');
    const interviewId = pathSegments[pathSegments.length - 1];

    const fetchInterview = async (id: string) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/interviews/${id}`, {
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

        const data: Interview = await response.json();
        setInterview(data);

        const firstUnansweredIndex = data.questions.findIndex((q) => !isQuestionAnswered(q));
        setCurrentQuestionIndex(firstUnansweredIndex !== -1 ? firstUnansweredIndex : data.questions.length > 0 ? data.questions.length - 1 : 0);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const startNewInterview = async (role: string, programmingLanguage?: string) => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch('/api/interviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role, programmingLanguage })
        });

        let responseBodyText = await response.text();

        if (!response.ok) {
          let errorMessage = 'Failed to start interview';
          try {
            const errorData = JSON.parse(responseBodyText);
            errorMessage = errorData.error || errorData.msg || errorMessage;
          } catch (e) {
            errorMessage = responseBodyText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = JSON.parse(responseBodyText);
        setInterview(data);
        setCurrentQuestionIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (interviewId && interviewId !== 'interview') {
       fetchInterview(interviewId);
    } else {
      const roleData = localStorage.getItem('selectedRole');
      
      if (roleData) {
        try {
          const { role, programmingLanguage } = JSON.parse(roleData);
          startNewInterview(role, programmingLanguage);
        } catch (err) {
          setError('Invalid role data. Please try again.');
          setLoading(false);
        }
      } else {
        router.push('/interview/role-select');
         setLoading(false);
      }
    }

    hasFetchedRef.current = true;

  }, [router, pathname]);

  const currentQuestion = interview?.questions?.[currentQuestionIndex];
  const isCodingQuestion = currentQuestion?.questionText?.startsWith('[CODING_PROBLEM]');
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
      setIsTranscribing(true);
      setTranscribedText('');
      setInterimText('');
      
      recognitionRef.current.continuous = true;
      
      recognitionRef.current.start();

    } catch (err) {
      setError('Could not start speech recognition. Please check your microphone permissions.');
    }
  };

  const stopTranscribing = () => {
    if (recognitionRef.current) {
      recognitionRef.current.continuous = false;
      recognitionRef.current.stop();
    }
    setIsTranscribing(false);
    setInterimText('');
  };

  const LoadingAnimation = () => (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xl text-center max-w-sm mx-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-800 text-lg font-medium">
          {answerMode === 'video' ? 'Analyzing your spoken answer…' : 'Generating feedback…'}
        </p>
        <p className="text-gray-600 text-sm mt-2">
          {answerMode === 'video'
            ? 'Usually 15–30 seconds (audio-only for speed)'
            : 'This may take a few moments'}
        </p>
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
      if (answerMode === 'video') {
        if (!recordedAudioBlob && !recordedBlob) {
          setError('Please record your answer first before submitting.');
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
      } else if (answerMode === 'video' && (recordedAudioBlob || recordedBlob)) {
        const uploadBlob = recordedAudioBlob || recordedBlob;
        const maxBytes = recordedAudioBlob ? MAX_AUDIO_BYTES : MAX_VIDEO_BYTES;
        if (!uploadBlob || uploadBlob.size > maxBytes) {
          setError(`Recording is too large. Please keep answers under ${MAX_RECORDING_SECONDS} seconds.`);
          setIsGeneratingFeedback(false);
          setLoading(false);
          return;
        }
        const base64Media = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            const base64 = resultStr.split(',')[1];
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('Failed to encode recording.'));
          reader.readAsDataURL(uploadBlob);
        });
        if (recordedAudioBlob) {
          requestBody.audioAnswer = base64Media;
        } else {
          requestBody.videoAnswer = base64Media;
        }
      } else {
        requestBody.answerText = transcribedText.trim() || answer.trim();
      }

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
        
        // Check for specific 503 Service Unavailable error
        if (response.status === 503) {
          throw new Error('The AI service is currently busy. Please wait a moment and try submitting your answer again.');
        } else {
          throw new Error(responseData.msg || responseData.error || 'Failed to submit answer');
        }
      }

      // Update the interview state with the complete updated interview from the backend
      setInterview(responseData);

      // Update feedback and score for the current question based on the response
      const submittedQuestion = responseData.questions[currentQuestionIndex];
      setFeedback(submittedQuestion.feedback);
      setScore(submittedQuestion.score);

      // Clear the answer input
      setAnswer('');
      setSelectedCodingLanguage('');
      setTranscribedText('');
      setInterimText('');
      resetVideoAnswerState(
        {
          setRecordedVideoUrl,
          setRecordedBlob,
          setRecordedAudioBlob,
          setRecordingTimer,
          setIsCameraActive,
          setIsRecording,
          setAnswerMode,
        },
        stopCamera,
        audioRecorderRef,
        audioChunksRef
      );

    } catch (err) {
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
      resetVideoAnswerState(
        {
          setRecordedVideoUrl,
          setRecordedBlob,
          setRecordedAudioBlob,
          setRecordingTimer,
          setIsCameraActive,
          setIsRecording,
          setAnswerMode,
        },
        stopCamera,
        audioRecorderRef,
        audioChunksRef
      );
    } else {
      // If this is the last question and all questions are answered, finish the interview
      const allQuestionsAnswered = interview.questions.every(isQuestionAnswered);
      if (allQuestionsAnswered) {
        router.push('/');
      } else {
        // This case should ideally not be reached if the backend correctly adds a new question until 5 are reached.
      }
    }
  };

  const speakAnswer = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new window.SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  const [showCodeInfo, setShowCodeInfo] = useState(false);

  if (loading && !interview) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center py-12 text-slate-800">
        <div className="h-10 w-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-lg font-medium">Loading interview…</p>
      </div>
    );
  }

  if (error && !interview) {
    return (
      <InterviewMessagePage
        title="Something went wrong"
        message={error}
        primaryLabel="Back to role selection"
        onPrimary={() => router.push('/interview/role-select')}
      />
    );
  }

  if (!interview || !interview.questions || interview.questions.length === 0) {
    return (
      <InterviewMessagePage
        title="No interview found"
        message="We could not load your interview. Start a new one from role selection."
        variant="warning"
        primaryLabel="Start a new interview"
        onPrimary={() => router.push('/interview/role-select')}
      />
    );
  }

  // Check if the current question has been answered based on the *latest* interview state
  const isAnswered = currentQuestion && isQuestionAnswered(currentQuestion);

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

  const statusAnsweredClass =
    'text-green-800 text-sm font-semibold bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg flex items-center gap-2';
  const statusPendingClass =
    'text-amber-800 text-sm font-semibold bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-2';

  const pageBackgroundStyle = {
    backgroundImage: 'url(/background.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } as const;

  return (
    <div className="min-h-screen bg-slate-100 relative" style={pageBackgroundStyle}>
      <div className="absolute inset-0 w-full h-full bg-white/80 z-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col min-h-screen pb-8">
        {isGeneratingFeedback && <LoadingAnimation />}
        {error && (
          <div className="max-w-4xl mx-auto w-full px-4 pt-4">
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 flex justify-between items-start gap-3 shadow-sm"
            >
              <p className="text-sm leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 text-sm font-medium text-red-700 hover:text-red-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {isCodingQuestion && currentQuestion ? (
          <div className="max-w-7xl mx-auto w-full px-4 py-6 md:py-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Coding Problem */}
            <div className="flex flex-col min-h-[420px] lg:min-h-[520px] p-6 md:p-8 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-lg text-slate-900">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 rounded-lg text-white">
                    Question {currentQuestionIndex + 1} of {interview.questions.length}
                  </h2>
                  {isAnswered ? (
                    <span className={statusAnsweredClass}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Answered
                    </span>
                  ) : (
                    <span className={statusPendingClass}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Unanswered
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4 text-blue-700 border-b border-slate-200 pb-3">Coding Problem</h3>
              <div className="prose max-w-none text-gray-800">
                {(() => {
                  const questionText = currentQuestion?.questionText?.replace('[CODING_PROBLEM]', '').trim() || '';
                  const parts = questionText.split(/```(\w+)?/);
                  return parts.map((part, index) => {
                    if (index % 2 === 1) {
                      return (
                        <pre key={index} className="bg-slate-100 p-4 rounded-lg my-4 overflow-x-auto border border-slate-200 text-slate-800">
                          <code className="text-sm">{part}</code>
                        </pre>
                      );
                    }
                    return <p key={index} className="mb-4 leading-relaxed">{part}</p>;
                  });
                })()}
              </div>
            </div>

            {/* Right: Code Editor */}
            <div className="flex flex-col min-h-[420px] lg:min-h-[520px] p-6 md:p-8 bg-white border border-slate-200 rounded-2xl shadow-lg text-slate-900">
              <label htmlFor="language-select" className="block text-sm font-medium text-slate-700 mb-2">
                Programming Language
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
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Your Solution
                    <button
                      type="button"
                      className="ml-1 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      title="Info"
                      onClick={() => setShowCodeInfo(true)}
                      style={{ fontSize: '1rem', lineHeight: 1 }}
                    >
                      i
                    </button>
                  </h3>
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
                {showCodeInfo && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-blue-200 relative">
                      <button
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                        onClick={() => setShowCodeInfo(false)}
                        aria-label="Close"
                      >
                        &times;
                      </button>
                      <div className="flex items-center mb-3">
                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 mr-2 font-bold text-lg">i</span>
                        <span className="text-lg font-semibold text-blue-700">Tip</span>
                      </div>
                      <p className="text-gray-800">You can write both <span className="font-semibold text-blue-600">code</span> and <span className="font-semibold text-blue-600">theory</span> in the same section. The AI will consider each part on its own.<br/><span className='block mt-3 text-green-700 font-semibold'>Don't worry, just do your best and keep going!</span></p>
                    </div>
                  </div>
                )}
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

            </div>
            </div>

            {isAnswered && (
              <div className="space-y-4">
                {currentQuestion?.codeFeedback && (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
                    <h3 className="text-base font-semibold text-emerald-900 mb-3">Code feedback</h3>
                    <div className="prose prose-sm max-w-none text-emerald-900">
                      <ReactMarkdown>{currentQuestion.codeFeedback}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {currentQuestion?.feedback && (
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm">
                    <h3 className="text-base font-semibold text-blue-900 mb-3">Feedback</h3>
                    <div className="prose prose-sm max-w-none text-blue-900">
                      <ReactMarkdown>{currentQuestion.feedback}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {currentQuestion?.codeScore != null && (
                  <div
                    className={`inline-flex px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                      currentQuestion.codeScore >= 7
                        ? 'bg-emerald-600'
                        : currentQuestion.codeScore >= 4
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                  >
                    Code score: {currentQuestion.codeScore}/10
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="btn btn-secondary flex items-center gap-2"
              >
                Previous
              </button>
              {interview.questions.every(isQuestionAnswered) ? (
                <button type="button" onClick={() => router.push('/')} className="btn btn-primary">
                  Finish interview
                </button>
              ) : (
                <button type="button" onClick={nextQuestion} className="btn btn-secondary">
                  Next question
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full py-6 md:py-10 px-4 space-y-6">
            <header className="text-center space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {interview.role.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}{' '}
                interview
              </h1>
              {interview.programmingLanguage && (
                <p className="text-slate-600 text-sm">{interview.programmingLanguage}</p>
              )}
            </header>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-md p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-base font-semibold text-blue-800 bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg">
                  Question {currentQuestionIndex + 1} of {interview.questions.length}
                </h2>
                {isAnswered ? (
                  <span className={statusAnsweredClass}>Answered</span>
                ) : (
                  <span className={statusPendingClass}>Awaiting answer</span>
                )}
              </div>
              <p className="text-slate-800 text-base md:text-lg leading-relaxed">{currentQuestion?.questionText}</p>
            </section>

            <section className="space-y-5">
              {!isCodingQuestion && !isAnswered ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-6 md:p-8 text-slate-900">
                  <h3 className="text-base font-semibold text-slate-800 mb-4">Your answer</h3>
                  <div className="flex justify-center mb-5">
                    <div className="bg-slate-100 p-1 rounded-xl inline-flex items-center gap-1 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setAnswerMode('text');
                          stopCamera();
                        }}
                        className={`px-6 py-2.5 rounded-lg transition-all duration-300 font-semibold flex items-center gap-2 text-sm sm:text-base ${
                          answerMode === 'text'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 hover:text-blue-700 hover:bg-white'
                        }`}
                      >
                        <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Type answer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAnswerMode('video');
                        }}
                        className={`px-6 py-2.5 rounded-lg transition-all duration-200 font-semibold flex items-center gap-2 text-sm sm:text-base ${
                          answerMode === 'video'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-blue-700 hover:bg-white'
                        }`}
                      >
                        <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Record Answer
                      </button>
                    </div>
                  </div>

                  {/* Panes */}
                  {answerMode === 'text' ? (
                    <div className="space-y-4">
                      <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="input min-h-[180px] bg-white"
                        placeholder="Type your answer here..."
                        disabled={isGeneratingFeedback}
                      />
                      <button
                        onClick={submitAnswer}
                        disabled={isGeneratingFeedback || !answer.trim()}
                        className={`btn btn-primary mt-4 w-full flex items-center justify-center gap-2 ${
                          isGeneratingFeedback ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isGeneratingFeedback ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24">
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
                  ) : (
                    /* Video Answer Pane */
                    <div className="space-y-6">
                      {!isCameraActive && !recordedVideoUrl ? (
                        /* Camera Initial / Disconnected state */
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl py-12 px-6 bg-slate-50 transition-all hover:bg-slate-100/80">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h4 className="text-xl font-bold text-slate-800 mb-2">Record video answer</h4>
                          <p className="text-slate-600 text-sm max-w-md text-center mb-6 leading-relaxed">
                            Record up to {MAX_RECORDING_SECONDS} seconds. Answer the question in your own words (do not read the question aloud). Audio is analyzed for speed; video is preview-only.
                          </p>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="btn btn-primary px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Enable Camera & Mic
                          </button>
                        </div>
                      ) : isCameraActive && !recordedVideoUrl ? (
                        /* Live camera preview & recording screen */
                        <div className="flex flex-col items-center">
                          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 shadow-2xl">
                            <video
                              ref={liveVideoRef}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-cover scale-x-[-1]"
                            />
                            {/* Recording overlay */}
                            {isRecording ? (
                              <div className="absolute top-4 left-4 bg-red-600/90 text-white font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow animate-pulse">
                                <span className="w-2.5 h-2.5 rounded-full bg-white block animate-ping" />
                                REC (00:{recordingTimer < 10 ? `0${recordingTimer}` : recordingTimer})
                              </div>
                            ) : (
                              <div className="absolute top-4 left-4 bg-white/90 text-slate-800 font-semibold text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow border border-slate-200">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" />
                                Camera live
                              </div>
                            )}

                            {isRecording && (
                              <div className="absolute top-4 right-4 bg-white/90 text-slate-800 text-xs px-3 py-1.5 rounded-full font-semibold border border-slate-200">
                                Max {MAX_RECORDING_SECONDS}s
                              </div>
                            )}

                            {isRecording && (
                              <div className="absolute bottom-0 left-0 h-1.5 bg-slate-200 w-full overflow-hidden">
                                <div
                                  className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                                  style={{ width: `${(recordingTimer / MAX_RECORDING_SECONDS) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex justify-center gap-4 mt-6 w-full">
                            {!isRecording ? (
                              <>
                                <button
                                  type="button"
                                  onClick={stopCamera}
                                  className="btn btn-secondary px-6 py-3 rounded-xl flex items-center gap-2"
                                >
                                  Close Camera
                                </button>
                                <button
                                  type="button"
                                  onClick={startRecording}
                                  className="btn btn-primary bg-red-600 hover:bg-red-700 text-white border-none px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg"
                                >
                                  <span className="w-3.5 h-3.5 bg-white rounded-full block border border-red-500 shadow-inner" />
                                  Start Recording
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="btn btn-primary bg-red-600 hover:bg-red-700 text-white border-none px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg"
                              >
                                <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                                  <rect x="4" y="4" width="16" height="16" rx="2" />
                                </svg>
                                Stop Recording
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Recorded Video Playback Preview state */
                        <div className="flex flex-col items-center">
                          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 shadow-2xl">
                            <video
                              ref={previewVideoRef}
                              src={recordedVideoUrl || undefined}
                              controls
                              playsInline
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 left-4 bg-green-600/90 text-white font-semibold text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Recorded Answer Ready
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full justify-center">
                            <button
                              type="button"
                              onClick={resetRecording}
                              disabled={isGeneratingFeedback}
                              className="btn btn-secondary px-6 py-3 rounded-xl flex items-center gap-2 justify-center"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.235" />
                              </svg>
                              Record Again
                            </button>
                            <button
                              type="button"
                              onClick={submitAnswer}
                              disabled={isGeneratingFeedback}
                              className={`btn btn-primary px-8 py-3 rounded-xl flex items-center gap-2 justify-center shadow-lg ${
                                isGeneratingFeedback ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {isGeneratingFeedback ? (
                                <>
                                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Evaluating Video...
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  Submit Video Answer
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700">Your answer</h3>
                  </div>
                  <div className="px-6 py-5">
                    {isVideoAnswerPlaceholder(currentQuestion?.answerText) ? (
                      <p className="text-slate-600 italic text-sm leading-relaxed">
                        {VIDEO_ANSWER_PLACEHOLDER}
                      </p>
                    ) : (
                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {currentQuestion?.answerText}
                      </p>
                    )}
                  </div>
                  {currentQuestion?.feedback && (
                    <div className="px-6 py-5 border-t border-slate-200 bg-blue-50">
                      <h3 className="text-sm font-semibold text-blue-900 mb-3">Feedback</h3>
                      <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
                        <ReactMarkdown>{currentQuestion.feedback}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {currentQuestion?.score != null && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-slate-600">Score</span>
                      <span
                        className={`inline-flex px-3 py-1 rounded-md text-sm font-semibold text-white ${
                          currentQuestion.score >= 7
                            ? 'bg-emerald-600'
                            : currentQuestion.score >= 4
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                      >
                        {currentQuestion.score}/10
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-3 pt-4">
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
                {interview.questions.every(isQuestionAnswered) ? (
                  <button
                    onClick={() => router.push('/')}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    Finish Interview
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                ) : currentQuestionIndex < interview.questions.length - 1 ? (
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
                    onClick={nextQuestion}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    Next Question
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}