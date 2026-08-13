'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Editor, { OnMount } from '@monaco-editor/react';
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
  wpm?: number | null;
  fillerWordsCount?: number | null;
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

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getMonacoLanguage = (lang: string) => {
  const l = lang.toLowerCase().trim();
  if (l === 'c++') return 'cpp';
  if (l === 'c#') return 'csharp';
  return l;
};

const getDefaultCodeTemplate = (lang: string) => {
  const l = lang.toLowerCase().trim();
  if (l === 'javascript') {
    return `/**\n * @param {any} input\n * @return {any}\n */\nfunction solve(input) {\n  // Write your JavaScript code here\n  \n  return null;\n}`;
  }
  if (l === 'typescript') {
    return `function solve(input: any): any {\n  // Write your TypeScript code here\n  \n  return null;\n}`;
  }
  if (l === 'python') {
    return `def solve(input_data):\n    # Write your Python code here\n    pass\n`;
  }
  if (l === 'java') {
    return `public class Solution {\n    public static Object solve(Object input) {\n        // Write your Java code here\n        \n        return null;\n    }\n}`;
  }
  if (l === 'c++') {
    return `#include <iostream>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        // Write your C++ code here\n    }\n};`;
  }
  if (l === 'go') {
    return `package main\n\nimport "fmt"\n\nfunc solve(input interface{}) interface{} {\n    // Write your Go code here\n    return nil\n}`;
  }
  return `// Write your code here\n`;
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
  const [timeSpent, setTimeSpent] = useState(0);

  // Split pane coding workspace states
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'feedback'>('problem');
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [isRunningCode, setIsRunningCode] = useState(false);

  // Speech metrics state
  const [speechWpm, setSpeechWpm] = useState<number | null>(null);
  const [speechFillerCount, setSpeechFillerCount] = useState<number | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const speechWordCountRef = useRef(0);
  const speechFillerWordsRef = useRef(0);
  const metricsRecognitionRef = useRef<any>(null);

  // Monaco editor ref for autocomplete mount
  const editorRef = useRef<any>(null);

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

  // Start background speech metrics recognition during video recording
  const startSpeechMetrics = () => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    speechStartTimeRef.current = Date.now();
    speechWordCountRef.current = 0;
    speechFillerWordsRef.current = 0;
    setSpeechWpm(null);
    setSpeechFillerCount(null);
    const fillerRegex = /\b(um+|uh+|ah+|er+|hmm+|like|you know|so|basically|literally|actually|i mean|right)\b/gi;
    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const t = event.results[i][0].transcript;
            const words = t.trim().split(/\s+/).filter(Boolean);
            speechWordCountRef.current += words.length;
            const fillers = t.match(fillerRegex);
            if (fillers) speechFillerWordsRef.current += fillers.length;
          }
        }
      };
      rec.start();
      metricsRecognitionRef.current = rec;
    } catch (e) { /* ignore */ }
  };

  const stopSpeechMetrics = () => {
    if (metricsRecognitionRef.current) {
      try { metricsRecognitionRef.current.stop(); } catch (e) { /* ignore */ }
      metricsRecognitionRef.current = null;
    }
    if (speechStartTimeRef.current) {
      const elapsed = (Date.now() - speechStartTimeRef.current) / 60000; // minutes
      const wpm = elapsed > 0 ? Math.round(speechWordCountRef.current / elapsed) : 0;
      setSpeechWpm(wpm);
      setSpeechFillerCount(speechFillerWordsRef.current);
      speechStartTimeRef.current = null;
    }
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
      startSpeechMetrics();

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTimer((prev) => {
          if (prev >= MAX_RECORDING_SECONDS) {
            const currentMediaRecorder = mediaRecorderRef.current;
            if (currentMediaRecorder && currentMediaRecorder.state !== 'inactive') {
              currentMediaRecorder.stop();
            }
            const currentAudioRecorder = audioRecorderRef.current;
            if (currentAudioRecorder && currentAudioRecorder.state !== 'inactive') {
              currentAudioRecorder.stop();
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
    const currentMediaRecorder = mediaRecorderRef.current;
    if (currentMediaRecorder && currentMediaRecorder.state !== 'inactive') {
      currentMediaRecorder.stop();
    }
    const currentAudioRecorder = audioRecorderRef.current;
    if (currentAudioRecorder && currentAudioRecorder.state !== 'inactive') {
      currentAudioRecorder.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    stopSpeechMetrics();
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

  const getAnswerValidationError = () => {
    if (!currentQuestion) return 'No question is currently selected.';

    if (isCodingQuestion) {
      const languageToUse = selectedCodingLanguage || interview?.programmingLanguage?.toLowerCase() || '';
      if (!answer.trim() || !languageToUse) {
        return 'Please provide code and select a programming language.';
      }
      return null;
    }

    if (answerMode === 'video') {
      if (!recordedAudioBlob && !recordedBlob) {
        return 'Please record your answer first before submitting.';
      }
      return null;
    }

    const finalAnswer = transcribedText.trim() || answer.trim();
    return finalAnswer ? null : 'Please provide an answer or use speech-to-text.';
  };

  const encodeBlobToBase64 = async (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      resolve(resultStr.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Failed to encode recording.'));
    reader.readAsDataURL(blob);
  });

  const buildAnswerRequestBody = async () => {
    const requestBody: any = {
      questionIndex: currentQuestionIndex,
      ...(speechWpm != null ? { wpm: speechWpm } : {}),
      ...(speechFillerCount != null ? { fillerWordsCount: speechFillerCount } : {}),
    };

    if (isCodingQuestion) {
      requestBody.codeAnswer = answer;
      requestBody.programmingLanguage = selectedCodingLanguage || interview?.programmingLanguage?.toLowerCase() || '';
      return requestBody;
    }

    if (answerMode === 'video' && (recordedAudioBlob || recordedBlob)) {
      const uploadBlob = recordedAudioBlob || recordedBlob;
      const maxBytes = recordedAudioBlob ? MAX_AUDIO_BYTES : MAX_VIDEO_BYTES;
      if (!uploadBlob || uploadBlob.size > maxBytes) {
        throw new Error(`Recording is too large. Please keep answers under ${MAX_RECORDING_SECONDS} seconds.`);
      }

      const base64Media = await encodeBlobToBase64(uploadBlob);
      if (recordedAudioBlob) {
        requestBody.audioAnswer = base64Media;
      } else {
        requestBody.videoAnswer = base64Media;
      }
      return requestBody;
    }

    requestBody.answerText = transcribedText.trim() || answer.trim();
    return requestBody;
  };

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

  const runCode = async () => {
    if (!answer.trim()) {
      setConsoleOutput('❌ Error: Solution cannot be empty.');
      setIsConsoleOpen(true);
      return;
    }
    setIsRunningCode(true);
    setIsConsoleOpen(true);
    setConsoleOutput('⏳ Running your code...');

    const lang = (selectedCodingLanguage || interview?.programmingLanguage || '').toLowerCase();

    if (lang === 'python') {
      // Use Pyodide for Python execution
      try {
        setConsoleOutput('⏳ Loading Python runtime (Pyodide)...');
        const pyodideModule = await (window as any).__pyodide_loading__ || (
          (window as any).__pyodide_loading__ = (async () => {
            if (!(window as any).loadPyodide) {
              await new Promise<void>((res, rej) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
                s.onload = () => res();
                s.onerror = () => rej(new Error('Failed to load Pyodide script'));
                document.head.appendChild(s);
              });
            }
            return await (window as any).loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
          })()
        );
        setConsoleOutput('✔ Python runtime ready. Running...\n');

        // Capture stdout
        pyodideModule.runPython(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);
        try {
          pyodideModule.runPython(answer);
          const stdout = pyodideModule.runPython('sys.stdout.getvalue()');
          const stderr = pyodideModule.runPython('sys.stderr.getvalue()');
          const out = (stdout || '').trim();
          const err = (stderr || '').trim();
          setConsoleOutput(
            `✔ Execution complete!\n\n` +
            (out ? `Output:\n${out}\n` : 'No output produced.\n') +
            (err ? `\n⚠ Stderr:\n${err}` : '')
          );
        } catch (pyErr: any) {
          setConsoleOutput(`❌ Python Runtime Error:\n${pyErr.message || String(pyErr)}`);
        }
      } catch (loadErr: any) {
        setConsoleOutput(`❌ Failed to load Python runtime:\n${loadErr.message || String(loadErr)}\n\nCheck your internet connection and try again.`);
      } finally {
        setIsRunningCode(false);
      }
      return;
    }

    if (lang === 'javascript' || lang === 'typescript') {
      // Run JS/TS in a sandboxed Web Worker
      try {
        const workerCode = `
self.onmessage = function(e) {
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.map(String).join(' '));
  try {
    const fn = new Function(e.data);
    fn();
    self.postMessage({ ok: true, output: logs.join('\\n') });
  } catch(err) {
    self.postMessage({ ok: false, error: err.message });
  } finally {
    console.log = origLog;
  }
};
`;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const worker = new Worker(url);

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            worker.terminate();
            setConsoleOutput('❌ Execution timed out (5s). Check for infinite loops.');
            resolve();
          }, 5000);

          worker.onmessage = (e) => {
            clearTimeout(timeout);
            worker.terminate();
            URL.revokeObjectURL(url);
            if (e.data.ok) {
              setConsoleOutput(
                `✔ Execution complete!\n\n` +
                (e.data.output ? `Output:\n${e.data.output}` : 'No output (add console.log() calls to see results)')
              );
            } else {
              setConsoleOutput(`❌ Runtime Error:\n${e.data.error}`);
            }
            resolve();
          };

          worker.onerror = (err) => {
            clearTimeout(timeout);
            worker.terminate();
            URL.revokeObjectURL(url);
            setConsoleOutput(`❌ Worker Error:\n${err.message}`);
            resolve();
          };

          worker.postMessage(answer);
        });
      } catch (err: any) {
        setConsoleOutput(`❌ Failed to start execution:\n${err.message}`);
      } finally {
        setIsRunningCode(false);
      }
      return;
    }

    // For other languages (Java, C++, Go etc.) — static analysis only
    setConsoleOutput(
      `ℹ️ In-browser execution is available for JavaScript and Python only.\n` +
      `For ${lang.toUpperCase()}, use "Submit Solution" to get AI evaluation of your code quality and correctness.`
    );
    setIsRunningCode(false);
  };

  const resetCode = () => {
    if (confirm('Are you sure you want to reset your code to the default template? Your current changes will be lost.')) {
      const lang = selectedCodingLanguage || interview?.programmingLanguage || 'javascript';
      setAnswer(getDefaultCodeTemplate(lang));
    }
  };

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    // Enable rich IntelliSense
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      checkJs: true,
    });
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      strict: false,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    // Quick suggestions globally
    editor.updateOptions({
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      parameterHints: { enabled: true },
      wordBasedSuggestions: 'allDocuments',
      suggest: { snippetsPreventQuickSuggestions: false },
    });
  }, []);

  const exportPDF = async () => {
    if (!interview || !currentQuestion) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      const lineH = 7;
      let y = 20;

      const addText = (text: string, size = 11, bold = false, color: [number,number,number] = [30,30,30]) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, pageW - margin * 2);
        lines.forEach((line: string) => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += lineH;
        });
      };

      const addDivider = () => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setDrawColor(200, 210, 230);
        doc.line(margin, y, pageW - margin, y);
        y += 5;
      };

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageW, 18, 'F');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('AI Interview Coach — Session Report', margin, 12);
      y = 26;

      addText(`Role: ${interview.role.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`, 12, true);
      if (interview.programmingLanguage) addText(`Language: ${interview.programmingLanguage}`, 11);
      addText(`Date: ${new Date(interview.date).toLocaleString()}`, 11);
      if (interview.overallScore != null) addText(`Overall Score: ${interview.overallScore}/10`, 12, true, [37, 99, 235]);
      y += 4;

      interview.questions.forEach((q, i) => {
        addDivider();
        const qText = q.questionText.replace('[CODING_PROBLEM]', '[Coding] ').replace(/^\[Coding\]\s*/, '[Coding] ');
        addText(`Q${i + 1}: ${qText}`, 11, true, [30, 64, 175]);
        y += 2;
        if (q.answerText && q.answerText !== VIDEO_ANSWER_PLACEHOLDER) {
          addText(`Answer: ${q.answerText}`, 10);
        }
        if (q.codeAnswer) {
          addText('Code Solution:', 10, true);
          addText(q.codeAnswer, 9, false, [40, 40, 40]);
        }
        if (q.feedback) { y += 2; addText(`Feedback: ${q.feedback}`, 10, false, [21, 128, 61]); }
        if (q.codeFeedback) { addText(`Code Feedback: ${q.codeFeedback}`, 10, false, [6, 95, 70]); }
        const s = q.codeScore ?? q.score;
        if (s != null) addText(`Score: ${s}/10`, 10, true, [37, 99, 235]);
        if (q.wpm != null) addText(`Speaking Speed: ${q.wpm} WPM`, 10, false, [100, 60, 180]);
        if (q.fillerWordsCount != null) addText(`Filler Words Detected: ${q.fillerWordsCount}`, 10, false, [180, 100, 20]);
        y += 3;
      });

      if (interview.overallFeedback) {
        addDivider();
        addText('Overall Feedback', 12, true, [30, 30, 30]);
        addText(interview.overallFeedback, 10);
      }

      doc.save(`interview-report-${interview._id}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const submitAnswer = async () => {
    if (!interview || !currentQuestion) return;

    const validationError = getAnswerValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsGeneratingFeedback(true);
      setError(null);
      setLoading(true);

      const token = localStorage.getItem('token');
      const requestBody = await buildAnswerRequestBody();

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

  // Check if the current question has been answered based on the *latest* interview state
  const isAnswered = !!(currentQuestion && isQuestionAnswered(currentQuestion));

  // Reset timer on question change
  useEffect(() => {
    setTimeSpent(0);
  }, [currentQuestionIndex]);

  // Sync the answer state with the current question's answer (if it has one) or initialize with template
  useEffect(() => {
    if (currentQuestion) {
      if (isCodingQuestion) {
        if (currentQuestion.codeAnswer) {
          setAnswer(currentQuestion.codeAnswer);
        } else {
          const lang = selectedCodingLanguage || interview?.programmingLanguage || 'javascript';
          setAnswer(getDefaultCodeTemplate(lang));
        }
      } else {
        setAnswer(currentQuestion.answerText || '');
      }
    } else {
      setAnswer('');
    }
  }, [currentQuestionIndex, interview, isCodingQuestion, selectedCodingLanguage]);

  // Sync the active left tab based on whether the question has been answered
  useEffect(() => {
    if (isAnswered) {
      setActiveLeftTab('feedback');
    } else {
      setActiveLeftTab('problem');
    }
  }, [isAnswered, currentQuestionIndex]);

  // Tick timer every second for active coding questions
  useEffect(() => {
    if (!isCodingQuestion || isGeneratingFeedback || loading || !interview || isAnswered) {
      return;
    }

    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isCodingQuestion, isGeneratingFeedback, loading, interview, isAnswered, currentQuestionIndex]);

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
        {/* Global Header Bar */}
        <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 transition-all duration-300">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-slate-500 hover:text-slate-800 transition-colors"
                title="Back to home"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest font-mono">AI Interview Coach</span>
                <h1 className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">
                  {interview.role.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Session
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Question progress pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Question {currentQuestionIndex + 1} of {interview.questions.length}
              </div>

              {/* PDF Export Button */}
              <button
                type="button"
                onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-205"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Report PDF
              </button>
            </div>
          </div>
        </header>

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
          <div className="max-w-[1600px] mx-auto w-full px-4 py-6 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
              {/* Left Panel: Problem or Feedback */}
              <div className="xl:col-span-5 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden text-slate-900">
                <div className="flex border-b border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setActiveLeftTab('problem')}
                    className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all duration-200 border-b-2 ${
                      activeLeftTab === 'problem'
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/55'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Problem Description
                  </button>
                  {isAnswered && (
                    <button
                      type="button"
                      onClick={() => setActiveLeftTab('feedback')}
                      className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all duration-200 border-b-2 ${
                        activeLeftTab === 'feedback'
                          ? 'border-blue-600 text-blue-600 bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/55'
                      }`}
                    >
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h0a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Feedback & Score
                    </button>
                  )}
                </div>

                <div className="flex-1 p-6 overflow-y-auto max-h-[580px] lg:max-h-[650px] min-h-[480px]">
                  {activeLeftTab === 'problem' ? (
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">
                          Question {currentQuestionIndex + 1} of {interview.questions.length}
                        </h2>
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider font-mono">
                          {interview?.programmingLanguage || 'Coding'}
                        </span>
                        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider">
                          Coding Problem
                        </span>
                        {isAnswered ? (
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
                            Answered
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block animate-pulse"></span>
                            Awaiting Solution
                          </span>
                        )}
                      </div>

                      <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                        <ReactMarkdown>{codingQuestionText || ''}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Evaluation Score</h4>
                          <p className="text-xs text-slate-500 mt-1">Based on correctness, efficiency, and design.</p>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-w-[100px]">
                          <span className="text-3xl font-extrabold text-blue-600">
                            {currentQuestion?.codeScore ?? currentQuestion?.score ?? 0}
                          </span>
                          <span className="text-xs text-slate-400 font-bold border-t border-slate-100 mt-1 pt-1 w-full text-center">
                            OUT OF 10
                          </span>
                        </div>
                      </div>

                      {/* Speech Metrics Display for Answered Coding Question */}
                      {(currentQuestion?.wpm || currentQuestion?.fillerWordsCount) && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl space-y-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Speech Recognition Metrics</h4>
                          <div className="grid grid-cols-2 gap-4 pt-1">
                            {currentQuestion.wpm && (
                              <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100/50">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Speaking Speed</span>
                                <span className="text-base font-extrabold text-blue-600">{currentQuestion.wpm} WPM</span>
                              </div>
                            )}
                            {currentQuestion.fillerWordsCount !== undefined && currentQuestion.fillerWordsCount !== null && (
                              <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100/50">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Filler Words</span>
                                <span className="text-base font-extrabold text-indigo-600">{currentQuestion.fillerWordsCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {currentQuestion?.codeFeedback && (
                        <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
                          <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Code Execution & Structure Feedback
                          </h3>
                          <div className="prose prose-sm prose-emerald max-w-none text-emerald-900">
                            <ReactMarkdown>{currentQuestion.codeFeedback}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {currentQuestion?.feedback && (
                        <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                          <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Conceptual & Logic Feedback
                          </h3>
                          <div className="prose prose-sm prose-blue max-w-none text-blue-900">
                            <ReactMarkdown>{currentQuestion.feedback}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Code Editor & Console */}
              <div className="xl:col-span-7 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
                {/* Editor Header */}
                <div className="flex justify-between items-center px-6 py-4 bg-slate-950 border-b border-slate-850">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider font-mono">
                      solution.{getMonacoLanguage(selectedCodingLanguage || interview?.programmingLanguage || 'javascript') === 'cpp' ? 'cpp' : getMonacoLanguage(selectedCodingLanguage || interview?.programmingLanguage || 'javascript') === 'python' ? 'py' : 'js'}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-slate-600 font-medium font-sans">| Language:</span>
                      <select
                        className="bg-slate-900 border border-slate-800 rounded-lg text-slate-350 text-xs px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                        value={selectedCodingLanguage || interview?.programmingLanguage?.toLowerCase() || ''}
                        disabled
                      >
                        <option value="">{interview?.programmingLanguage || 'Select a language'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-slate-250 hover:bg-slate-700 transition-colors text-xs font-bold"
                      title="Code Info Tips"
                      onClick={() => setShowCodeInfo(true)}
                    >
                      ?
                    </button>
                    <button
                      type="button"
                      onClick={resetCode}
                      disabled={isGeneratingFeedback || isAnswered}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-850 disabled:opacity-50 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-750 rounded-lg text-xs font-semibold transition-all duration-205"
                      title="Reset code to default template"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.235" />
                      </svg>
                      Reset Code
                    </button>
                  </div>
                </div>

                {showCodeInfo && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-800 relative">
                      <button
                        className="absolute top-3 right-3 text-slate-500 hover:text-slate-350 text-xl font-bold"
                        onClick={() => setShowCodeInfo(false)}
                        aria-label="Close"
                      >
                        ✕
                      </button>
                      <div className="flex items-center mb-3">
                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-900/40 text-blue-400 mr-2.5 font-bold text-base">i</span>
                        <span className="text-lg font-bold text-blue-400">Coding Tip</span>
                      </div>
                      <p className="text-slate-355 text-sm leading-relaxed">
                        You can write both <span className="font-semibold text-blue-400">code</span> and <span className="font-semibold text-blue-400">theoretical comments</span> in the same file.
                        The AI evaluator will evaluate your implementation details and logical structuring.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowCodeInfo(false)}
                        className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                )}

                {/* Editor Container */}
                <div className="flex-1 min-h-[420px] bg-slate-950 relative">
                  <Editor
                    height="100%"
                    language={getMonacoLanguage(selectedCodingLanguage || interview?.programmingLanguage || 'javascript')}
                    theme="vs-dark"
                    value={answer}
                    onChange={(val) => setAnswer(val || '')}
                    onMount={handleEditorMount}
                    loading={
                      <div className="h-full flex items-center justify-center bg-slate-955 text-slate-500 font-mono text-sm">
                        <div className="animate-pulse mr-2">⚡</div> Loading Editor...
                      </div>
                    }
                    options={{
                      autoClosingBrackets: 'always',
                      autoClosingQuotes: 'always',
                      autoClosingDelete: 'always',
                      autoClosingOvertype: 'always',
                      autoSurround: 'languageDefined',
                      minimap: { enabled: false },
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      fontSize: 14,
                      readOnly: isGeneratingFeedback || isAnswered,
                      automaticLayout: true,
                    }}
                  />
                </div>

                {/* Collapsible Console */}
                <div 
                  className={`border-t border-slate-800 bg-slate-955 transition-all duration-350 ease-in-out overflow-hidden flex flex-col ${
                    isConsoleOpen ? 'h-[180px]' : 'h-0'
                  }`}
                >
                  <div className="flex justify-between items-center px-6 py-2 bg-slate-900 border-b border-slate-850">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Console Output</span>
                    <button
                      type="button"
                      onClick={() => setIsConsoleOpen(false)}
                      className="text-slate-500 hover:text-slate-350 text-xs font-bold font-mono"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 p-4 font-mono text-xs text-slate-350 overflow-y-auto whitespace-pre-wrap select-text selection:bg-blue-600/50">
                    {consoleOutput || 'Click "Run Code" to compile and run your solution.'}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex justify-between items-center px-6 py-4 bg-slate-955 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold"
                  >
                    <span className="font-mono uppercase tracking-wider">Console</span>
                    <svg 
                      className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isConsoleOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={runCode}
                      disabled={isRunningCode || isGeneratingFeedback}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-850 disabled:opacity-50 text-slate-300 border border-slate-800 hover:border-slate-750 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2"
                    >
                      {isRunningCode ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Running...
                        </>
                      ) : (
                        'Run Code'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={submitAnswer}
                      disabled={isGeneratingFeedback || isAnswered || !answer.trim()}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-all duration-200 flex items-center gap-2"
                    >
                      {isGeneratingFeedback ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        'Submit Solution'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="flex flex-wrap justify-between gap-3 pt-4 border-t border-slate-200">
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
                  Finish Interview
                </button>
              ) : (
                <button type="button" onClick={nextQuestion} className="btn btn-secondary">
                  Next Question
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

                          {/* Live Speech Metrics Card */}
                          {(speechWpm !== null || speechFillerCount !== null) && (
                            <div className="w-full mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl shadow-sm flex items-center justify-around text-slate-800 animate-fadeIn">
                              {speechWpm !== null && (
                                <div className="text-center">
                                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Speaking Speed</span>
                                  <span className="text-xl font-extrabold text-blue-600">{speechWpm} WPM</span>
                                  <span className="block text-[9px] text-slate-500 mt-0.5">
                                    {speechWpm < 110 ? 'Pace: Slow' : speechWpm > 150 ? 'Pace: Fast' : 'Pace: Optimal'}
                                  </span>
                                </div>
                              )}
                              <div className="w-px h-8 bg-slate-200" />
                              {speechFillerCount !== null && (
                                <div className="text-center">
                                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Filler Words</span>
                                  <span className="text-xl font-extrabold text-indigo-600">{speechFillerCount}</span>
                                  <span className="block text-[9px] text-slate-500 mt-0.5">
                                    {speechFillerCount === 0 ? 'Perfect clarity!' : speechFillerCount > 5 ? 'High count' : 'Normal'}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

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
                  {(currentQuestion?.wpm || currentQuestion?.fillerWordsCount) && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-6">
                      {currentQuestion.wpm && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Speaking Speed:</span>
                          <span className="text-sm font-extrabold text-blue-650">{currentQuestion.wpm} WPM</span>
                        </div>
                      )}
                      {currentQuestion.fillerWordsCount !== undefined && currentQuestion.fillerWordsCount !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Filler Words:</span>
                          <span className="text-sm font-extrabold text-indigo-600">{currentQuestion.fillerWordsCount}</span>
                        </div>
                      )}
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