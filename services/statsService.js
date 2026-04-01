const Transaction = require('../models/Transaction');
const User = require('../models/User');

async function getMonthlyStats(userId) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Bu oy
  const thisMonth = await Transaction.aggregate([
    { $match: { userId, date: { $gte: start } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } }
  ]);

  // O'tgan oy
  const lastMonth = await Transaction.aggregate([
    { $match: { userId, date: { $gte: prevStart, $lte: prevEnd } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } }
  ]);

  const thisIncome = thisMonth.find(a => a._id === 'income')?.total || 0;
  const thisExpense = thisMonth.find(a => a._id === 'expense')?.total || 0;
  const lastIncome = lastMonth.find(a => a._id === 'income')?.total || 0;
  const lastExpense = lastMonth.find(a => a._id === 'expense')?.total || 0;

  const expDiff = thisExpense - lastExpense;
  const expTrend = expDiff > 0 ? `⬆️ +${expDiff.toLocaleString()}` : `⬇️ ${expDiff.toLocaleString()}`;

  const user = await User.findOne({ telegramId: userId });
  let budgetLine = '';
  if (user?.budget > 0) {
    const pct = Math.round((thisExpense / user.budget) * 100);
    const bar = progressBar(pct);
    budgetLine = `\n\n💰 *Budjet nazorati:*\n${bar} ${pct}%\n${thisExpense.toLocaleString()} / ${user.budget.toLocaleString()} so'm`;
  }

  const monthName = now.toLocaleString('uz-UZ', { month: 'long' });
  return `📊 *${monthName} statistikasi*\n\n` +
    `💰 Daromad: *${thisIncome.toLocaleString()} so'm*\n` +
    `💸 Xarajat: *${thisExpense.toLocaleString()} so'm*\n` +
    `💚 Tejaldi: *${(thisIncome - thisExpense).toLocaleString()} so'm*\n\n` +
    `📅 *O'tgan oyga nisbatan:*\n` +
    `Xarajat: ${expTrend} so'm\n` +
    `Daromad: ${lastIncome.toLocaleString()} → ${thisIncome.toLocaleString()} so'm` +
    budgetLine;
}

function progressBar(pct) {
  const filled = Math.min(Math.round(pct / 10), 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

module.exports = { getMonthlyStats };
