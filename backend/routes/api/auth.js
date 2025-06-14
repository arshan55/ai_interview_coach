const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');

// Check if JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined. Please set it in your environment variables.');
  // In a real application, you might want to gracefully exit or prevent routes from loading.
  // For now, we'll log and let the application continue, but expect errors related to JWT.
}

// @route   GET api/auth
// @desc    Get user by token
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('GET /api/auth: Fetching user data for ID:', req.user.id);
    const user = await User.findById(req.user.id)
      .select('-password -interviews');
    
    if (!user) {
      console.log('GET /api/auth: User not found for ID:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('GET /api/auth: User found:', user.email);
    res.json(user);
  } catch (err) {
    console.error('GET /api/auth: Error:', err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('POST /api/auth: Login attempt for email:', email);

    // Check if user exists
      let user = await User.findOne({ email });
      if (!user) {
      console.log('POST /api/auth: Login failed: User not found');
      return res.status(400).json({ error: 'Invalid credentials' });
      }

    // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
      console.log('POST /api/auth: Login failed: Invalid password');
      return res.status(400).json({ error: 'Invalid credentials' });
      }

    // Create JWT token
      const payload = {
        user: {
        id: user.id
      }
      };

    if (!process.env.JWT_SECRET) {
      console.error('POST /api/auth: JWT_SECRET not set, cannot sign token.');
      return res.status(500).json({ error: 'Server configuration error: JWT secret missing.' });
    }

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
      { expiresIn: '800d' },
        (err, token) => {
        if (err) {
          console.error('POST /api/auth: JWT signing error:', err.message);
          return res.status(500).json({ error: 'Token generation failed', details: err.message });
        }
        console.log('POST /api/auth: Login successful, token generated for user:', email);
          res.json({ token });
        }
      );
    } catch (err) {
    console.error('POST /api/auth: Error:', err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('POST /api/auth/register: Registration attempt for email:', email);

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('POST /api/auth/register: Registration failed: User already exists');
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
    console.log('POST /api/auth/register: User registered successfully:', email);

    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    if (!process.env.JWT_SECRET) {
      console.error('POST /api/auth/register: JWT_SECRET not set, cannot sign token.');
      return res.status(500).json({ error: 'Server configuration error: JWT secret missing.' });
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '800d' },
      (err, token) => {
        if (err) {
          console.error('POST /api/auth/register: JWT signing error:', err.message);
          return res.status(500).json({ error: 'Token generation failed', details: err.message });
        }
        console.log('POST /api/auth/register: Token generated for new user:', email);
        res.json({ token });
  }
);
  } catch (err) {
    console.error('POST /api/auth/register: Error:', err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// @route   POST api/auth/google/user
// @desc    Create or update user from Google OAuth
// @access  Public
router.post('/google/user', async (req, res) => {
  try {
    const { email, name, picture, googleId } = req.body;
    console.log('POST /api/auth/google/user: Google OAuth login attempt for email:', email);

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update existing user's Google info
      user.googleId = googleId;
      user.picture = picture;
      await user.save();
      console.log('POST /api/auth/google/user: Updated existing user with Google info:', email);
    } else {
      // Create new user
      user = new User({
        name,
        email,
        googleId,
        picture,
        password: await bcrypt.hash(Math.random().toString(36), 10) // Random password for Google users
      });
      await user.save();
      console.log('POST /api/auth/google/user: Created new user from Google:', email);
    }

    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    if (!process.env.JWT_SECRET) {
      console.error('POST /api/auth/google/user: JWT_SECRET not set, cannot sign token.');
      return res.status(500).json({ error: 'Server configuration error: JWT secret missing.' });
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '800d' },
      (err, token) => {
        if (err) {
          console.error('POST /api/auth/google/user: JWT signing error:', err.message);
          return res.status(500).json({ error: 'Token generation failed', details: err.message });
        }
        console.log('POST /api/auth/google/user: Token generated for Google user:', email);
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('POST /api/auth/google/user: Error:', err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

module.exports = router; 