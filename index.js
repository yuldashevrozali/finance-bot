require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { handleCommand } = require('./handlers/commandHandler');
const { handleCallback } = require('./handlers/callbackHandler');
const { handleText } = require('./handlers/textHandler');
const { sendDailyReminder } = require('./services/reminderService');

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
