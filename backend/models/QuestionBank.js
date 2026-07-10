const mongoose = require('mongoose');

const QuestionBankSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard']
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: [
      'software-engineer',
      'frontend-developer',
      'backend-developer',
      'data-scientist',
      'product-manager',
      'devops-engineer'
    ]
  },
  isCodingProblem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuestionBank', QuestionBankSchema);
