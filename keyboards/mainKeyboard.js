// Inline keyboard — asosiy menyu
function getInlineMainMenu() {
  return {
    inline_keyboard: [
      [
        { text: '💸 Xarajat qo\'shish', callback_data: 'add_expense' },
        { text: '💰 Daromad qo\'shish', callback_data: 'add_income' }
      ],
      [
        { text: '📅 Bugun', callback_data: 'nav:today' },
        { text: '📊 Oylik', callback_data: 'nav:month' },
        { text: '💼 Balans', callback_data: 'nav:balance' }
      ],
      [
        { text: '📈 Statistika', callback_data: 'nav:stats' },
        { text: '🏆 Top kategoriya', callback_data: 'nav:topcategory' }
      ],
      [
        { text: '💡 O\'rtacha', callback_data: 'nav:average' },
        { text: '📂 Kategoriyalar', callback_data: 'nav:categories' }
      ],
      [
        { text: '💰 Budjet belgilash', callback_data: 'nav:setbudget' },
        { text: '⏰ Eslatma', callback_data: 'nav:reminder' }
      ],
      [
        { text: '📊 Grafik', callback_data: 'nav:chart' },
        { text: '📄 Hisobot (Excel)', callback_data: 'report' }
      ]
    ]
  };
}

// Reply keyboard — button interfeysi uchun
function getMainKeyboard() {
  return {
    keyboard: [
      ['💸 Xarajat qo\'shish', '💰 Daromad qo\'shish'],
      ['📅 Bugungi', '📊 Oylik', '💼 Balans'],
      ['📈 Statistika', '🏆 Top kategoriya', '💡 O\'rtacha'],
      ['📂 Kategoriyalar', '💰 Budjet', '⏰ Eslatma'],
      ['📊 Grafik', '📄 Hisobot', '🔍 Qidiruv'],
      ['🗑 O\'chirish', '🏠 Menyu']
    ],
    resize_keyboard: true,
    persistent: true
  };
}

// Kategoriya tanlash uchun inline keyboard
function getCategoryKeyboard(categories) {
  const rows = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row = [{ text: categories[i], callback_data: `cat:${categories[i]}` }];
    if (categories[i + 1]) row.push({ text: categories[i + 1], callback_data: `cat:${categories[i + 1]}` });
    rows.push(row);
  }
  rows.push([{ text: '❌ Bekor', callback_data: 'menu' }]);
  return { inline_keyboard: rows };
}

module.exports = { getInlineMainMenu, getMainKeyboard, getCategoryKeyboard };
