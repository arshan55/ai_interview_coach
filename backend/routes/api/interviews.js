console.log("Loaded interviews.js route file");

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth'); // Assuming you'll have auth middleware
const Interview = require('../../models/Interview');
const User = require('../../models/User'); // Add User model import
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini — override with GOOGLE_AI_MODEL in .env (e.g. gemini-2.5-flash, gemini-1.5-flash)
const GEMINI_MODEL = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash';

const getGeminiModel = () => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY).getGenerativeModel({
    model: GEMINI_MODEL,
  });
};

console.log(`Interviews route using Gemini model: ${GEMINI_MODEL}`);

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
    prompt += `Start the interview by asking the first question for the selected role. The interview should consist of exactly 5 questions in total. 
    For the first question, choose one of these approaches based on the role:
    - For technical roles (software-engineer, frontend-developer, backend-developer, data-scientist, devops-engineer): 
      * Choose ONE of these categories randomly:
        - Data Structures & Algorithms:
          * Array/List manipulation (e.g., finding duplicates, merging sorted arrays)
          * Tree/Binary Search Tree operations
          * Graph algorithms (e.g., BFS, DFS, shortest path)
          * Dynamic programming problems
          * Sorting and searching algorithms
        - System Design:
          * API design and RESTful principles
          * Database schema design
          * Caching strategies
          * Microservices architecture
          * Scalability considerations
        - Problem Solving:
          * Debugging scenarios
          * Performance optimization
          * Memory management
          * Concurrency issues
          * Error handling
        - Language-specific Features:
          * Async/await patterns
          * Design patterns
          * Memory management
          * Type systems
          * Testing strategies
      * If it's a coding problem, start its text with [CODING_PROBLEM]
      * Make sure to vary the difficulty and topic each time
      * Avoid common beginner questions like string reversal or palindrome checks
    
    - For product-manager:
      * Choose ONE of these categories randomly:
        - Product Strategy:
          * Market analysis and competitive positioning
          * Feature prioritization frameworks
          * Product roadmap planning
          * Go-to-market strategies
          * Product lifecycle management
        - User Experience:
          * User research methodologies
          * Usability testing
          * User journey mapping
          * A/B testing strategies
          * User feedback analysis
        - Technical Product:
          * API design and documentation
          * Technical requirements gathering
          * System integration planning
          * Technical debt management
          * Performance metrics
        - Business Impact:
          * Key metrics and KPIs
          * ROI analysis
          * Cost-benefit analysis
          * Market sizing
          * Revenue models
      * Make sure to vary the scenario and context each time
      * never ask coding questions for product manager role
    
    Make sure the first question is relevant to the role and demonstrates the candidate's expertise.
    Use wide variety of first questions to keep interviews fresh every time.
    Respond using the exact format: Feedback: [Initial feedback or greeting]\nScore: [N/A]\nNext Question: [Your first question here]`;
  }

  return prompt;
};

const isQuotaOrRateLimitError = (error) =>
  error?.status === 429 ||
  error?.status === 503 ||
  /429|quota|rate.?limit|too many requests/i.test(String(error?.message || ''));

