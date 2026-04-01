const Transaction = require('../models/Transaction');
const path = require('path');
const fs = require('fs');

const TMP_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Ranglar palitri (for future use when canvas is available)
const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
  '#9966FF', '#FF9F40', '#C9CBCF', '#7FBA00',
  '#00B4D8', '#E63946'
];

async function generateChart(userId, type) {
  // временная заглушка - нужно установить Visual Studio для canvas
  throw new Error('Графики временно недоступны. Для работы требуется установить Visual Studio с компонентом "Desktop development with C++"');
  
  // Этот код будет работать после установки canvas:
  // switch (type) {
  //   case 'pie': return await generatePieChart(userId);
  //   case 'bar': return await generateBarChart(userId);
  //   case 'line': return await generateLineChart(userId);
  //   case 'monthly': return await generateBarChart(userId);
  //   default: return await generatePieChart(userId);
  // }
}

module.exports = { generateChart };
