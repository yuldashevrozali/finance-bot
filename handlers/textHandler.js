const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getCategoryKeyboard } = require('../keyboards/mainKeyboard');
const { addExpense, addIncome, showMenu } = require('./commandHandler');
const { handleCommand } = require('./commandHandler');

// Button keyboard tugmalari uchun mapping
const BUTTON_COMMANDS = {
  '💸 Xarajat qo\'shish': 'add_expense_flow',
  '💰 Daromad qo\'shish': 'add_income_flow',
  '📅 Bugungi': 'today',
  '📊 Oylik': 'month',
  '💼 Balans': 'balance',
  '📈 Statistika': 'stats',
  '🏆 Top kategoriya': 'topcategory',
  '📂 Kategoriyalar': 'categories',
  '💡 O\'rtacha': 'average',
  '💰 Budjet': 'setbudget_prompt',
  '⏰ Eslatma': 'reminder_prompt',
  '📊 Grafik': 'chart',
  '📄 Hisobot': 'report',
  '🔍 Qidiruv': 'search_prompt',
  '🗑 O\'chirish': 'delete_prompt',
  '🏠 Menyu': 'menu'
};

async function handleText(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text.trim();

  const user = await User.findOne({ telegramId: userId });
  if (!user) return;

  // Keyboard tugma bosilgan bo'lsa
  if (text in BUTTON_COMMANDS) {
    await handleButtonAction(bot, chatId, userId, user, BUTTON_COMMANDS[text]);
    return;
  }

  // Sessiya holati bo'yicha ishlash
  const session = user.session || {};
  const state = session.state;

  if (!state) return;

  switch (state) {
    // --- XARAJAT FLOW ---
    case 'awaiting_expense_amount': {
      const amount = parseInt(text.replace(/\s/g, ''));
      if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, '❌ To\'g\'ri summa kiriting.\nMisol: 25000');
      }
      await User.updateOne({ telegramId: userId }, { session: { state: 'awaiting_expense_category', amount } });
      await bot.sendMessage(chatId, `💸 Summa: *${amount.toLocaleString()} so'm*\n\nKategoriyani tanlang:`, {
        parse_mode: 'Markdown',
        reply_markup: getCategoryKeyboard(user.categories)
      });
      break;
    }

    case 'awaiting_expense_category': {
      const amount = session.amount;
      await addExpense(bot, chatId, userId, amount, text, user);
      await User.updateOne({ telegramId: userId }, { session: {} });
      break;
    }

    // --- DAROMAD FLOW ---
    case 'awaiting_income_amount': {
      const amount = parseInt(text.replace(/\s/g, ''));
      if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, '❌ To\'g\'ri summa kiriting.');
      }
      await User.updateOne({ telegramId: userId }, { session: { state: 'awaiting_income_desc', amount } });
      await bot.sendMessage(chatId, `💰 Summa: *${amount.toLocaleString()} so'm*\n\nTavsif yozing (masalan: oylik, bonus):`, {
        parse_mode: 'Markdown',
        reply_markup: { keyboard: [['Oylik', 'Bonus', 'Qo\'shimcha'], ['❌ Bekor']], resize_keyboard: true, one_time_keyboard: true }
      });
      break;
    }

    case 'awaiting_income_desc': {
      if (text === '❌ Bekor') {
        await User.updateOne({ telegramId: userId }, { session: {} });
        return showMenu(bot, chatId, user);
      }
      const amount = session.amount;
      await addIncome(bot, chatId, userId, amount, text);
      await User.updateOne({ telegramId: userId }, { session: {} });
      break;
    }

    // --- BUDJET ---
    case 'awaiting_budget': {
      const budget = parseInt(text.replace(/\s/g, ''));
      if (isNaN(budget) || budget <= 0) {
        return bot.sendMessage(chatId, '❌ To\'g\'ri summa kiriting.');
      }
      await User.updateOne({ telegramId: userId }, { budget, session: {} });
      await bot.sendMessage(chatId, `✅ Budjet belgilandi: *${budget.toLocaleString()} so'm*`, { parse_mode: 'Markdown' });
      break;
    }

    // --- KATEGORIYA QO'SHISH ---
    case 'awaiting_category_name': {
      if (user.categories.includes(text)) {
        return bot.sendMessage(chatId, '⚠️ Bu kategoriya allaqachon bor.');
      }
      user.categories.push(text);
      user.session = {};
      await user.save();
      await bot.sendMessage(chatId, `✅ *${text}* kategoriyasi qo'shildi!`, { parse_mode: 'Markdown' });
      break;
    }

    // --- QIDIRUV ---
    case 'awaiting_search': {
      await User.updateOne({ telegramId: userId }, { session: {} });
      await handleCommand(bot, msg, `search ${text}`);
      break;
    }

    default:
      break;
  }
}

async function handleButtonAction(bot, chatId, userId, user, action) {
  switch (action) {
    case 'add_expense_flow':
      await User.updateOne({ telegramId: userId }, { session: { state: 'awaiting_expense_amount' } });
      await bot.sendMessage(chatId, '💸 Xarajat summasi qancha?\n(Masalan: 25000)', {
        reply_markup: { keyboard: [['❌ Bekor']], resize_keyboard: true, one_time_keyboard: true }
      });
      break;

    case 'add_income_flow':
      await User.updateOne({ telegramId: userId }, { session: { state: 'awaiting_income_amount' } });
      await bot.sendMessage(chatId, '💰 Daromad summasi qancha?', {
        reply_markup: { keyboard: [['❌ Bekor']], resize_keyboard: true, one_time_keyboard: true }
      });
      break;

    case 'setbudget_prompt':
      await User.updateOne({ telegramId: userId }, { session: { state: 'awaiting_budget' } });
      await bot.sendMessage(chatId, '💰 Oylik budjet miqdorini yozing:\nMisol: 2000000');
      break;

    case 'reminder_prompt':
      await bot.sendMessage(chatId, '⏰ Eslatma holati:', {
        reply_markup: {
          keyboard: [['⏰ Eslatma yoqish', '❌ Eslatma o\'chirish'], ['🏠 Menyu']],
          resize_keyboard: true
        }
      });
      break;

    case 'search_prompt':
      await User.updateOne({ telegramId: userId }, { session: { state: 'awaiting_search' } });
      await bot.sendMessage(chatId, '🔍 Qidiruv so\'zini yozing:\n(Kategoriya nomi yoki sana: 2026-01)');
      break;

    case 'delete_prompt':
      await handleCommand(bot, { chat: { id: chatId }, from: { id: userId } }, 'delete');
      break;

    case 'menu':
      await showMenu(bot, chatId, user);
      break;

    default:
      await handleCommand(bot, { chat: { id: chatId }, from: { id: userId } }, action);
  }
}

module.exports = { handleText };
