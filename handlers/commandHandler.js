const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getMainKeyboard, getInlineMainMenu } = require('../keyboards/mainKeyboard');
const statsService = require('../services/statsService');
const reportService = require('../services/reportService');
const chartService = require('../services/chartService');

async function handleCommand(bot, msg, commandStr) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const parts = commandStr.trim().split(' ');
  const cmd = parts[0].toLowerCase();

  let user = await User.findOne({ telegramId: userId });

  // Foydalanuvchi birinchi marta kelsa
  if (!user) {
    user = await User.create({
      telegramId: userId,
      username: msg.from.username,
      firstName: msg.from.first_name
    });
  }

  // Interfeys tanlanmagan bo'lsa, /start da so'raymiz
  if (!user.interfaceType && cmd !== 'start') {
    await askInterfaceType(bot, chatId);
    return;
  }

  switch (cmd) {
    case 'start':
      await handleStart(bot, chatId, user, msg);
      break;

    case 'add': {
      const amount = parseInt(parts[1]);
      const category = parts.slice(2).join(' ');
      if (!amount || isNaN(amount)) {
        return bot.sendMessage(chatId, '❌ Format: /add <summa> <kategoriya>\nMisol: /add 25000 ovqat');
      }
      await addExpense(bot, chatId, userId, amount, category || '🍔 Ovqat', user);
      break;
    }

    case 'income': {
      const amount = parseInt(parts[1]);
      const desc = parts.slice(2).join(' ');
      if (!amount || isNaN(amount)) {
        return bot.sendMessage(chatId, '❌ Format: /income <summa> <tavsif>\nMisol: /income 3000000 oylik');
      }
      await addIncome(bot, chatId, userId, amount, desc || 'Daromad');
      break;
    }

    case 'today':
      await showToday(bot, chatId, userId, user);
      break;

    case 'month':
      await showMonth(bot, chatId, userId);
      break;

    case 'balance':
      await showBalance(bot, chatId, userId);
      break;

    case 'categories':
      await showCategories(bot, chatId, user);
      break;

    case 'addcategory':
      await startAddCategory(bot, chatId, user, parts.slice(1).join(' '));
      break;

    case 'removecategory':
      await showRemoveCategory(bot, chatId, user);
      break;

    case 'topcategory':
      await showTopCategory(bot, chatId, userId);
      break;

    case 'stats':
      await showStats(bot, chatId, userId);
      break;

    case 'average':
      await showAverage(bot, chatId, userId);
      break;

    case 'setbudget': {
      const budget = parseInt(parts[1]);
      if (!budget || isNaN(budget)) {
        return bot.sendMessage(chatId, '❌ Format: /setbudget <summa>\nMisol: /setbudget 2000000');
      }
      await setBudget(bot, chatId, userId, budget);
      break;
    }

    case 'reminder':
      await toggleReminder(bot, chatId, userId, parts[1]);
      break;

    case 'delete': {
      const id = parts[1];
      await deleteTransaction(bot, chatId, userId, id);
      break;
    }

    case 'edit': {
      // /edit <id> <summa> <kategoriya>
      const id = parts[1];
      const amount = parseInt(parts[2]);
      const cat = parts.slice(3).join(' ');
      await editTransaction(bot, chatId, userId, id, amount, cat);
      break;
    }

    case 'search': {
      const query = parts.slice(1).join(' ');
      await searchTransactions(bot, chatId, userId, query);
      break;
    }

    case 'report':
      await generateReport(bot, chatId, userId);
      break;

    case 'chart':
      await generateChart(bot, chatId, userId);
      break;

    case 'menu':
      await showMenu(bot, chatId, user);
      break;

    default:
      bot.sendMessage(chatId, '❓ Noma\'lum komanda. /menu yoki /start bosing.');
  }
}

async function handleStart(bot, chatId, user, msg) {
  if (!user.interfaceType) {
    await askInterfaceType(bot, chatId);
  } else {
    await showMenu(bot, chatId, user);
  }
}

async function askInterfaceType(bot, chatId) {
  await bot.sendMessage(chatId,
    `👋 *Finance Bot*ga xush kelibsiz!\n\nQaysi interfeys turini xohlaysiz?`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔘 Inline tugmalar', callback_data: 'set_interface:inline' },
            { text: '⌨️ Keyboard tugmalar', callback_data: 'set_interface:button' }
          ]
        ]
      }
    }
  );
}

