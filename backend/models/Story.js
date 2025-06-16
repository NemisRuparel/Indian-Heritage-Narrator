import mongoose from 'mongoose'

const storySchema = new mongoose.Schema({
  title: String,
  author: String,
  description: String,
})

export default mongoose.model('Story', storySchema)
