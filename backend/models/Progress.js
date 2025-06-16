const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  progress: { type: Number, required: true, min: 0, max: 100 }, // Progress percentage
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Progress', progressSchema);