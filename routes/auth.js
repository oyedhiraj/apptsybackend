const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../model/user');

const router = express.Router();
/* MULTER */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profilePhoto') cb(null, 'uploads/profile');
    else cb(null, 'uploads/aadhaar');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

/* REGISTER */
router.post(
  '/register',
  upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        fullName,
        email,
        password,
        number,
        age,
        address,
        gender,
        role,
        serviceType
      } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        name: fullName,
        email,
        password: hashedPassword,
        number,
        age,
        address,
        gender,
        role,
        serviceType: role === 'vendor' ? serviceType : undefined,
        aadhaarPath: req.files.aadhaar[0].path,
        profilePhotoPath: req.files.profilePhoto[0].path
      });

      await user.save();
      res.status(201).json({ message: 'Registered successfully' });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* LOGIN */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    token,
    user: {
      id: user._id,
      role: user.role
    }
  });
});

/* GET VENDORS */
router.get('/vendors', async (req, res) => {
  const vendors = await User.find({ role: 'vendor' });
  res.json(vendors);
});

module.exports = router;
