const ExcelJS = require('exceljs');
const Transaction = require('../models/Transaction');
const path = require('path');
const fs = require('fs');

const TMP_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

async function generateExcel(userId) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const txs = await Transaction.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: 1 });

  let totalIncome = 0, totalExpense = 0;
  const catMap = {};

  txs.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount;
    else {
      totalExpense += t.amount;
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    }
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Finance Bot';
  workbook.created = now;

  // ===== SHEET 1: Barcha tranzaksiyalar =====
  const sheet1 = workbook.addWorksheet('Tranzaksiyalar', {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
  });

  // Sarlavha
  sheet1.mergeCells('A1:F1');
  const titleCell = sheet1.getCell('A1');
  const monthName = now.toLocaleString('uz-UZ', { month: 'long', year: 'numeric' });
  titleCell.value = `💰 Finance Bot — ${monthName} Hisoboti`;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a237e' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 35;

  // Jadval sarlavhalari
  sheet1.addRow([]);
  const headerRow = sheet1.addRow(['№', 'Sana', 'Tur', 'Kategoriya', 'Tavsif', 'Summa (so\'m)']);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF283593' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
  });

  // Ma'lumotlar
  txs.forEach((t, i) => {
    const row = sheet1.addRow([
      i + 1,
      t.date.toLocaleDateString('uz-UZ'),
      t.type === 'income' ? '💰 Daromad' : '💸 Xarajat',
      t.category,
      t.description || '',
      t.amount
    ]);
    row.getCell(6).numFmt = '#,##0';
    if (t.type === 'income') {
      row.getCell(6).font = { color: { argb: 'FF2e7d32' }, bold: true };
    } else {
      row.getCell(6).font = { color: { argb: 'FFc62828' } };
    }
    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      });
    }
  });

  // Ustun kengliklari
  sheet1.columns = [
    { key: 'no', width: 6 },
    { key: 'date', width: 14 },
    { key: 'type', width: 14 },
    { key: 'cat', width: 20 },
    { key: 'desc', width: 22 },
    { key: 'amount', width: 18 }
  ];

  // Jami satr
  sheet1.addRow([]);
  const totalRow = sheet1.addRow(['', '', '', '', '💚 Tejaldi:', totalIncome - totalExpense]);
  totalRow.getCell(5).font = { bold: true, size: 12 };
  totalRow.getCell(6).font = { bold: true, size: 12, color: { argb: 'FF1565C0' } };
  totalRow.getCell(6).numFmt = '#,##0';

  const incRow = sheet1.addRow(['', '', '', '', '💰 Jami Daromad:', totalIncome]);
  incRow.getCell(6).numFmt = '#,##0';
  incRow.getCell(6).font = { color: { argb: 'FF2e7d32' }, bold: true };

  const expRow = sheet1.addRow(['', '', '', '', '💸 Jami Xarajat:', totalExpense]);
  expRow.getCell(6).numFmt = '#,##0';
  expRow.getCell(6).font = { color: { argb: 'FFc62828' }, bold: true };

  // ===== SHEET 2: Kategoriyalar =====
  const sheet2 = workbook.addWorksheet('Kategoriyalar');

  sheet2.mergeCells('A1:C1');
  const cat2Title = sheet2.getCell('A1');
  cat2Title.value = '📂 Kategoriyalar bo\'yicha xarajat';
  cat2Title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  cat2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a237e' } };
  cat2Title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet2.getRow(1).height = 30;

  sheet2.addRow([]);
  const catHeader = sheet2.addRow(['Kategoriya', 'Summa (so\'m)', 'Ulush (%)']);
  catHeader.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF283593' } };
    cell.alignment = { horizontal: 'center' };
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([cat, amt], i) => {
    const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0;
    const row = sheet2.addRow([cat, amt, `${pct}%`]);
    row.getCell(2).numFmt = '#,##0';
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).alignment = { horizontal: 'center' };
    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      });
    }
  });

  sheet2.columns = [{ width: 24 }, { width: 20 }, { width: 14 }];

  const filePath = path.join(TMP_DIR, `report_${userId}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

module.exports = { generateExcel };
