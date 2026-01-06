const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  number: String,
  age: String,
  address: String,
  role: String,
  aadhaarPath: String,
  profilePhotoPath: String
});

module.exports = mongoose.model('User', userSchema);
