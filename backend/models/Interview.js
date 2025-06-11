const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  answerText: {
    type: String,
    default: null
  },
  feedback: {
    type: String,
    default: null
  },
  score: {
    type: Number,
    default: null
  },
  codeAnswer: {
    type: String,
    default: null
  },
  programmingLanguage: {
    type: String,
    default: null
  },
  codeFeedback: {
    type: String,
    default: null
  },
  codeScore: {
    type: Number,
    default: null
  },
  videoAnswer: {
    type: String,
    default: null
  },
  audioAnswer: {
    type: String,
    default: null
  }
});

const InterviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: props => `${props.value} is not a valid ObjectId!`
    }
  },
  role: {
    type: String,
    required: true,
    enum: ['software-engineer', 'frontend-developer', 'backend-developer', 'data-scientist', 'product-manager', 'devops-engineer']
  },
  programmingLanguage: {
    type: String,
    required: function() {
      return ['software-engineer', 'frontend-developer', 'backend-developer', 'data-scientist', 'devops-engineer'].includes(this.role);
    }
  },
  questions: [QuestionSchema],
  date: {
    type: Date,
    default: Date.now
    },
  overallFeedback: {
    type: String,
    default: null
  },
  overallScore: {
    type: Number,
    default: null
  }
});

// Add pre-save middleware to validate user reference
InterviewSchema.pre('save', function(next) {
  if (!mongoose.Types.ObjectId.isValid(this.user)) {
    next(new Error('Invalid user reference'));
  }
  next();
});

module.exports = mongoose.model('Interview', InterviewSchema);

