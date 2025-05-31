import axios from 'axios';

const API_URL = '/api/interviews';

// Start a new interview
const startInterview = async () => {
  try {
    const response = await axios.post(API_URL);
    return response.data;
  } catch (error) {
    console.error('Error starting interview:', error);
    throw error;
  }
};

// Submit an answer and get feedback
const submitAnswer = async (interviewId, questionIndex, answerText) => {
  try {
    const response = await axios.post(`${API_URL}/${interviewId}/answer`, {
      questionIndex,
      answerText,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

// Get interview details
const getInterviewDetails = async (interviewId) => {
  try {
    const response = await axios.get(`${API_URL}/${interviewId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching interview details:', error);
    throw error;
  }
};

export default {
  startInterview,
  submitAnswer,
  getInterviewDetails,
}; 