const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getInlineMainMenu, getCategoryKeyboard, getInlineAddMenu } = require('../keyboards/mainKeyboard');
const chartService = require('../services/chartService');
const reportService = require('../services/reportService');
const { showMenu, addExpense } = require('./commandHandler');

async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);

  const user = await User.findOne({ telegramId: userId });

  // Interfeys tanlash
  if (data.startsWith('set_interface:')) {
    const type = data.split(':')[1];
    await User.updateOne({ telegramId: userId }, {
      interfaceType: type,
      firstName: query.from.first_name,
      username: query.from.username
    });
    const updatedUser = await User.findOne({ telegramId: userId });

    await bot.editMessageText(
      `✅ *${type === 'inline' ? 'Inline tugmalar' : 'Keyboard tugmalar'}* tanlandi!\n\nBotdan foydalanishni boshlashingiz mumkin 🎉`,
      { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown' }
    );
    await showMenu(bot, chatId, updatedUser);
    return;
  }

  // Asosiy menyu
  if (data === 'menu') {
    if (user.interfaceType === 'inline') {
      await bot.sendMessage(chatId, '🏠 *Asosiy menyu*', {
        parse_mode: 'Markdown',
        reply_markup: getInlineMainMenu()
      });
    } else {
      await showMenu(bot, chatId, user);
    }
    return;
  }

  // Xarajat qo'shish inline flow
  if (data === 'add_expense') {
    await User.updateOne({ telegramId: userId }, { session: { state: 'awaiting_expense_amount' } });
    await bot.sendMessage(chatId, '💸 *Xarajat summasi:*\nMiqdorni yozing (masalan: 25000)', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌ Bekor', callback_data: 'menu' }]] }
    });
    return;
  }

  // Daromad qo'shish inline flow
  if (data === 'add_income') {
    await User.updateOne({ telegramId: userId }, { session: { state: 'awaiting_income_amount' } });
    await bot.sendMessage(chatId, '💰 *Daromad summasi:*\nMiqdorni yozing', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌ Bekor', callback_data: 'menu' }]] }
    });
    return;
  }

  // Kategoriya tanlash (xarajat uchun)
  if (data.startsWith('cat:')) {
    const category = data.replace('cat:', '');
    const sess = user.session || {};
    const amount = sess.amount;
    if (!amount) {
      return bot.sendMessage(chatId, '❌ Xato. Qaytadan boshlang.');
    }
    await addExpense(bot, chatId, userId, amount, category, user);
    await User.updateOne({ telegramId: userId }, { session: {} });
    return;
  }

  // Kategoriya o'chirish
  if (data.startsWith('removecat:')) {
    const cat = data.replace('removecat:', '');
    const defaultCats = ['🍔 Ovqat', '🚕 Transport', '🛍 Shopping', '🎮 Entertainment', '📚 Education', '🏠 Uy'];
    if (defaultCats.includes(cat)) {
      return bot.sendMessage(chatId, '⚠️ Standart kategoriyani o\'chirib bo\'lmaydi.');
    }
    await User.updateOne({ telegramId: userId }, { $pull: { categories: cat } });
    await bot.sendMessage(chatId, `✅ *${cat}* kategoriyasi o'chirildi.`, { parse_mode: 'Markdown' });
    return;
  }

  // Yozuvni o'chirish
  if (data.startsWith('del:')) {
    const id = data.replace('del:', '');
    const tx = await Transaction.findOne({ _id: id, userId });
    if (!tx) return bot.sendMessage(chatId, '❌ Topilmadi.');
    await tx.deleteOne();
    await bot.editMessageText(`✅ O'chirildi: ${tx.amount.toLocaleString()} so'm — ${tx.category}`,
      { chat_id: chatId, message_id: query.message.message_id });
    return;
  }

  // Grafiklar
  if (data.startsWith('chart:')) {
    const type = data.split(':')[1];
    await bot.sendMessage(chatId, '⏳ Grafik tayyorlanmoqda...');
    try {
      const filePath = await chartService.generateChart(userId, type);
      await bot.sendPhoto(chatId, filePath, {
        caption: `📊 ${type === 'pie' ? 'Kategoriyalar ulushi' : type === 'bar' ? 'Oylik xarajat' : 'Kunlik trend'}`
      });
    } catch (e) {
      console.error(e);
      await bot.sendMessage(chatId, '❌ Grafik yaratishda xato.');
    }
    return;
  }

  // Hisobot
  if (data === 'report') {
    await bot.sendMessage(chatId, '⏳ Hisobot tayyorlanmoqda...');
    try {
      const filePath = await reportService.generateExcel(userId);
      await bot.sendDocument(chatId, filePath, { caption: '📊 Oylik hisobot' });
    } catch (e) {
      await bot.sendMessage(chatId, '❌ Xato yuz berdi.');
    }
    return;
  }

  // Inline menyu navigatsiya
  const navMap = {
    'nav:today': '/today',
    'nav:month': '/month',
    'nav:balance': '/balance',
    'nav:stats': '/stats',
    'nav:topcategory': '/topcategory',
    'nav:average': '/average',
    'nav:categories': '/categories',
    'nav:setbudget': 'setbudget_prompt',
    'nav:reminder': 'reminder_prompt',
    'nav:chart': '/chart'
  };

  if (data in navMap) {
    const val = navMap[data];
    if (val.startsWith('/')) {
      const { handleCommand } = require('./commandHandler');
      await handleCommand(bot, { chat: { id: chatId }, from: query.from }, val.slice(1));
    } else if (val === 'setbudget_prompt') {
      await User.updateOne({ telegramId: userId }, { session: { state: 'awaiting_budget' } });
      await bot.sendMessage(chatId, '💰 Oylik budjet miqdorini yozing:\nMisol: 2000000', {
        reply_markup: { inline_keyboard: [[{ text: '❌ Bekor', callback_data: 'menu' }]] }
      });
    } else if (val === 'reminder_prompt') {
      await bot.sendMessage(chatId, '⏰ Eslatma:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Yoqish', callback_data: 'reminder:on' }, { text: '❌ O\'chirish', callback_data: 'reminder:off' }]
          ]
        }
      });
    }
    return;
  }

  if (data.startsWith('reminder:')) {
    const status = data.split(':')[1];
    await User.updateOne({ telegramId: userId }, { reminderEnabled: status === 'on' });
    await bot.sendMessage(chatId,
      status === 'on'
        ? '✅ Eslatma yoqildi! Har kuni 21:00 da xabar olasiz ⏰'
        : '❌ Eslatma o\'chirildi.'
    );
  }
}

module.exports = { handleCallback };
