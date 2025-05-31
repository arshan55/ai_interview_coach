const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth'); // Assuming you'll have auth middleware
const Interview = require('../../models/Interview');
const User = require('../../models/User'); // Add User model import
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Changed model from 'gemini-1.0-pro' to 'gemini-2.0-flash' based on documentation

// Helper function to generate prompt from interview history
const generatePrompt = (interview) => {
  let prompt = "You are an AI interviewer conducting a job interview. Ask one question at a time. The interview should consist of exactly 5 questions. After the user provides an answer, provide constructive feedback on their answer, give a score out of 10 for that answer, and then ask the next question. You can sometimes ask a coding problem for technical roles. If you ask a coding problem, start the question text with [CODING_PROBLEM].\n\n";

  // Add role and programming language context
  prompt += `The candidate is interviewing for a ${interview.role.replace('-', ' ')} position.`;
  if (interview.programmingLanguage) {
    prompt += ` The preferred programming language is ${interview.programmingLanguage}.`;
  }
  prompt += '\n\n';

  if (interview.questions && interview.questions.length > 0) {
    interview.questions.forEach((q, index) => {
      prompt += `Question ${index + 1}: ${q.questionText}\n`;
      if (q.answerText) {
        prompt += `Your Answer: ${q.answerText}\n`;
      }
      if (q.codeAnswer) {
        prompt += `Your Code Answer (in ${q.programmingLanguage}):\n\`\`\`${q.programmingLanguage}\n${q.codeAnswer}\n\`\`\`\n`;
      }
      if (q.feedback) {
        prompt += `Feedback on Answer ${index + 1}: ${q.feedback}\n`;
      }
       if (q.score !== undefined && q.score !== null) {
        prompt += `Score on Answer ${index + 1}: ${q.score}/10\n`;
      }
      if (q.codeFeedback) {
        prompt += `Code Feedback on Answer ${index + 1}: ${q.codeFeedback}\n`;
      }
       if (q.codeScore !== undefined && q.codeScore !== null) {
        prompt += `Code Score on Answer ${index + 1}: ${q.codeScore}/10\n`;
      }
    });

    // Add the latest answer/code if available in the last question before asking for feedback/next question
     const lastQ = interview.questions[interview.questions.length -1];
     if((lastQ.answerText && !lastQ.feedback) || (lastQ.codeAnswer && !lastQ.codeFeedback)) { // Only add if answer submitted but no feedback yet
        if(lastQ.answerText) prompt += `Your Answer: ${lastQ.answerText}\n`;
        if(lastQ.codeAnswer) prompt += `Your Code Answer (in ${lastQ.programmingLanguage}):\n\`\`\`${lastQ.programmingLanguage}\n${lastQ.codeAnswer}\n\`\`\`\n`;
     }

    // Instruct AI on how to respond based on the last question type
    if (lastQ.questionText.startsWith('[CODING_PROBLEM]')) {
        prompt += "\nBased on the above history, specifically the last coding question and code answer, provide constructive feedback on the code, give a score out of 10 for the code, and then ask the next question. If the next question is also a coding problem, start its text with [CODING_PROBLEM]. Format your response strictly as follows: Feedback: [Feedback on conceptual understanding of the problem]\nScore: [Score out of 10 for conceptual understanding]\nCode Feedback: [Feedback on the submitted code]\nCode Score: [Score out of 10 for the code]\nNext Question: [Your next question here]";
    } else {
        prompt += "\nBased on the above history, specifically the last question and answer, provide constructive feedback on their answer, give a score out of 10 for that answer, and then ask the next question. If the next question is a coding problem, start its text with [CODING_PROBLEM]. Format your response strictly as follows: Feedback: [Your feedback here]\nScore: [Score out of 10]\nNext Question: [Your next question here]";
    }

  } else {
    // Initial prompt for the first question
    prompt += "Start the interview by asking the first question for the selected role. The interview should consist of exactly 5 questions in total. If the first question is a coding problem, start its text with [CODING_PROBLEM]. Respond using the exact format: Feedback: [Initial feedback or greeting]\nScore: [N/A]\nNext Question: [Your first question here]";
  }

  return prompt;
};

