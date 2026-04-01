const User = require('../models/User');
const Transaction = require('../models/Transaction');

async function sendDailyReminder(bot) {
  const users = await User.find({ reminderEnabled: true });

  for (const user of users) {
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const count = await Transaction.countDocuments({ userId: user.telegramId, date: { $gte: start } });

      let msg;
      if (count === 0) {
        msg = `⏰ *Eslatma!*\n\nBugun hali xarajat yoki daromad kiritmagansiz.\n\n/add 25000 ovqat — xarajat qo'shish\n/income 100000 bonus — daromad qo'shish`;
      } else {
        msg = `✅ *Bugungi hisobot mavjud*\n\n${count} ta yozuv kiritilgan.\n/today — batafsil ko'rish`;
      }

      await bot.sendMessage(user.telegramId, msg, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error(`Reminder xato userId=${user.telegramId}:`, e.message);
    }
  }
}

module.exports = { sendDailyReminder };
