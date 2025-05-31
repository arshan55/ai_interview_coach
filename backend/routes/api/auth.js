const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');

// @route   GET api/auth
// @desc    Get user by token
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching user data for ID:', req.user.id);
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate({
        path: 'interviews',
        select: 'questions role programmingLanguage date',
        options: { sort: { date: -1 } } // Sort interviews by date, newest first
      });
    
    if (!user) {
      console.log('User not found for ID:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('User found:', user.email);
    res.json(user);
  } catch (err) {
    console.error('Error in GET /api/auth:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Check if user exists
      let user = await User.findOne({ email });
      if (!user) {
      console.log('Login failed: User not found');
      return res.status(400).json({ error: 'Invalid credentials' });
      }

    // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
      console.log('Login failed: Invalid password');
      return res.status(400).json({ error: 'Invalid credentials' });
      }

    // Create JWT token
      const payload = {
        user: {
        id: user.id
      }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
      { expiresIn: '5h' },
        (err, token) => {
          if (err) throw err;
        console.log('Login successful for user:', email);
          res.json({ token });
        }
      );
    } catch (err) {
    console.error('Error in POST /api/auth:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('Registration attempt for email:', email);

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('Registration failed: User already exists');
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user to database
    await user.save();
    console.log('User registered successfully:', email);

    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        console.log('Token generated for new user:', email);
        res.json({ token });
  }
);
  } catch (err) {
    console.error('Error in POST /api/auth/register:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router; 