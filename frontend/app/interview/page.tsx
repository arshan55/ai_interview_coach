'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useInterview } from '@/contexts/InterviewContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

export default function InterviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    currentInterview,
    startInterview,
    endInterview,
    isLoading,
    error
  } = useInterview();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Only initialize speech recognition on the client side
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setTranscript(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in your browser');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  };

  const handleStartInterview = async () => {
    try {
      await startInterview();
      toast.success('Interview started!');
    } catch (error) {
      toast.error('Failed to start interview');
    }
  };

  const handleEndInterview = async () => {
    try {
      await endInterview();
      toast.success('Interview ended!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to end interview');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Interview Session</h1>
        
        {!currentInterview ? (
          <Button 
            onClick={handleStartInterview}
            className="w-full"
          >
            Start Interview
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Interview ID: {currentInterview.id}</p>
                <p className="text-sm text-gray-500">
                  Started: {new Date(currentInterview.startTime).toLocaleString()}
                </p>
              </div>
              <Button 
                onClick={handleEndInterview}
                variant="destructive"
              >
                End Interview
              </Button>
            </div>

            <div className="mt-4">
              <Button
                onClick={toggleRecording}
                variant={isRecording ? "destructive" : "default"}
                className="w-full"
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>
              
              {transcript && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm">{transcript}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}