const getRetryDelayMs = (error, baseDelay) => {
  const match = String(error?.message || '').match(/retry in (\d+(?:\.\d+)?)s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500;
  return baseDelay;
};

// Helper function for retrying AI calls (503 overload + 429 quota)
const retryGenerateContent = async (prompt, retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await getGeminiModel().generateContent(prompt);
      return result;
    } catch (error) {
      const retryable = isQuotaOrRateLimitError(error);
      if (retryable && i < retries - 1) {
        const waitMs = getRetryDelayMs(error, delay);
        console.warn(
          `Gemini ${error?.status || 'rate limit'} on ${GEMINI_MODEL}. Retrying in ${waitMs}ms... (${i + 1}/${retries})`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error(`AI model remains unavailable after ${retries} retries.`);
};

const getDevFallbackQuestionTexts = (role) => {
  const roleLabel = role.replace(/-/g, ' ');
  const common = [
    `Tell me about yourself and why you are interested in this ${roleLabel} role.`,
    `Describe a challenging project you worked on and how you handled obstacles.`,
    `How do you stay current with trends and tools in ${roleLabel}?`,
    `Tell me about a time you disagreed with a teammate. How did you resolve it?`,
    `What questions do you have for us about this role and team?`,
  ];
  const technical = [
    `Explain the difference between REST and GraphQL. When would you choose each?`,
    `[CODING_PROBLEM] Write a function to detect if a string has balanced brackets ( ), [ ], { }. Explain your approach.`,
    `How would you design a rate limiter for a public API?`,
    `Describe how you would debug a slow database query in production.`,
    `What trade-offs do you consider when choosing SQL vs NoSQL?`,
  ];
  const techRoles = new Set([
    'software-engineer',
    'frontend-developer',
    'backend-developer',
    'data-scientist',
    'devops-engineer',
  ]);
  return techRoles.has(role) ? technical : common;
};

const createDevFallbackInterview = async (userId, role, programmingLanguage) => {
  const questionTexts = getDevFallbackQuestionTexts(role);
  const questions = questionTexts.map((questionText, index) => ({
    questionText,
    answerText: null,
    feedback:
      index === 0
        ? 'Practice mode: Gemini quota is unavailable, so these are built-in questions. Set GOOGLE_AI_MODEL or enable billing on your API key for live AI.'
        : null,
    score: null,
    codeAnswer: null,
    programmingLanguage: null,
    codeFeedback: null,
    codeScore: null,
    audioAnswer: null,
  }));

  const interview = new Interview({
    user: userId,
    role,
    programmingLanguage: programmingLanguage || undefined,
    questions,
    date: new Date(),
  });
  await interview.save();
  await User.findByIdAndUpdate(userId, { $push: { interviews: interview._id } }, { new: true });
  return interview;
};

const VIDEO_ANSWER_PLACEHOLDER =
  '[Video answer submitted — recording not stored]';

/** Remove legacy video blobs from API payloads and DB-shaped objects. */
const sanitizeInterviewForResponse = (interview) => {
  const doc = interview.toObject ? interview.toObject() : { ...interview };
  if (Array.isArray(doc.questions)) {
    doc.questions = doc.questions.map((q) => {
      const question = { ...q };
      if (question.videoAnswer) {
        if (!question.answerText) {
          question.answerText = VIDEO_ANSWER_PLACEHOLDER;
        }
        delete question.videoAnswer;
      }
      return question;
    });
  }
  return doc;
};

const formatFeedbackText = (raw) => {
  if (!raw || typeof raw !== 'string') return raw;
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^\s*#+\s+/gm, '')
    .replace(/^\s*[\*\-]\s+/gm, '• ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const parseFeedbackAndScore = (text) => {
  const scoreMatch = text.match(/Score:\s*(\d+)/i);
  const feedbackMatch = text.match(
    /Feedback:\s*([\s\S]*?)(?=\n\s*Score:|\n\s*Areas for Improvement:|$)/i
  );
  let score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
  if (score !== null) score = Math.min(10, Math.max(1, score));
  const feedback = formatFeedbackText(
    feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided'
  );
  return { feedback, score };
};

const buildSpokenAnswerPrompt = (questionText) =>
  `You are an expert interviewer. Listen to the candidate's spoken answer in the attached audio.

Interview question: ${questionText}

Rules:
- If they only read the question aloud (no real answer), give Score 1 or 2 and state that in Feedback in one clear sentence.
- Otherwise evaluate their actual answer: relevance, technical accuracy, and communication.
- Feedback must be PLAIN TEXT only: no markdown, no asterisks, no bullet symbols.
- Keep Feedback under 100 words (at most 2 short paragraphs).

Reply EXACTLY in this format:
Feedback: <your feedback>
Score: <integer 1-10>
Areas for Improvement: <one short line>`;

const isQuestionAnswered = (q) =>
  !!(q.answerText || q.codeAnswer);

const evaluateTextAnswer = async (question, answerText) => {
  question.answerText = answerText;
  question.audioAnswer = null;

  const prompt = `You are an expert interviewer. Please evaluate this answer and provide feedback and a score out of 10. Focus on clarity, technical accuracy, and communication skills.\n\nQuestion: ${question.questionText}\nAnswer: ${answerText}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n\nFormat your response EXACTLY as follows:\nFeedback: [your feedback]\nScore: [score out of 10]\nAreas for Improvement: [specific areas to improve]`;

  const result = await retryGenerateContent(prompt);
  const text = result.response.text();
  console.log('Raw AI response for feedback:', text);

  const parsed = parseFeedbackAndScore(text);
  if (parsed.score !== null) {
    question.feedback = parsed.feedback;
    question.score = parsed.score;
  } else {
    console.error('Failed to parse AI response:', text);
    question.feedback = 'Failed to generate feedback. Please try again.';
    question.score = null;
  }
};

const evaluateSpokenMediaAnswer = async (question, mediaBase64, mimeType) => {
  question.answerText = VIDEO_ANSWER_PLACEHOLDER;
  question.audioAnswer = null;

  const cleanBase64 = mediaBase64.includes(';base64,')
    ? mediaBase64.split(';base64,').pop()
    : mediaBase64;

  const multimodalPrompt = [
    {
      inlineData: {
        data: cleanBase64,
        mimeType,
      },
    },
    buildSpokenAnswerPrompt(question.questionText),
  ];

  const result = await retryGenerateContent(multimodalPrompt, 3, 2000);
  const text = result.response.text();
  const parsed = parseFeedbackAndScore(text);
  question.feedback = parsed.feedback;
  question.score = parsed.score;
};

const evaluateVideoAnswer = async (question, videoAnswer) => {
  await evaluateSpokenMediaAnswer(question, videoAnswer, 'video/webm');
};

const evaluateAudioAnswer = async (question, audioAnswer) => {
  let mimeType = 'audio/webm';
  const dataUrlMatch = String(audioAnswer).match(/^data:([^;]+);base64,/);
  if (dataUrlMatch) mimeType = dataUrlMatch[1];
  await evaluateSpokenMediaAnswer(question, audioAnswer, mimeType);
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

      res.json(sanitizeInterviewForResponse(interview));
    } catch (err) {
      console.error('Error starting interview with AI:', err.message);

      if (process.env.NODE_ENV !== 'production' && isQuotaOrRateLimitError(err)) {
        try {
          console.warn('Using built-in fallback interview (dev, Gemini quota exceeded).');
          const interview = await createDevFallbackInterview(
            req.user.id,
            role,
            programmingLanguage
          );
          return res.json(sanitizeInterviewForResponse(interview));
        } catch (fallbackErr) {
          console.error('Dev fallback interview failed:', fallbackErr.message);
        }
      }

      if (isQuotaOrRateLimitError(err)) {
        return res.status(429).json({
          error:
            'Gemini API quota exceeded for this model. Add billing at https://aistudio.google.com/apikey or set GOOGLE_AI_MODEL (e.g. gemini-2.5-flash) in backend/.env.',
          code: 'GEMINI_QUOTA_EXCEEDED',
          model: GEMINI_MODEL,
        });
      }
      if (err.message.includes('AI model remains unavailable') || err.status === 503) {
        return res.status(503).json({ error: 'AI service is currently busy. Please try again later.' });
      }
      return res.status(500).json({ error: 'Server Error', details: err.message });
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

    // Validate input and generate feedback based on question type
    if (isCodingQuestion) {
      if (!codeAnswer || !programmingLanguage) {
        return res.status(400).json({ msg: 'Code answer and programming language are required for coding questions' });
      }
      question.codeAnswer = codeAnswer;
      question.programmingLanguage = programmingLanguage;
    } else if (audioAnswer) {
      if (typeof audioAnswer !== 'string' || audioAnswer.length > 6 * 1024 * 1024) {
        return res.status(400).json({ msg: 'Recording is too large. Please record a shorter answer (max ~30 seconds).' });
      }
      await evaluateAudioAnswer(question, audioAnswer);
    } else if (videoAnswer) {
      if (typeof videoAnswer !== 'string' || videoAnswer.length > 14 * 1024 * 1024) {
        return res.status(400).json({ msg: 'Video answer is too large. Please record a shorter answer (under ~30 seconds).' });
      }
      await evaluateVideoAnswer(question, videoAnswer);
    } else if (answerText) {
      await evaluateTextAnswer(question, answerText);
    } else {
      return res.status(400).json({ msg: 'Answer text, video answer, or audio answer is required for non-coding questions' });
    }

     // Handle coding question feedback generation with retry
    if (isCodingQuestion && (question.codeAnswer || question.answerText)) { // Ensure answer exists before generating code feedback
       const prompt = `You are an expert programmer. Please evaluate this code answer and provide feedback and a score out of 10. Focus on code quality, efficiency, and best practices.\n\nQuestion: ${question.questionText}\nProgramming Language: ${programmingLanguage}\nCode Answer: ${codeAnswer}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n\nFormat your response EXACTLY as follows:\nFeedback: [your feedback]\nScore: [score out of 10]\nCode Feedback: [specific feedback about the code]\nCode Score: [score out of 10 for the code]`;

       const result = await retryGenerateContent(prompt); // Use retry helper
       const response = await result.response;
       const text = response.text();

       console.log('Raw AI response for code feedback:', text);

       // Parse the response to extract feedback and scores with more robust regex
       const feedbackMatch = text.match(/Feedback:\s*(.*?)(?=\nScore:|$)/s);
       const scoreMatch = text.match(/Score:\s*(\d+)/);
       const codeFeedbackMatch = text.match(/Code Feedback:\s*(.*?)(?=\nCode Score:|$)/s);
       const codeScoreMatch = text.match(/Code Score:\s*(\d+)/);

       if (feedbackMatch && scoreMatch && codeFeedbackMatch && codeScoreMatch) {
         question.feedback = feedbackMatch[1].trim();
         question.score = parseInt(scoreMatch[1]);
         question.codeFeedback = codeFeedbackMatch[1].trim();
         question.codeScore = parseInt(codeScoreMatch[1]);
       } else {
         console.error('Failed to parse AI response for code feedback:', text);
         question.feedback = 'Failed to generate feedback. Please try again.';
         question.score = null;
         question.codeFeedback = 'Failed to generate code feedback. Please try again.';
         question.codeScore = null;
       }
    }

    // If this is the last question and all questions are answered, calculate overall score
    if (questionIndex === interview.questions.length - 1) {
      const totalScore = interview.questions.reduce((sum, q) => {
        const score = q.questionText.startsWith('[CODING_PROBLEM]') ? q.codeScore : q.score;
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
            audioAnswer: null,
         });
         await interview.save();
      }
    }

    // Remove legacy video blobs from MongoDB (frees disk; not returned in API)
    const unsetPaths = {};
    interview.questions.forEach((q, i) => {
      if (q.videoAnswer) {
        unsetPaths[`questions.${i}.videoAnswer`] = '';
        if (!q.answerText) {
          q.answerText = VIDEO_ANSWER_PLACEHOLDER;
        }
      }
    });
    if (Object.keys(unsetPaths).length > 0) {
      await Interview.updateOne({ _id: interview._id }, { $unset: unsetPaths });
    }
    await interview.save();

    res.json(sanitizeInterviewForResponse(interview));

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

// @route GET api/interviews/user
// @desc Get all interviews for the authenticated user
// @access Private
router.get('/user', auth, async (req, res) => {
  console.log("GET /api/interviews/user called");
  try {
    // Log the request details for debugging
    console.log('GET /api/interviews/user: Entering route. User ID:', req.user.id); 
    
    // Validate user ID (this check should ideally be redundant if auth middleware works)
    if (!req.user || !req.user.id) {
      console.error('GET /api/interviews/user: Invalid user ID in request (should have been caught by auth middleware)'); 
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find interviews for the user
    console.log('GET /api/interviews/user: Attempting to find interviews for user:', req.user.id); // Log before DB call
    const interviews = await Interview.find({ user: req.user.id })
      .select('-questions') // Don't send the questions array to reduce payload size
      .sort({ date: -1 }); // Sort by date, newest first
    
    console.log(`GET /api/interviews/user: Found ${interviews.length} interviews for user ${req.user.id}`); // Log after successful DB call
    res.json(interviews);
  } catch (err) {
    console.error('Error fetching user interviews:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
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

      res.json(sanitizeInterviewForResponse(interview));
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
