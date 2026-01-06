const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../model/user');

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profilePhoto') cb(null, 'uploads/profile');
    else if (file.fieldname === 'aadhaar') cb(null, 'uploads/aadhaar');
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}-${file.fieldname}.${ext}`);
  }
});

const upload = multer({ storage });

// REGISTER
router.post(
  '/register',
  upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { fullName, email, password, number, age, address, role } = req.body;

      if (!fullName || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      if (!req.files?.aadhaar || !req.files?.profilePhoto) {
        return res.status(400).json({ message: 'Files missing' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name: fullName,
        email,
        password: hashedPassword,
        number,
        age,
        address,
        role,
        aadhaarPath: req.files.aadhaar[0].path,
        profilePhotoPath: req.files.profilePhoto[0].path
      });

      res.status(201).json({ message: 'Registered successfully' });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ✅ RETURN FULL OBJECT (THIS FIXES YOUR ISSUE)
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
