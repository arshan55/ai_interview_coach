console.log("Loaded interviews.js route file");

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth'); // Assuming you'll have auth middleware
const Interview = require('../../models/Interview');
const User = require('../../models/User'); // Add User model import
const {
  questionIdentityKeys,
  questionTopics,
  selectBestQuestion,
} = require('../../services/questionRetrieval');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const embeddingsService = require('../../services/embeddingsService');
const CodingProblemDetails = require('../../models/CodingProblemDetails');
const QuestionBank = require('../../models/QuestionBank');

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

// Helper function to check if the error is due to quota/rate limits

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

const getUserPastQuestionHistory = async (userId) => {
  try {
    const userInterviews = await Interview.find({ user: userId }).select('questions.questionId questions.questionText questions.topic questions.title questions.link');
    const pastQuestionTexts = [];
    const pastTopics = [];
    const seenKeys = [];
    userInterviews.forEach(interview => {
      if (interview.questions) {
        interview.questions.forEach(q => {
          if (q.questionText) {
            pastQuestionTexts.push(q.questionText);
          }
            if (q.questionId) {
              seenKeys.push(String(q.questionId).toLowerCase().trim());
            }
          if (q.topic) {
            pastTopics.push(q.topic);
          }
          seenKeys.push(...questionIdentityKeys(q));
        });
      }
    });
    return {
      questionTexts: [...new Set(pastQuestionTexts)],
      topics: [...new Set(pastTopics)],
      seenKeys: [...new Set(seenKeys)],
    };
  } catch (err) {
    console.error('Error in getUserPastQuestionHistory:', err.message);
    return {
      questionTexts: [],
      topics: [],
      seenKeys: [],
    };
  }
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

// Build retrieved context block for RAG feedback. Caller (interviews.js) uses this to decide CodingProblemDetails-first branching and to avoid unnecessary embedding calls.
async function buildRetrievedBlock(question) {
  if (process.env.RAG_FEEDBACK_ENABLED !== 'true') return '';
  try {
    // Robust detection: prefer explicit questionId; if missing, try normalizedTitle lookup to find a matching questionId
    let cp = null;
    if (question?.questionId) {
      cp = await CodingProblemDetails.findOne({ questionId: String(question.questionId) }).lean();
    }

    if (!cp && question?.normalizedTitle) {
      // Try to find a QuestionBank doc by normalizedTitle to get a stable questionId, then look up CodingProblemDetails
      const qb = await QuestionBank.findOne({ normalizedTitle: question.normalizedTitle }).select('questionId title').lean();
      if (qb && qb.questionId) {
        cp = await CodingProblemDetails.findOne({ questionId: qb.questionId }).lean();
      }
    }

    if (!cp && question?._id) {
      // As a last-ditch fallback, try matching by question._id (stringified) in case IDs were used inconsistently
      cp = await CodingProblemDetails.findOne({ questionId: String(question._id) }).lean();
    }

    if (cp && (cp.referenceSolution || (cp.rubric && cp.rubric.length))) {
      const refSol = cp.referenceSolution ? String(cp.referenceSolution).trim().slice(0, 1200) : 'N/A';
      const rubric = Array.isArray(cp.rubric) ? cp.rubric.slice(0, 5).join('; ') : '';
      const block = `Reference (Coding Problem):\nTitle: ${question.title || question.normalizedTitle || (cp.title || question.questionId)}\nReference Solution: ${refSol}\nRubric: ${rubric}\n\n---\n`;
      console.log('RAG: using CodingProblemDetails for', cp.questionId || question.questionId || question.normalizedTitle);
      return block;
    }

    // Fallback: semantic nearest neighbors
    const topK = parseInt(process.env.RAG_FEEDBACK_TOP_K || '3', 10);
    const emb = await embeddingsService.generateEmbedding(question.questionText);
    const neighbors = await embeddingsService.findNearest(emb, topK);
    if (!neighbors || neighbors.length === 0) return '';

    let block = 'Reference materials (similar past questions):\n';
    neighbors.forEach((n, i) => {
      block += `${i + 1}) Title: ${n.title || n.normalizedTitle || 'N/A'}\nTopic: ${n.topic || 'N/A'}\nDifficulty: ${n.difficulty || 'N/A'}\nSimilarity: ${typeof n.score === 'number' ? n.score.toFixed(3) : 'N/A'}\n\n`;
    });
    console.log('RAG: retrieved neighbors for', question.questionId || question.normalizedTitle, neighbors.map((n) => ({ id: n.id, score: n.score })));
    return block;
  } catch (err) {
    console.error('RAG retrieval error:', err.message || err);
    return '';
  }
}

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

  // Build retrieved context block (CodingProblemDetails-first, then semantic fallback)
  let retrievedBlock = '';
  if (process.env.RAG_FEEDBACK_ENABLED === 'true') {
    try {
      retrievedBlock = await buildRetrievedBlock(question);
    } catch (err) {
      console.error('RAG buildRetrievedBlock error:', err.message || err);
      retrievedBlock = '';
    }
  }

  const basePrompt = `You are an expert interviewer. Please evaluate this answer and provide feedback and a score out of 10. Focus on clarity, technical accuracy, and communication skills.\n\nQuestion: ${question.questionText}\nAnswer: ${answerText}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n\nFormat your response EXACTLY as follows:\nFeedback: [your feedback]\nScore: [score out of 10]\nAreas for Improvement: [specific areas to improve]`;

  const prompt = (retrievedBlock && retrievedBlock.length > 0) ? (`${retrievedBlock}\n\n${basePrompt}`) : basePrompt;

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

  // Build retrieved context block (CodingProblemDetails-first, then semantic fallback)
  let retrievedBlock = '';
  if (process.env.RAG_FEEDBACK_ENABLED === 'true') {
    try {
      retrievedBlock = await buildRetrievedBlock(question);
    } catch (err) {
      console.error('RAG buildRetrievedBlock error:', err.message || err);
      retrievedBlock = '';
    }
  }

  const multimodalPrompt = [
    {
      inlineData: {
        data: cleanBase64,
        mimeType,
      },
    },
    // optional retrieved context
    ...(retrievedBlock && retrievedBlock.length > 0 ? [retrievedBlock] : []),
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

      // Retrieve the user's past question texts to avoid repeat questions
      const userPastHistory = await getUserPastQuestionHistory(req.user.id);

      // Select first question from QuestionBank (difficulty 'easy')
      const firstQuestionObj = await selectBestQuestion({
        role,
        targetDifficulty: 'easy',
        seenKeys: new Set([...userPastHistory.seenKeys]),
        preferredTopics: userPastHistory.topics,
        recentTopics: [],
      });

      if (!firstQuestionObj) {
        return res.status(404).json({ error: 'No questions found in the Question Bank for this role.' });
      }

      const firstQuestionText = firstQuestionObj.questionText;
      const firstQuestionId = firstQuestionObj.questionId || null;
      const topic = firstQuestionObj.topic;
      const initialFeedback = 'Welcome to your interview practice! Let\'s begin.';

      const newInterview = new Interview({
        user: req.user.id,
        role,
        programmingLanguage: programmingLanguage,
        questions: [{
          questionId: firstQuestionId,
          questionText: firstQuestionText,
          answerText: null,
          feedback: initialFeedback,
          score: null,
          topic: topic
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

    const { questionIndex, answerText, codeAnswer, programmingLanguage, videoAnswer, audioAnswer, wpm, fillerWordsCount } = req.body;

    if (questionIndex === undefined || questionIndex >= interview.questions.length) {
         return res.status(400).json({ msg: 'Invalid question index' });
      }

    const question = interview.questions[questionIndex];

    // Save speech metrics if provided
    if (typeof wpm === 'number') question.wpm = wpm;
    if (typeof fillerWordsCount === 'number') question.fillerWordsCount = fillerWordsCount;

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
       let retrievedBlockForCode = '';
       if (process.env.RAG_FEEDBACK_ENABLED === 'true') {
         try {
           retrievedBlockForCode = await buildRetrievedBlock(question);
         } catch (err) {
           console.error('RAG buildRetrievedBlock error for code feedback:', err.message || err);
           retrievedBlockForCode = '';
         }
       }

       const codeBasePrompt = `You are an expert programmer. Please evaluate this code answer and provide feedback and a score out of 10. Focus on code quality, efficiency, and best practices.\n\nQuestion: ${question.questionText}\nProgramming Language: ${programmingLanguage}\nCode Answer: ${codeAnswer}\n\nPlease provide:\n1. Detailed feedback\n2. A score out of 10\n3. Areas for improvement\n\nFormat your response EXACTLY as follows:\nFeedback: [your feedback]\nScore: [score out of 10]\nCode Feedback: [specific feedback about the code]\nCode Score: [score out of 10 for the code]`;

       const prompt = (retrievedBlockForCode && retrievedBlockForCode.length > 0) ? `${retrievedBlockForCode}\n\n${codeBasePrompt}` : codeBasePrompt;

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

    ${interview.questions.map((q, i) => {
      const isCoding = q.codeAnswer != null || q.codeScore != null || q.questionText.startsWith('[CODING_PROBLEM]');
      const score = isCoding ? q.codeScore : q.score;
      const feedback = isCoding ? q.codeFeedback : q.feedback;

      return `Question ${i + 1}: ${q.questionText}
    Score: ${score}/10
    Feedback: ${feedback}`;
    }).join('\n')}

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

    // If this is not the last question and less than 5 questions, select and add the next question
    if (interview.questions.length < 5) { // Ensure total questions is less than 5
      try {
        const nextIndex = interview.questions.length;
        let targetDifficulty = 'medium';
        if (nextIndex >= 3) {
          targetDifficulty = 'hard';
        }

        // Gather excluded questions (current interview + past interviews) to prevent duplicates
          const currentQuestionTexts = interview.questions.map(q => q.questionText);
          const currentTopics = interview.questions.map(q => q.topic).filter(Boolean);
          const pastQuestionHistory = await getUserPastQuestionHistory(req.user.id);

          const nextQuestionObj = await selectBestQuestion({
            role: interview.role,
            targetDifficulty,
            company: interview.company,
            seenKeys: new Set([
              ...pastQuestionHistory.seenKeys,
              ...currentQuestionTexts.map((text) => text.toLowerCase().trim()),
              ...currentTopics.map((topic) => topic.toLowerCase().trim()),
            ]),
            preferredTopics: currentTopics.length > 0 ? currentTopics : pastQuestionHistory.topics,
            recentTopics: currentTopics,
          });

        if (!nextQuestionObj) {
          throw new Error('No available questions found in the Question Bank matching the criteria.');
        }

        // Create and add the new question to the interview
        const newQuestion = {
          questionId: nextQuestionObj.questionId || null,
          questionText: nextQuestionObj.questionText,
          answerText: null,
          feedback: null,
          score: null,
          codeAnswer: null,
          programmingLanguage: null,
          codeFeedback: null,
          codeScore: null,
          audioAnswer: null,
          topic: nextQuestionObj.topic
        };
        interview.questions.push(newQuestion);

        // Save the interview with the new question added
        await interview.save();

      } catch (generateErr) {
        console.error('Error selecting next question from QuestionBank:', generateErr.message);
        // If question selection fails, add a placeholder question
        interview.questions.push({
          questionId: null,
          questionText: 'Could not generate the next question.',
          answerText: null,
          feedback: 'Failed to select next question from Question Bank due to database unavailability. Please try again later.',
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
