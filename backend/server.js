// server.js - Full Code (with corrected route order)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const ImageKit = require('imagekit');
const multer = require('multer');
const { Clerk, ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for media uploads

const PORT = process.env.PORT || 3000;

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// const { Clerk } = require('@clerk/clerk-sdk-node');
global.Clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

const upload = multer({ storage: multer.memoryStorage() });

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  bio: { type: String, default: '' },
  imageUrl: { type: String },
});

const User = mongoose.model('User', userSchema);

const storySchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  imageUrls: [String],
  audioUrl: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Story = mongoose.model('Story', storySchema);

// Middleware to sync Clerk user data with MongoDB
const syncUser = async (req, res, next) => {
  if (req.auth && req.auth.userId) {
    try {
      let user = await User.findOne({ clerkId: req.auth.userId });
      if (!user) {
        // If user doesn't exist, create them
        const clerkUser = await global.Clerk.users.getUser(req.auth.userId);
        user = await User.create({
          clerkId: req.auth.userId,
          username: clerkUser.username || `user_${req.auth.userId}`,
          imageUrl: clerkUser.imageUrl,
          bio: '',
        });
        console.log('New user created in MongoDB:', user.username);
      }
      req.user = user; // Attach MongoDB user document to request
      next();
    } catch (err) {
      console.error('Error syncing user:', err);
      return res.status(500).json({ error: 'Failed to sync user data.' });
    }
  } else {
    next();
  }
};

// Routes
// POST: Create a new story
app.post('/api/stories', ClerkExpressRequireAuth(), syncUser, upload.array('files', 10), async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const authorId = req.user._id;

    if (!title || !content || !category || !authorId) {
      return res.status(400).json({ error: 'Missing required fields: title, content, category, and authorId.' });
    }

    let imageUrls = [];
    let audioUrl = null;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileBase64 = file.buffer.toString('base64');
        const fileName = `${Date.now()}-${file.originalname}`;
        const folderName = 'story_uploads';

        try {
          const result = await imagekit.upload({
            file: fileBase64,
            fileName: fileName,
            folder: folderName,
          });

          if (file.mimetype.startsWith('image/')) {
            imageUrls.push(result.url);
          } else if (file.mimetype.startsWith('audio/')) {
            audioUrl = result.url;
          }
        } catch (uploadErr) {
          console.error('ImageKit upload error:', uploadErr);
          return res.status(500).json({ error: 'Failed to upload file to ImageKit.' });
        }
      }
    }

    const newStory = new Story({
      title,
      content,
      authorId,
      category,
      imageUrls,
      audioUrl,
    });
    await newStory.save();

    // Populate author details before sending response
    await newStory.populate('authorId', 'username imageUrl');

    res.status(201).json(newStory);
  } catch (err) {
    console.error('Error creating story:', err);
    res.status(500).json({ error: 'Failed to create story: ' + err.message });
  }
});

// GET: Fetch bookmarked stories for the current user (MOVED BEFORE /:id route)
app.get('/api/stories/bookmarked', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const bookmarkedStories = await Story.find({ bookmarks: userId })
      .populate('authorId', 'username imageUrl')
      .populate('comments.userId', 'username')
      .sort({ createdAt: -1 });
    res.json(bookmarkedStories);
  } catch (err) {
    console.error('Error fetching bookmarked stories:', err);
    res.status(500).json({ error: 'Failed to fetch bookmarked stories: ' + err.message });
  }
});

// GET: Fetch all stories
app.get('/api/stories', async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const stories = await Story.find(filter)
      .populate('authorId', 'username imageUrl')
      .populate('comments.userId', 'username')
      .sort({ createdAt: -1 }); // Sort by creation date, newest first
    res.json(stories);
  } catch (err) {
    console.error('Error fetching stories:', err);
    res.status(500).json({ error: 'Failed to fetch stories: ' + err.message });
  }
});

