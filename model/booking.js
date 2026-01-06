const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  name: String,
  age: Number,
  location: String,
  gender: String,
  service: String,
  status: {
    type: String,
    default: "Pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
