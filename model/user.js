const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  number: String,
  age: Number,
  address: String,
  gender: { type: String, enum: ['male','female','other'], default: 'other' },
  role: { type: String, enum: ['customer','vendor'], required: true },
  serviceType: String,       // for vendors
  profilePhotoPath: String,
  aadhaarPath: String,
  status: { type: String, enum: ['available','busy'], default: 'available' } // vendor status
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