// GET: Fetch a single story by ID (MOVED AFTER /bookmarked route)
app.get('/api/stories/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('authorId', 'username imageUrl')
      .populate('comments.userId', 'username');
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    res.json(story);
  } catch (err) {
    console.error('Error fetching story by ID:', err);
    res.status(500).json({ error: 'Failed to fetch story: ' + err.message });
  }
});

// DELETE: Delete a story by ID
app.delete('/api/stories/:id', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    // Check if the current user is the author of the story
    if (story.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: You are not the author of this story' });
    }
    await story.deleteOne();
    res.status(200).json({ message: 'Story deleted successfully' });
  } catch (err) {
    console.error('Error deleting story:', err);
    res.status(500).json({ error: 'Failed to delete story: ' + err.message });
  }
});

// POST: Like/Unlike a story
app.post('/api/stories/:id/like', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const userId = req.user._id;
    const likedIndex = story.likes.findIndex(like => like.equals(userId));

    if (likedIndex > -1) {
      // User has already liked, so unlike
      story.likes.splice(likedIndex, 1);
    } else {
      // User has not liked, so like
      story.likes.push(userId);
    }
    await story.save();
    res.json(story);
  } catch (err) {
    console.error('Error liking/unliking story:', err);
    res.status(500).json({ error: 'Failed to like/unlike story: ' + err.message });
  }
});

// POST: Bookmark/Unbookmark a story
app.post('/api/stories/:id/bookmark', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const userId = req.user._id;
    const bookmarkedIndex = story.bookmarks.findIndex(bookmark => bookmark.equals(userId));

    if (bookmarkedIndex > -1) {
      // User has already bookmarked, so unbookmark
      story.bookmarks.splice(bookmarkedIndex, 1);
    } else {
      // User has not bookmarked, so bookmark
      story.bookmarks.push(userId);
    }
    await story.save();
    res.json(story);
  } catch (err) {
    console.error('Error bookmarking/unbookmarking story:', err);
    res.status(500).json({ error: 'Failed to bookmark/unbookmark story: ' + err.message });
  }
});


// POST: Add a comment to a story
app.post('/api/stories/:id/comments', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    story.comments.push({ userId: req.user._id, text });
    await story.save();

    // Populate the newly added comment's user
    const updatedStory = await Story.findById(req.params.id)
      .populate('authorId', 'username imageUrl')
      .populate('comments.userId', 'username');

    res.status(201).json(updatedStory.comments[updatedStory.comments.length - 1]);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment: ' + err.message });
  }
});

// GET: Fetch user profile and their written stories
app.get('/api/users/:id', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch stories written by this user
    const stories = await Story.find({ authorId: user._id })
      .populate('authorId', 'username imageUrl')
      .populate('comments.userId', 'username')
      .sort({ createdAt: -1 });
    res.json({ ...user.toJSON(), stories });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile: ' + err.message });
  }
});

// GET: Fetch stories liked by a specific user
app.get('/api/users/:userId/liked-stories', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const { userId } = req.params;
    // Find stories where the 'likes' array contains the userId
    const likedStories = await Story.find({ likes: userId })
      .populate('authorId', 'username imageUrl')
      .populate('comments.userId', 'username')
      .sort({ createdAt: -1 }); // Sort by creation date, newest first
    res.json(likedStories);
  } catch (err) {
    console.error('Error fetching liked stories:', err);
    res.status(500).json({ error: 'Failed to fetch liked stories: ' + err.message });
  }
});

// PUT: Update user profile
app.put('/api/users/:id', ClerkExpressRequireAuth(), syncUser, async (req, res) => {
  try {
    const { username, bio } = req.body;
    if (req.user.clerkId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized: You can only edit your own profile' });
    }
    req.user.username = username || req.user.username;
    req.user.bio = bio || req.user.bio;
    await req.user.save();
    res.json(req.user);
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.status === 401) {
    return res.status(401).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});