async function showMenu(bot, chatId, user) {
  const now = new Date();
  const greeting = now.getHours() < 12 ? '🌅 Xayrli tong' : now.getHours() < 18 ? '☀️ Xayrli kun' : '🌙 Xayrli kech';
  const text = `${greeting}, *${user.firstName || 'Do\'stim'}*!\n\n💼 *Finance Bot* - Moliyaviy yordamchingiz\n\nQuyidagilardan birini tanlang:`;

  if (user.interfaceType === 'inline') {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: getInlineMainMenu()
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: getMainKeyboard()
    });
  }
}

async function addExpense(bot, chatId, userId, amount, categoryInput, user) {
  // Kategoriyani topish (qisman moslik)
  const matched = user.categories.find(c =>
    c.toLowerCase().includes(categoryInput.toLowerCase()) ||
    categoryInput.toLowerCase().includes(c.replace(/[^\w\s]/g, '').trim().toLowerCase())
  ) || categoryInput;

  const tx = await Transaction.create({
    userId,
    type: 'expense',
    amount,
    category: matched,
    description: categoryInput
  });

  // Budjet tekshirish
  let budgetWarning = '';
  if (user.budget > 0) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalExpense = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const total = totalExpense[0]?.total || 0;
    const percent = Math.round((total / user.budget) * 100);
    if (percent >= 100) {
      budgetWarning = `\n\n🚨 *DIQQAT!* Oylik budjetingiz *${percent}%* ishlatildi!`;
    } else if (percent >= 80) {
      budgetWarning = `\n\n⚠️ Budjetingizning *${percent}%* ishlatildi!`;
    } else if (percent >= 60) {
      budgetWarning = `\n\n💛 Budjetning *${percent}%* sarflandi.`;
    }
  }

  await bot.sendMessage(chatId,
    `✅ *Xarajat qo'shildi!*\n\n💸 Summa: *${amount.toLocaleString()} so'm*\n📂 Kategoriya: ${matched}${budgetWarning}`,
    { parse_mode: 'Markdown' }
  );
}

async function addIncome(bot, chatId, userId, amount, desc) {
  await Transaction.create({ userId, type: 'income', amount, category: '💰 Daromad', description: desc });
  await bot.sendMessage(chatId,
    `✅ *Daromad qo'shildi!*\n\n💰 Summa: *${amount.toLocaleString()} so'm*\n📝 Tavsif: ${desc}`,
    { parse_mode: 'Markdown' }
  );
}

async function showToday(bot, chatId, userId, user) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const txs = await Transaction.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: -1 });
  if (!txs.length) {
    return bot.sendMessage(chatId, '📭 Bugun hech qanday yozuv yo\'q.', { parse_mode: 'Markdown' });
  }

  let expenses = 0, income = 0, lines = '';
  txs.forEach((t, i) => {
    const icon = t.type === 'income' ? '💰' : '💸';
    const sign = t.type === 'income' ? '+' : '-';
    lines += `${i + 1}. ${icon} ${sign}${t.amount.toLocaleString()} — ${t.category}\n`;
    if (t.type === 'expense') expenses += t.amount;
    else income += t.amount;
  });

  const text = `📅 *Bugungi hisobot*\n\n${lines}\n` +
    `💸 Xarajat: *${expenses.toLocaleString()} so'm*\n` +
    `💰 Daromad: *${income.toLocaleString()} so'm*\n` +
    `📊 Balans: *${(income - expenses).toLocaleString()} so'm*`;

  const keyboard = user.interfaceType === 'inline' ? {
    inline_keyboard: [[{ text: '🔙 Menyu', callback_data: 'menu' }]]
  } : undefined;

  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
}

async function showMonth(bot, chatId, userId) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const agg = await Transaction.aggregate([
    { $match: { userId, date: { $gte: start, $lte: end } } },
    { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amount' } } }
  ]);

  let income = 0, expByCategory = {};
  agg.forEach(a => {
    if (a._id.type === 'income') income += a.total;
    else {
      expByCategory[a._id.category] = (expByCategory[a._id.category] || 0) + a.total;
    }
  });

  const totalExp = Object.values(expByCategory).reduce((s, v) => s + v, 0);
  let catLines = Object.entries(expByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `  ${cat}: ${amt.toLocaleString()} so'm`)
    .join('\n');

  const monthName = now.toLocaleString('uz-UZ', { month: 'long' });
  const text = `📊 *${monthName} oyi hisoboti*\n\n` +
    `💰 Daromad: *${income.toLocaleString()} so'm*\n` +
    `💸 Xarajat: *${totalExp.toLocaleString()} so'm*\n` +
    `💚 Tejaldi: *${(income - totalExp).toLocaleString()} so'm*\n\n` +
    `📂 *Kategoriyalar:*\n${catLines || '  —'}`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '📊 Grafik ko\'rish', callback_data: 'chart:monthly' }, { text: '📄 Hisobot', callback_data: 'report' }]] }
  });
}

