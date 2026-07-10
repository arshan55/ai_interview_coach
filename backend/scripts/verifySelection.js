/**
 * Verification script for Question Bank algorithmic selection.
 * Run from project root: node backend/scripts/verifySelection.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const QuestionBank = require('../models/QuestionBank');
const Interview = require('../models/Interview');

const getUserPastQuestionTexts = async (userId) => {
  const userInterviews = await Interview.find({ user: userId }).select('questions.questionText');
  const pastQuestionTexts = [];
  userInterviews.forEach(interview => {
    if (interview.questions) {
      interview.questions.forEach(q => {
        if (q.questionText) pastQuestionTexts.push(q.questionText);
      });
    }
  });
  return [...new Set(pastQuestionTexts)];
};

const selectNextQuestion = async (role, targetDifficulty, excludedQuestionTexts, excludedTopics) => {
  let query = {
    role,
    difficulty: targetDifficulty,
    questionText: { $nin: excludedQuestionTexts }
  };
  if (excludedTopics && excludedTopics.length > 0) {
    query.topic = { $nin: excludedTopics };
  }

  let q = await QuestionBank.findOne(query);

  // Fallback 1: loosen topic constraint
  if (!q && excludedTopics && excludedTopics.length > 0) {
    delete query.topic;
    q = await QuestionBank.findOne(query);
    if (q) console.log(`  [fallback 1] Topic constraint loosened for difficulty=${targetDifficulty}`);
  }

  // Fallback 2: loosen difficulty constraint
  if (!q) {
    q = await QuestionBank.findOne({ role, questionText: { $nin: excludedQuestionTexts } });
    if (q) console.log(`  [fallback 2] Difficulty constraint loosened — picked: ${q.difficulty}`);
  }

  return q;
};

const run = async () => {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) { console.error('MONGODB_URI is not set'); process.exit(1); }

  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.\n');

  const DIFFICULTY_MAP = ['easy', 'medium', 'medium', 'hard', 'hard'];
  const ROLES = ['backend-developer', 'frontend-developer', 'data-scientist', 'product-manager', 'devops-engineer'];
  let allPassed = true;

  for (const role of ROLES) {
    console.log(`\n=== Simulating interview for role: ${role} ===`);
    const mockUserId = new mongoose.Types.ObjectId();
    const interviewQuestions = [];

    for (let i = 0; i < 5; i++) {
      const targetDifficulty = DIFFICULTY_MAP[i];
      const currentTexts = interviewQuestions.map(q => q.questionText);
      const userPast = await getUserPastQuestionTexts(mockUserId);
      const excluded = [...new Set([...currentTexts, ...userPast])];
      const excludedTopics = interviewQuestions.map(q => q.topic).filter(Boolean);

      const picked = await selectNextQuestion(role, targetDifficulty, excluded, excludedTopics);

      if (!picked) {
        console.log(`  Q${i + 1} [FAIL]: No question found (target: ${targetDifficulty}, excluded: ${excluded.length})`);
        allPassed = false;
      } else {
        console.log(`  Q${i + 1} [PASS]: "${picked.title}" | diff=${picked.difficulty} | topic=${picked.topic}`);
        interviewQuestions.push({ questionText: picked.questionText, topic: picked.topic });
      }
    }

    const uniqueTexts = new Set(interviewQuestions.map(q => q.questionText)).size;
    const noRepeats = uniqueTexts === interviewQuestions.length;
    console.log(`  No-repeat check: ${noRepeats ? 'PASS' : 'FAIL'} (${uniqueTexts} unique / ${interviewQuestions.length} total)`);
    if (!noRepeats) allPassed = false;
  }

  console.log(`\n${allPassed ? '✅ All tests PASSED.' : '❌ Some tests FAILED.'}`);
  mongoose.connection.close();
  process.exit(allPassed ? 0 : 1);
};

run().catch(err => { console.error(err); process.exit(1); });
