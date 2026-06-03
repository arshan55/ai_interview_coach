import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const interviewService = {
  async startInterview() {
    try {
      const response = await axios.post(`${API_BASE_URL}/interviews/start`);
      return response.data;
    } catch (error) {
      console.error('Error starting interview:', error);
      throw error;
    }
  },

  async submitAnswer(interviewId: string, questionIndex: number, answer: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/interviews/${interviewId}/answer`, {
        questionIndex,
        answer
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }
};

export default interviewService; 