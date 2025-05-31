import React, { useState, useEffect } from 'react';
import interviewService from '../services/interviewService';

console.log('Executing app/interview/page.tsx');

const InterviewPage = () => {
  console.log('Rendering InterviewPage component');
  const [interview, setInterview] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Start a new interview when the page loads
  useEffect(() => {
    console.log('useEffect in InterviewPage is running');
    const startNewInterview = async () => {
      setLoading(true);
      try {
        console.log('Calling interviewService.startInterview');
        const newInterview = await interviewService.startInterview();
        console.log('Interview started:', newInterview);
        setInterview(newInterview);
        setCurrentQuestionIndex(0);
        setLoading(false);
      } catch (err) {
        console.error('Error starting interview:', err);
        setError(err);
        setLoading(false);
      }
    };
    startNewInterview();
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleAnswerSubmit = async () => {
    if (!interview) return;
    setLoading(true);
    try {
      console.log('Submitting answer:', answerText, 'for question index:', currentQuestionIndex);
      const updatedInterview = await interviewService.submitAnswer(
        interview._id,
        currentQuestionIndex,
        answerText
      );
      console.log('Answer submitted, updated interview:', updatedInterview);
      // Move to the next question, or handle interview completion
      if (currentQuestionIndex < updatedInterview.questions.length - 1) {
         setCurrentQuestionIndex(currentQuestionIndex + 1);
         setAnswerText(''); // Clear the input field for the next question
         console.log('Moving to next question');
      } else {
        // TODO: Handle interview completion and display overall feedback/score
        console.log('Interview finished!');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError(err);
      setLoading(false);
    }
  };

  const currentQuestion = interview?.questions[currentQuestionIndex];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <p className="text-white text-xl">Loading interview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <p className="text-red-500 text-xl">Error: {error.message}</p>
      </div>
    );
  }

  if (!interview || !currentQuestion) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <p className="text-white text-xl">Starting interview...</p>
         {/* You could add a button here to retry starting the interview */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center mb-8">AI Interview Practice</h1>
        
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl mb-8">
          <h2 className="text-2xl font-semibold mb-4">Question {currentQuestionIndex + 1}</h2>
          <p className="text-gray-300 text-lg mb-6">{currentQuestion.questionText}</p>
          
          <textarea
            className="w-full p-4 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="8"
            placeholder="Type your answer here..."
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
          ></textarea>
          
          <button
            className="mt-6 w-full px-6 py-3 bg-blue-600 text-white font-bold text-lg rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
            onClick={handleAnswerSubmit}
            disabled={loading || answerText.trim() === ''}
          >
            Submit Answer
          </button>
        </div>

        {/* Display feedback if available for the current question */}
        {currentQuestion.feedback && (
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
            <h3 className="text-2xl font-semibold mb-4">Feedback</h3>
            <p className="text-gray-300 text-lg mb-4">{currentQuestion.feedback}</p>
            {currentQuestion.score !== undefined && currentQuestion.score !== null && (
              <p className="text-gray-300 text-lg">Score: {currentQuestion.score}</p>
            )}
          </div>
        )}

        {/* TODO: Display overall feedback and score upon interview completion */}

      </div>
    </div>
  );
};

export default InterviewPage;
