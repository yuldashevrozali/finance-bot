const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