// Helper function for retrying AI calls
const retryGenerateContent = async (prompt, retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (error) {
      if (error.status === 503 && i < retries - 1) {
        console.warn(`AI model overloaded (503). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Rethrow other errors or the last 503 error
      }
    }
  }
  throw new Error(`AI model remains overloaded after ${retries} retries.`);
};

// @route POST api/interviews
// @desc Start a new interview
// @access Private (Requires authentication)
router.post(
  '/',
  auth,
  async (req, res) => {
    try {
      // Extract role and programming language from the request body
      const { role, programmingLanguage } = req.body;

      // Basic validation (optional, as model schema has required)
      if (!role) {
        return res.status(400).json({ error: 'Role is required' });
      }

      // Generate the first question using Gemini API with retry logic
      const prompt = generatePrompt({ questions: [], role, programmingLanguage });
      const result = await retryGenerateContent(prompt); // Use retry helper
      const responseText = result.response.text();

      console.log('Raw AI response for first question:\n', responseText);

      // Parse the response to get the first question and initial feedback
      const feedbackMatch = responseText.match(/Feedback:\s*(.*?)(?:\n|$)/i);
      const nextQuestionMatch = responseText.match(/Next Question:\s*(.+?)\s*$/im); // Modified regex

      const initialFeedback = feedbackMatch ? feedbackMatch[1].trim() : 'Welcome to your interview practice!';
      const firstQuestionText = nextQuestionMatch && nextQuestionMatch[1] ? nextQuestionMatch[1].trim() : 'Could not generate the first question.';

      const newInterview = new Interview({
        user: req.user.id,
        role,
        programmingLanguage: programmingLanguage,
        questions: [{
          questionText: firstQuestionText,
          answerText: null,
          feedback: initialFeedback,
          score: null,
        }],
        date: new Date()
      });

      const interview = await newInterview.save();

      // Add interview ID to user's interviews array
      await User.findByIdAndUpdate(
        req.user.id,
        { $push: { interviews: interview._id } },
        { new: true }
      );

      res.json(interview);
    } catch (err) {
      console.error('Error starting interview with AI:', err.message);
      // Specific error handling for AI overload during start
       if (err.message.includes('AI model remains overloaded') || (err.status === 503)) {
          res.status(503).json({ error: 'AI service is currently busy. Please try again later.' });
       } else {
         res.status(500).json({ error: 'Server Error', details: err.message });
       }
    }
  }
);

// @route POST api/interviews/:interview_id/answer
// @desc Submit an answer for a question
// @access Private
router.post('/:interview_id/answer', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.interview_id);
    if (!interview) {
      return res.status(404).json({ msg: 'Interview not found' });
    }

    // Check if user owns the interview
    if (interview.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const { questionIndex, answerText, codeAnswer, programmingLanguage, videoAnswer, audioAnswer } = req.body;

    if (questionIndex === undefined || questionIndex >= interview.questions.length) {
      return res.status(400).json({ msg: 'Invalid question index' });
    }

    const question = interview.questions[questionIndex];
    const isCodingQuestion = question.questionText.startsWith('[CODING_PROBLEM]');

    // Validate input based on question type
    if (isCodingQuestion) {
      if (!codeAnswer || !programmingLanguage) {
        return res.status(400).json({ msg: 'Code answer and programming language are required for coding questions' });
      }
      question.codeAnswer = codeAnswer;
      question.programmingLanguage = programmingLanguage;
    } else if (audioAnswer) {
      question.audioAnswer = audioAnswer;
      // Generate feedback for audio answer using Gemini AI with retry
      const prompt = `You are an expert interviewer. Please evaluate the candidate's answer based on the context that it was provided as an audio recording for the following question and provide feedback and a score out of 10. Focus on clarity, technical accuracy (based on the question), and communication skills.\n\nQuestion: ${question.questionText}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n
Format your response as:
Feedback: [your feedback]
Score: [score out of 10]
Areas for Improvement: [specific areas to improve]`;

      const result = await retryGenerateContent(prompt); // Use retry helper
      const response = await result.response;
      const text = response.text();

      // Parse the response to extract feedback and score
      const feedbackMatch = text.match(/Feedback: (.*?)(?=Score:|$)/s);
      const scoreMatch = text.match(/Score: (\d+)/);

      question.feedback = feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided';
      question.score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    } else if (videoAnswer) {
      question.videoAnswer = videoAnswer;
      // Generate feedback for video answer using Gemini AI (existing logic)
      const prompt = `You are an expert interviewer. Please evaluate this video answer for the following question and provide feedback and a score out of 10. Focus on clarity, technical accuracy, and communication skills.\n\nQuestion: ${question.questionText}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n\nFormat your response as:
Feedback: [your feedback]\nScore: [score out of 10]\nAreas for Improvement: [specific areas to improve]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response to extract feedback and score
      const feedbackMatch = text.match(/Feedback: (.*?)(?=Score:|$)/s);
      const scoreMatch = text.match(/Score: (\d+)/);

      question.feedback = feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided';
      question.score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    } else {
      if (!answerText && !videoAnswer && !audioAnswer) { // Require either text OR video OR audio answer
         return res.status(400).json({ msg: 'Answer text, video answer, or audio answer is required for non-coding questions' });
      }

      if (answerText) {
        question.answerText = answerText;
      } else if (videoAnswer) {
         // Handle video answer (existing logic)
         question.videoAnswer = videoAnswer;
         // Generate feedback for video answer using Gemini AI with retry
         const prompt = `You are an expert interviewer. Please evaluate this video answer for the following question and provide feedback and a score out of 10. Focus on clarity, technical accuracy, and communication skills.\n\nQuestion: ${question.questionText}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n\nFormat your response as:\nFeedback: [your feedback]\nScore: [score out of 10]\nAreas for Improvement: [specific areas to improve]`;

         const result = await retryGenerateContent(prompt); // Use retry helper
         const response = await result.response;
         const text = response.text();

         // Parse the response to extract feedback and score
         const feedbackMatch = text.match(/Feedback: (.*?)(?=Score:|$)/s);
         const scoreMatch = text.match(/Score: (\d+)/);

         question.feedback = feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided';
         question.score = scoreMatch ? parseInt(scoreMatch[1]) : null;
      } else if (audioAnswer) {
         question.audioAnswer = audioAnswer;
         // Generate feedback for audio answer using Gemini AI with retry
         // Note: Gemini doesn't directly process audio, so we'll adapt the prompt
         const prompt = `You are an expert interviewer. Please evaluate the candidate's answer based on the context that it was provided as an audio recording for the following question and provide feedback and a score out of 10. Focus on clarity, technical accuracy (based on the question), and communication skills.\n\nQuestion: ${question.questionText}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n
Format your response as:
Feedback: [your feedback]
Score: [score out of 10]
Areas for Improvement: [specific areas to improve]`;

         const result = await retryGenerateContent(prompt); // Use retry helper
         const response = await result.response;
         const text = response.text();

         // Parse the response to extract feedback and score
         const feedbackMatch = text.match(/Feedback: (.*?)(?=Score:|$)/s);
         const scoreMatch = text.match(/Score: (\d+)/);

         question.feedback = feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided';
         question.score = scoreMatch ? parseInt(scoreMatch[1]) : null;
      }
    }

    // Generate feedback using Gemini AI for text answers with retry
    if (!videoAnswer && !audioAnswer && !isCodingQuestion) {
       const prompt = `You are an expert interviewer. Please evaluate this answer and provide feedback and a score out of 10. Focus on clarity, technical accuracy, and communication skills.\n\nQuestion: ${question.questionText}\nAnswer: ${answerText}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n\nFormat your response as:\nFeedback: [your feedback]\nScore: [score out of 10]\nAreas for Improvement: [specific areas to improve]`;

       const result = await retryGenerateContent(prompt); // Use retry helper
       const response = await result.response;
       const text = response.text();

       // Parse the response to extract feedback and score
       const feedbackMatch = text.match(/Feedback: (.*?)(?=Score:|$)/s);
       const scoreMatch = text.match(/Score: (\d+)/);

       question.feedback = feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided';
       question.score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    }

     // Handle coding question feedback generation with retry
    if (isCodingQuestion && (question.codeAnswer || question.answerText)) { // Ensure answer exists before generating code feedback
       const prompt = `You are an expert programmer. Please evaluate this code answer and provide feedback and a score out of 10. Focus on code quality, efficiency, and best practices.\n\nQuestion: ${question.questionText}\nProgramming Language: ${programmingLanguage}\nCode Answer: ${codeAnswer}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n\nFormat your response as:\nFeedback: [your feedback]\nScore: [score out of 10]\nAreas for Improvement: [specific areas to improve]`;

       const result = await retryGenerateContent(prompt); // Use retry helper
       const response = await result.response;
       const text = response.text();

       // Parse the response to extract feedback and score
       const feedbackMatch = text.match(/Feedback: (.*?)(?=Score:|$)/s);
       const scoreMatch = text.match(/Score: (\d+)/);

       question.codeFeedback = feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided';
       question.codeScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    }

    // If this is the last question and all questions are answered, calculate overall score
    if (questionIndex === interview.questions.length - 1) {
      const totalScore = interview.questions.reduce((sum, q) => {
        const score = isCodingQuestion ? q.codeScore : q.score;
        return sum + (score || 0);
      }, 0);
      interview.overallScore = Math.round(totalScore / interview.questions.length);

      // Generate overall feedback with retry
      const overallPrompt = `You are an expert interviewer. Please provide overall feedback for this interview based on the following scores and feedback:

${interview.questions.map((q, i) => `
Question ${i + 1}: ${q.questionText}
Score: ${isCodingQuestion ? q.codeScore : q.score}/10
Feedback: ${isCodingQuestion ? q.codeFeedback : q.feedback}
`).join('\n')}

Overall Score: ${interview.overallScore}/10

Please provide comprehensive feedback focusing on:
1. Overall performance
2. Key strengths
3. Areas for improvement
4. Recommendations for future interviews

Format your response as:
Overall Feedback: [your feedback]`;

      const overallResult = await retryGenerateContent(overallPrompt); // Use retry helper
      const overallResponse = await overallResult.response;
      const overallText = overallResponse.text();

      const overallFeedbackMatch = overallText.match(/Overall Feedback: (.*?)$/s);
      interview.overallFeedback = overallFeedbackMatch ? overallFeedbackMatch[1].trim() : 'No overall feedback provided';
    }

    await interview.save();

    // If this is not the last question and less than 5 questions, generate and add the next question
    if (interview.questions.length < 5) { // Ensure total questions is less than 5
      try {
        // Generate prompt for the next question based on the updated interview history
        const nextQuestionPrompt = generatePrompt(interview);
        const nextQuestionResult = await retryGenerateContent(nextQuestionPrompt); // Use retry helper
        const nextQuestionResponse = await nextQuestionResult.response; // Get the response object
        const nextQuestionResponseText = nextQuestionResponse.text(); // Get the text from the response

        console.log('Raw AI response for next question:\n', nextQuestionResponseText);

        // Parse the response to get the next question text
        const nextQuestionMatch = nextQuestionResponseText.match(/Next Question:\s*(.+?)\s*$/im); // Modified regex
        const nextQuestionText = nextQuestionMatch && nextQuestionMatch[1] ? nextQuestionMatch[1].trim() : 'Could not generate the next question.';

        // Create and add the new question to the interview
        const newQuestion = {
          questionText: nextQuestionText,
          answerText: null,
          feedback: null,
          score: null,
          codeAnswer: null,
          programmingLanguage: null,
          codeFeedback: null,
          codeScore: null,
          videoAnswer: null,
          audioAnswer: null,
        };
        interview.questions.push(newQuestion);

        // Save the interview with the new question added
        await interview.save();

      } catch (generateErr) {
        console.error('Error generating and adding next question after retries:', generateErr.message);
        // If AI generation fails after retries, add a placeholder question
         interview.questions.push({
            questionText: 'Could not generate the next question.',
            answerText: null,
            feedback: 'Failed to generate feedback or next question due to an issue with the AI service. Please continue with the next question or try again later.',
            score: null,
            codeAnswer: null,
            programmingLanguage: null,
            codeFeedback: null,
            codeScore: null,
            videoAnswer: null,
            audioAnswer: null,
         });
         await interview.save();
      }
    }

    // Always return the updated interview object
    res.json(interview);

  } catch (err) {
    console.error('Error in /:interview_id/answer:', err);
    // Specific error handling for AI overload during answer submission
    if (err.message.includes('AI model remains overloaded') || (err.status === 503)) {
       res.status(503).json({ msg: 'The AI service is currently busy. Please wait a moment and try submitting your answer again.' });
    } else {
      // Ensure a JSON response even for unhandled errors
      res.status(500).json({ msg: 'Server error', details: err.message });
    }
  }
});

// Error handling middleware for this route
router.use((err, req, res, next) => {
  console.error('Unhandled error in /api/interviews/:interview_id/answer route:', err);
  res.status(500).json({ msg: 'An unexpected server error occurred', details: err.message });
});

// @route GET api/interviews/:interview_id
// @desc Get interview details
// @access Private (Requires authentication)
router.get(
  '/:interview_id',
  auth, // Apply auth middleware here
  async (req, res) => {
    try {
      const interview = await Interview.findById(req.params.interview_id);

      if (!interview) {
        return res.status(404).json({ msg: 'Interview not found' });
      }

      // TODO: Add logic to ensure the user requesting the interview is the owner

      res.json(interview);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Server Error', details: err.message });
    }
  }
);

// @route DELETE api/interviews/:interview_id
// @desc Delete an interview
// @access Private
router.delete('/:interview_id', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.interview_id);
    
    if (!interview) {
      return res.status(404).json({ msg: 'Interview not found' });
    }

    // Check if user owns the interview
    if (interview.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Remove interview from user's interviews array
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { interviews: interview._id } }
    );

    // Delete the interview
    await interview.deleteOne();

    res.json({ msg: 'Interview removed' });
  } catch (err) {
    console.error('Error deleting interview:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
