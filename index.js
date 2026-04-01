import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import mongoose from 'mongoose';
import cron from 'node-cron';
import express from 'express';

// O'zingizning handlerlaringizni import qilish
import { handleCommand } from './handlers/commandHandler.js';
import { handleCallback } from './handlers/callbackHandler.js';
import { handleText } from './handlers/textHandler.js';
import { sendDailyReminder } from './services/reminderService.js';

// Qolgan bot mantiqini bu yerda davom ettiring...

const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send('Bot is running 🚀')
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Commands
bot.onText(/\/(.+)/, async (msg, match) => {
  await handleCommand(bot, msg, match[1]);
});

// Callback queries (inline keyboard)
bot.on('callback_query', async (query) => {
  await handleCallback(bot, query);
});

// Text messages (for session-based input)
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  await handleText(bot, msg);
});

// Daily reminder cron - har kuni soat 21:00 da
cron.schedule('0 21 * * *', async () => {
  await sendDailyReminder(bot);
});

console.log('🤖 Finance Bot ishga tushdi...');
