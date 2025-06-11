const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const auth = require('../../middleware/auth');

// @route POST api/users
// @desc Register user
// @access Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      user = new User({
        name,
        email,
        password,
      });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route PUT api/users/profile
// @desc Update user profile (name, profile picture)
// @access Private
router.put(
  '/profile',
  auth,
  [
    // Optional validation for name and profilePicture if provided
    check('name', 'Name is required').optional().not().isEmpty().trim(),
    // Basic check for profilePicture URL format (can be improved)
    check('profilePicture', 'Please enter a valid URL for profile picture').optional().isURL()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, profilePicture } = req.body;

    // Build update object
    const profileFields = {};
    if (name) profileFields.name = name;
    if (profilePicture) profileFields.profilePicture = profilePicture;

    try {
      let user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Update user fields
      user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: profileFields },
        { new: true, runValidators: true } // Return updated document and run schema validators
      ).select('-password'); // Don't return password

      res.json(user);
    } catch (err) {
      console.error(err.message);
      // Handle validation errors specifically if needed, otherwise send a generic 500
      if (err.kind === 'ObjectId') {
          return res.status(404).json({ msg: 'User not found' });
      }
       // Check for Mongoose validation errors
      if (err.name === 'ValidationError') {
          return res.status(400).json({ errors: Object.values(err.errors).map((e) => ({ msg: e.message })) });
      }
      res.status(500).send('Server error');
    }
  }
);

module.exports = router; 