async function showBalance(bot, chatId, userId) {
  const agg = await Transaction.aggregate([
    { $match: { userId } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } }
  ]);
  let income = 0, expense = 0;
  agg.forEach(a => { if (a._id === 'income') income = a.total; else expense = a.total; });
  const balance = income - expense;
  const emoji = balance >= 0 ? '💚' : '❤️';

  await bot.sendMessage(chatId,
    `💼 *Balans*\n\n💰 Jami daromad: *${income.toLocaleString()} so'm*\n💸 Jami xarajat: *${expense.toLocaleString()} so'm*\n\n${emoji} *Balans: ${balance.toLocaleString()} so'm*`,
    { parse_mode: 'Markdown' }
  );
}

async function showCategories(bot, chatId, user) {
  const list = user.categories.map((c, i) => `${i + 1}. ${c}`).join('\n');
  await bot.sendMessage(chatId,
    `📂 *Kategoriyalaringiz:*\n\n${list}\n\n➕ /addcategory <nom> — qo'shish\n❌ /removecategory — o'chirish`,
    { parse_mode: 'Markdown' }
  );
}

async function startAddCategory(bot, chatId, user, name) {
  if (!name) {
    await user.updateOne({ session: { state: 'awaiting_category_name' } });
    return bot.sendMessage(chatId, '📝 Yangi kategoriya nomini yozing (emoji bilan):\nMisol: 💊 Sog\'liq');
  }
  if (user.categories.includes(name)) {
    return bot.sendMessage(chatId, '⚠️ Bu kategoriya allaqachon mavjud.');
  }
  user.categories.push(name);
  await user.save();
  await bot.sendMessage(chatId, `✅ *${name}* kategoriyasi qo'shildi!`, { parse_mode: 'Markdown' });
}

async function showRemoveCategory(bot, chatId, user) {
  const buttons = user.categories.map(c => [{ text: c, callback_data: `removecat:${c}` }]);
  buttons.push([{ text: '❌ Bekor qilish', callback_data: 'menu' }]);
  await bot.sendMessage(chatId, '🗑 O\'chirmoqchi bo\'lgan kategoriyani tanlang:', {
    reply_markup: { inline_keyboard: buttons }
  });
}

async function showTopCategory(bot, chatId, userId) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const agg = await Transaction.aggregate([
    { $match: { userId, type: 'expense', date: { $gte: start } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: 5 }
  ]);

  if (!agg.length) return bot.sendMessage(chatId, '📭 Bu oy xarajat yo\'q.');

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const lines = agg.map((a, i) => `${medals[i]} ${a._id}: *${a.total.toLocaleString()} so'm*`).join('\n');
  await bot.sendMessage(chatId, `🏆 *Top kategoriyalar (bu oy):*\n\n${lines}`, { parse_mode: 'Markdown' });
}

async function showStats(bot, chatId, userId) {
  const stats = await statsService.getMonthlyStats(userId);
  await bot.sendMessage(chatId, stats, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Pie Chart', callback_data: 'chart:pie' }, { text: '📈 Bar Chart', callback_data: 'chart:bar' }]
      ]
    }
  });
}

