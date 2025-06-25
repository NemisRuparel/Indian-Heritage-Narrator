const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const ImageKit = require('imagekit');
const multer = require('multer');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for file uploads

const PORT = process.env.PORT || 3000;

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB Atlas connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const storySchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String },
  imageUrl: { type: String },
  audioUrl: { type: String },
  videoUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    content: String,
    createdAt: { type: Date, default: Date.now },
  }],
});

const User = mongoose.model('User', userSchema);
const Story = mongoose.model('Story', storySchema);

// Middleware to sync Clerk user with MongoDB
const syncUser = async (req, res, next) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized: No valid authentication provided' });
  }

  const { userId } = req.auth;
  try {
    let user = await User.findOne({ clerkId: userId });
    if (!user) {
      user = new User({
        clerkId: userId,
        username: req.auth.user?.fullName || `User_${userId.slice(-4)}`,
        followers: [],
        following: [],
      });
      await user.save();
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Error in syncUser:', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
};

// Upload file to ImageKit
const uploadToImageKit = async (file, fileName, folder) => {
  try {
    const result = await imagekit.upload({
      file: file.buffer.toString('base64'),
      fileName,
      folder: `/DevTales/${folder}`,
    });
    return result.url;
  } catch (err) {
    throw new Error('Failed to upload to ImageKit: ' + err.message);
  }
};

// POST: Create a new story with optional file uploads
app.post('/api/stories', ClerkExpressRequireAuth(), syncUser, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]), async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const authorId = req.user._id;
    const author = req.user.username;

    let imageUrl, audioUrl, videoUrl;
    if (req.files.image) {
      imageUrl = await uploadToImageKit(req.files.image[0], `${title}_image`, 'images');
    }
    if (req.files.audio) {
      audioUrl = await uploadToImageKit(req.files.audio[0], `${title}_audio`, 'audio');
    }
    if (req.files.video) {
      videoUrl = await uploadToImageKit(req.files.video[0], `${title}_video`, 'videos');
    }

    const newStory = new Story({
      title,
      content,
      author,
      authorId,
      category,
      imageUrl,
      audioUrl,
      videoUrl,
      likes: [],
      bookmarks: [],
      comments: [],
    });
    await newStory.save();
    res.status(201).json(newStory);
  } catch (err) {
    console.error('Error creating story:', err);
    res.status(500).json({ error: 'Failed to save story: ' + err.message });
  }
});

// GET: Fetch all stories with populated user data
app.get('/api/stories', async (req, res) => {
  try {
    const stories = await Story.find()
      .populate('authorId', 'username')
      .populate('comments.userId', 'username')
      .sort({ createdAt: -1 });
    res.json(stories);
  } catch (err) {
    console.error('Error fetching stories:', err);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// POST: Like a story
app.post('/api/stories/:id/like', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (!story.likes.includes(req.user._id)) {
      story.likes.push(req.user._id);
      await story.save();
    }
    res.json(story);
  } catch (err) {
    console.error('Error liking story:', err);
    res.status(500).json({ error: 'Failed to like story' });
  }
});

// POST: Bookmark a story
app.post('/api/stories/:id/bookmark', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (!story.bookmarks.includes(req.user._id)) {
      story.bookmarks.push(req.user._id);
      await story.save();
    }
    res.json(story);
  } catch (err) {
    console.error('Error bookmarking story:', err);
    res.status(500).json({ error: 'Failed to bookmark story' });
  }
});

// POST: Comment on a story
app.post('/api/stories/:id/comment', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const { content } = req.body;
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    story.comments.push({
      userId: req.user._id,
      username: req.user.username,
      content,
    });
    await story.save();
    res.json(story);
  } catch (err) {
    console.error('Error commenting on story:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// POST: Follow a user
app.post('/api/users/:id/follow', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser._id.equals(req.user._id)) return res.status(400).json({ error: 'Cannot follow yourself' });
    if (!targetUser.followers.includes(req.user._id)) {
      targetUser.followers.push(req.user._id);
      req.user.following.push(targetUser._id);
      await Promise.all([targetUser.save(), req.user.save()]);
    }
    res.json({ followers: targetUser.followers.length, following: req.user.following.length });
  } catch (err) {
    console.error('Error following user:', err);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// GET: Fetch suggested users to follow
app.get('/api/users/suggested', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const currentUser = req.user;
    const suggestedUsers = await User.find({
      _id: { $ne: currentUser._id, $nin: currentUser.following }, // Exclude self and followed users
    })
      .sort({ followers: -1 }) // Sort by number of followers (descending)
      .limit(5) // Limit to 5 suggestions
      .select('username _id followers');
    res.json(suggestedUsers);
  } catch (err) {
    console.error('Error fetching suggested users:', err);
    res.status(500).json({ error: 'Failed to fetch suggested users' });
  }
});

// GET: Fetch user profile with followers
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let user;
    // Check if id is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).populate('followers following', 'username');
    } else {
      // Assume id is a clerkId
      user = await User.findOne({ clerkId: id }).populate('followers following', 'username');
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET: Fetch current user's library (bookmarked stories)
app.get('/api/users/library', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const stories = await Story.find({ bookmarks: req.user._id })
      .populate('authorId', 'username')
      .sort({ createdAt: -1 });
    res.json(stories);
  } catch (err) {
    console.error('Error fetching library:', err);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});