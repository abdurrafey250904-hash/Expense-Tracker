const PDFDocument = require('pdfkit');

/**
 * Streams a monthly expense report PDF directly to the given writable stream (e.g. res).
 * @param {import('stream').Writable} stream
 * @param {Object} data
 * @param {String} data.userName
 * @param {String} data.month - e.g. "July 2026"
 * @param {String} data.currency
 * @param {Array} data.expenses - list of { title, category, amount, date }
 * @param {Array} data.categoryTotals - list of { category, total }
 * @param {Number} data.grandTotal
 * @param {Number} data.budget - optional monthly budget
 */
function generateMonthlyReportPDF(stream, data) {
  const { userName, month, currency, expenses, categoryTotals, grandTotal, budget } = data;
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(stream);

  // Header
  doc
    .fontSize(20)
    .fillColor('#4f46e5')
    .text('Expense Tracker', { align: 'left' })
    .fontSize(10)
    .fillColor('#6b7280')
    .text('Monthly Expense Report', { align: 'left' });

  doc.moveDown(0.5);
  doc.strokeColor('#e5e7eb').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  doc.fontSize(12).fillColor('#111827');
  doc.text(`Name: ${userName}`);
  doc.text(`Period: ${month}`);
  doc.text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown(1);

  // Summary box
  doc.fontSize(14).fillColor('#111827').text('Summary', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#374151');
  doc.text(`Total Spent: ${currency} ${grandTotal.toFixed(2)}`);
  if (budget && budget > 0) {
    const pct = ((grandTotal / budget) * 100).toFixed(1);
    doc.text(`Monthly Budget: ${currency} ${budget.toFixed(2)}`);
    doc.text(`Budget Used: ${pct}%`);
    if (grandTotal > budget) {
      doc.fillColor('#dc2626').text(`Over budget by ${currency} ${(grandTotal - budget).toFixed(2)}`);
      doc.fillColor('#374151');
    }
  }
  doc.moveDown(1);

  // Category breakdown
  doc.fontSize(14).fillColor('#111827').text('Category Breakdown', { underline: true });
  doc.moveDown(0.3);
  categoryTotals.forEach((c) => {
    doc.fontSize(11).fillColor('#374151').text(`${c.category}: ${currency} ${c.total.toFixed(2)}`);
  });
  doc.moveDown(1);

  // Table header
  doc.fontSize(14).fillColor('#111827').text('Transactions', { underline: true });
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const colX = { date: 50, title: 130, category: 320, amount: 460 };

  doc.fontSize(10).fillColor('#6b7280');
  doc.text('Date', colX.date, tableTop);
  doc.text('Title', colX.title, tableTop);
  doc.text('Category', colX.category, tableTop);
  doc.text('Amount', colX.amount, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#e5e7eb').stroke();

  let y = tableTop + 22;
  doc.fontSize(10).fillColor('#111827');

  expenses.forEach((exp) => {
    if (y > 760) {
      doc.addPage();
      y = 50;
    }
    doc.text(new Date(exp.date).toLocaleDateString(), colX.date, y, { width: 75 });
    doc.text(exp.title, colX.title, y, { width: 180 });
    doc.text(exp.category, colX.category, y, { width: 130 });
    doc.text(`${currency} ${exp.amount.toFixed(2)}`, colX.amount, y, { width: 85 });
    y += 18;
  });

  doc.end();
}

module.exports = { generateMonthlyReportPDF };