async function showAverage(bot, chatId, userId) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const agg = await Transaction.aggregate([
    { $match: { userId, type: 'expense', date: { $gte: start } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  const total = agg[0]?.total || 0;
  const today = now.getDate();
  const avg = Math.round(total / today);

  await bot.sendMessage(chatId,
    `📊 *Kunlik o'rtacha xarajat*\n\n💸 Bu oy jami: *${total.toLocaleString()} so'm*\n📅 Kunlar soni: *${today} kun*\n📊 O'rtacha: *${avg.toLocaleString()} so'm/kun*`,
    { parse_mode: 'Markdown' }
  );
}

async function setBudget(bot, chatId, userId, budget) {
  await User.updateOne({ telegramId: userId }, { budget });
  await bot.sendMessage(chatId,
    `✅ Oylik budjet belgilandi: *${budget.toLocaleString()} so'm*\n\nBot sizni budjetdan oshganingizda ogohlantiradi! ⚠️`,
    { parse_mode: 'Markdown' }
  );
}

async function toggleReminder(bot, chatId, userId, status) {
  const enabled = status === 'on';
  await User.updateOne({ telegramId: userId }, { reminderEnabled: enabled });
  await bot.sendMessage(chatId,
    enabled
      ? '✅ Eslatma yoqildi! Har kuni soat 21:00 da xabar yuboriladi. ⏰'
      : '❌ Eslatma o\'chirildi.'
  );
}

async function deleteTransaction(bot, chatId, userId, id) {
  if (!id) {
    // So'nggi 5 ta ko'rsat
    const txs = await Transaction.find({ userId }).sort({ date: -1 }).limit(5);
    if (!txs.length) return bot.sendMessage(chatId, '📭 Yozuvlar yo\'q.');
    const lines = txs.map((t, i) =>
      `${i + 1}. ${t.type === 'income' ? '💰' : '💸'} ${t.amount.toLocaleString()} — ${t.category} (${t._id})`
    ).join('\n');
    const buttons = txs.map(t => [{ text: `🗑 ${t.amount.toLocaleString()} - ${t.category}`, callback_data: `del:${t._id}` }]);
    return bot.sendMessage(chatId, `🗑 *O'chirish uchun tanlang:*\n\n${lines}`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }

  const tx = await Transaction.findOne({ _id: id, userId });
  if (!tx) return bot.sendMessage(chatId, '❌ Yozuv topilmadi.');
  await tx.deleteOne();
  await bot.sendMessage(chatId, `✅ Yozuv o'chirildi: ${tx.amount.toLocaleString()} so'm — ${tx.category}`);
}

async function editTransaction(bot, chatId, userId, id, amount, category) {
  if (!id || !amount || isNaN(amount)) {
    return bot.sendMessage(chatId, '❌ Format: /edit <id> <summa> <kategoriya>');
  }
  const tx = await Transaction.findOne({ _id: id, userId });
  if (!tx) return bot.sendMessage(chatId, '❌ Yozuv topilmadi.');
  tx.amount = amount;
  if (category) tx.category = category;
  await tx.save();
  await bot.sendMessage(chatId, `✅ Yozuv yangilandi: *${amount.toLocaleString()} so'm* — ${tx.category}`, { parse_mode: 'Markdown' });
}

async function searchTransactions(bot, chatId, userId, query) {
  if (!query) return bot.sendMessage(chatId, '❌ Format: /search <so\'z yoki sana>\nMisol: /search ovqat\nMisol: /search 2026-01');

  let filter = { userId };
  // Sana formatini tekshirish: YYYY-MM
  if (/^\d{4}-\d{2}$/.test(query)) {
    const [year, month] = query.split('-').map(Number);
    filter.date = {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0, 23, 59, 59)
    };
  } else {
    filter.$or = [
      { category: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ];
  }

  const txs = await Transaction.find(filter).sort({ date: -1 }).limit(20);
  if (!txs.length) return bot.sendMessage(chatId, `🔍 "${query}" bo'yicha natija topilmadi.`);

  let total = 0;
  const lines = txs.map(t => {
    const icon = t.type === 'income' ? '💰' : '💸';
    const d = t.date.toLocaleDateString('uz-UZ');
    if (t.type === 'expense') total += t.amount;
    return `${icon} ${t.amount.toLocaleString()} — ${t.category} (${d})`;
  }).join('\n');

  await bot.sendMessage(chatId,
    `🔍 *"${query}" natijalari (${txs.length} ta):*\n\n${lines}\n\n💸 Jami xarajat: *${total.toLocaleString()} so'm*`,
    { parse_mode: 'Markdown' }
  );
}

async function generateReport(bot, chatId, userId) {
  await bot.sendMessage(chatId, '⏳ Hisobot tayyorlanmoqda...');
  try {
    const filePath = await reportService.generateExcel(userId);
    await bot.sendDocument(chatId, filePath, {
      caption: '📊 *Oylik hisobot tayyor!*',
      parse_mode: 'Markdown'
    });
  } catch (e) {
    console.error(e);
    await bot.sendMessage(chatId, '❌ Hisobot yaratishda xato yuz berdi.');
  }
}

async function generateChart(bot, chatId, userId) {
  await bot.sendMessage(chatId, '📊 Grafik turini tanlang:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🥧 Kategoriya (Pie)', callback_data: 'chart:pie' }],
        [{ text: '📊 Oylik xarajat (Bar)', callback_data: 'chart:bar' }],
        [{ text: '📈 Kunlik trend (Line)', callback_data: 'chart:line' }]
      ]
    }
  });
}

module.exports = { handleCommand, addExpense, addIncome, showMenu };
