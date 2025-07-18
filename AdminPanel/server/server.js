const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const ImageKit = require('imagekit');
const { createClerkClient } = require('@clerk/backend');

const app = express();
const PORT = 4000;

const MONGODB_URI = 'process.env.mongodb_uri';
const IMAGEKIT_PUBLIC_KEY = 'process.env.imagekit_public_key';
const IMAGEKIT_PRIVATE_KEY = 'process.env.imagekit_private_key';
const IMAGEKIT_URL_ENDPOINT = 'process.env.imagekit_url_endpoint';
const CLERK_SECRET_KEY = 'process.env.clerk_secret_key'; // Replace with your Clerk Secret Key (starts with sk_)

app.use(cors({
  origin: ['http://localhost:3000','http://127.0.0.1:5500'],
  credentials: true
}));

app.use(express.json());

const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });

const imagekit = new ImageKit({
  publicKey: IMAGEKIT_PUBLIC_KEY,
  privateKey: IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: IMAGEKIT_URL_ENDPOINT
});

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|mp3|wav|mp4|webm/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('Invalid file type. Only JPEG, PNG, MP3, WAV, MP4, WebM allowed.'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));

const storySchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: String,
  author: String,
  content: { type: String, required: true },
  imageUrl: String,
  audioUrl: String,
  videoUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const Story = mongoose.model('Story', storySchema);

async function uploadToImageKit(file) {
  try {
    const res = await imagekit.upload({
      file: file.buffer,
      fileName: `${Date.now()}-${file.originalname}`,
      folder: '/devtales'
    });
    return res.url;
  } catch (err) {
    throw new Error(`ImageKit upload failed: ${err.message}`);
  }
}

app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const storyCount = await Story.countDocuments();
    const userCount = (await clerkClient.users.getUserList({ limit: 1 })).totalCount || 0;
    res.json({ userCount, storyCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await clerkClient.users.getUserList({ limit: 100 });
    const userData = users.data.map(user => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
      email: user.emailAddresses[0]?.emailAddress || '-',
      role: user.publicMetadata?.role || 'user',
      createdAt: user.createdAt
    }));
    res.json(userData);
  } catch (err) {
    console.error('Clerk user fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/stories', async (req, res) => {
  try {
    const stories = await Story.find();
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

app.get('/api/stories/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

app.post('/api/stories', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, category, author, content } = req.body;
    const data = { title, category, author, content };

    if (req.files.image) data.imageUrl = await uploadToImageKit(req.files.image[0]);
    if (req.files.audio) data.audioUrl = await uploadToImageKit(req.files.audio[0]);
    if (req.files.video) data.videoUrl = await uploadToImageKit(req.files.video[0]);

    const story = new Story(data);
    await story.save();
    res.status(201).json(story);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/stories/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, category, author, content } = req.body;
    const data = { title, category, author, content };

    if (req.files.image) data.imageUrl = await uploadToImageKit(req.files.image[0]);
    if (req.files.audio) data.audioUrl = await uploadToImageKit(req.files.audio[0]);
    if (req.files.video) data.videoUrl = await uploadToImageKit(req.files.video[0]);

    const story = await Story.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/stories/:id', async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json({ message: 'Story deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Server running at http://localhost:${PORT}`);
});
