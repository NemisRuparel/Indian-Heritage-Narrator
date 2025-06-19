const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; // Use port 3000 or whatever is available

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json


// const uri = "mongodb+srv://nemisruparel:jz3JP5rhmHev4zDs@cluster0.zgjr7rz.mongodb.net/";
const uri = "mongodb+srv://nemisruparel:jz3JP5rhmHev4zDs@cluster0.zgjr7rz.mongodb.net/devtalesDatabase";

mongoose.connect(uri)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));


// Story Schema and Model
const stories = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  imageUrl: { type: String },
  audioUrl: { type: String },
  videoUrl: { type: String },
}, { timestamps: true }); // `timestamps: true` adds createdAt and updatedAt fields automatically

const Story = mongoose.model('Story', stories);

// API Routes
app.get('/api/stories', async (req, res) => {
  try {
    const stories = await Story.find({});
    res.json(stories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// You might want a route to fetch a single story by ID for detail views
app.get('/api/stories/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    res.json(story);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});