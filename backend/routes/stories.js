import express from 'express'
import Story from '../models/Story.js'

const router = express.Router()

// Get all stories
router.get('/', async (req, res) => {
  try {
    const stories = await Story.find()
    res.json(stories)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories' })
  }
})

// Get a single story by ID
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ error: 'Story not found' })
    res.json(story)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story' })
  }
})

// Create a new story
router.post('/', async (req, res) => {
  const { title, content, image, audio, video } = req.body
  try {
    const newStory = new Story({ title, content, image, audio, video })
    const saved = await newStory.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: 'Failed to create story' })
  }
})

// Update a story
router.put('/:id', async (req, res) => {
  const { title, content, image, audio, video } = req.body
  try {
    const updated = await Story.findByIdAndUpdate(
      req.params.id,
      { title, content, image, audio, video },
      { new: true }
    )
    if (!updated) return res.status(404).json({ error: 'Story not found' })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: 'Failed to update story' })
  }
})

// Delete a story
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Story.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Story not found' })
    res.json({ message: 'Story deleted successfully' })
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete story' })
  }
})

export default router
