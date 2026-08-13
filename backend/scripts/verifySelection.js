/**
 * Verification script for Question Bank algorithmic selection.
 * Run from project root: node backend/scripts/verifySelection.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Interview = require('../models/Interview');
const { selectBestQuestion, questionIdentityKeys } = require('../services/questionRetrieval');

const getUserPastQuestionHistory = async (userId) => {
  const userInterviews = await Interview.find({ user: userId }).select('questions.questionId questions.questionText questions.topic questions.title questions.link');
  const pastQuestionTexts = [];
  const pastTopics = [];
  const seenKeys = [];
  userInterviews.forEach(interview => {
    if (interview.questions) {
      interview.questions.forEach(q => {
        if (q.questionId) seenKeys.push(String(q.questionId).toLowerCase().trim());
        if (q.questionText) pastQuestionTexts.push(q.questionText);
        if (q.topic) pastTopics.push(q.topic);
        seenKeys.push(...questionIdentityKeys(q));
      });
    }
  });
  return {
    questionTexts: [...new Set(pastQuestionTexts)],
    topics: [...new Set(pastTopics)],
    seenKeys: [...new Set(seenKeys)],
  };
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
      const pastHistory = await getUserPastQuestionHistory(mockUserId);
      const currentTopics = interviewQuestions.map(q => q.topic).filter(Boolean);

      const picked = await selectBestQuestion({
        role,
        targetDifficulty,
        seenKeys: new Set([...pastHistory.seenKeys, ...currentTexts.map((text) => text.toLowerCase().trim())]),
        preferredTopics: currentTopics.length > 0 ? currentTopics : pastHistory.topics,
        recentTopics: currentTopics,
      });

      if (!picked) {
        console.log(`  Q${i + 1} [FAIL]: No question found (target: ${targetDifficulty})`);
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
