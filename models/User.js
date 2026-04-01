const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: String,
  firstName: String,
  interfaceType: { type: String, enum: ['inline', 'button'], default: null }, // foydalanuvchi tanlagan interfeys
  budget: { type: Number, default: 0 },
  reminderEnabled: { type: Boolean, default: false },
  categories: {
    type: [String],
    default: ['🍔 Ovqat', '🚕 Transport', '🛍 Shopping', '🎮 Entertainment', '📚 Education', '🏠 Uy']
  },
  session: { type: mongoose.Schema.Types.Mixed, default: {} }, // joriy sessiya holati
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
