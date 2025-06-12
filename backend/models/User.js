const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password is only required if not a Google user
    },
    minlength: [6, 'Password must be at least 6 characters long']
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  picture: {
    type: String
  },
  // avatar: {
  //   type: String,
  // },
  profilePicture: {
    type: String,
    required: false // Profile picture is optional
  },
  interviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview'
  }],
  date: {
    type: Date,
    default: Date.now
  }
});

// Add logging for user operations
UserSchema.pre('save', function(next) {
  console.log('Saving user:', this.email);
  next();
});

UserSchema.post('save', function(doc) {
  console.log('User saved successfully:', doc.email);
});

// UserSchema.post('findOne', function(doc) {
//   if (doc) {
//     console.log('User found:', doc.email);
//   } else {
//     console.log('User not found');
//   }
// });

module.exports = mongoose.model('User', UserSchema); 