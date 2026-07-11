const cron = require('node-cron');
const User = require('../models/User');
const Expense = require('../models/Expense');
const { sendEmail } = require('./sendEmail');
const { generateMonthlyReportPDF } = require('./generatePDF');
const { PassThrough } = require('stream');

function monthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

async function sendReportToUser(user, year, month) {
  const { start, end } = monthRange(year, month);
  const expenses = await Expense.find({ user: user._id, date: { $gte: start, $lte: end } }).sort({
    date: -1,
  });

  if (expenses.length === 0) return; // nothing to report

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });
  const categoryTotals = Object.entries(categoryMap).map(([category, total]) => ({
    category,
    total,
  }));

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
  const currency = user.currency || 'USD';

  const chunks = [];
  const pass = new PassThrough();
  pass.on('data', (c) => chunks.push(c));

  await new Promise((resolve, reject) => {
    pass.on('end', resolve);
    pass.on('error', reject);
    generateMonthlyReportPDF(pass, {
      userName: user.name,
      month: monthLabel,
      currency,
      expenses,
      categoryTotals,
      grandTotal,
      budget: user.monthlyBudget,
    });
  });

  await sendEmail({
    to: user.email,
    subject: `Your ${monthLabel} Expense Report`,
    html: `<p>Hi ${user.name},</p><p>Your automated monthly report for <strong>${monthLabel}</strong> is attached. Total spent: <strong>${currency} ${grandTotal.toFixed(
      2
    )}</strong>.</p>`,
    attachments: [
      { filename: `expense-report-${year}-${month}.pdf`, content: Buffer.concat(chunks) },
    ],
  });

  console.log(`Monthly report emailed to ${user.email}`);
}

/**
 * Schedules a cron job (default: 8 AM on the 1st of every month) that emails
 * the previous month's report to every user who has emailReportsEnabled = true.
 */
function scheduleMonthlyReports() {
  const schedule = process.env.MONTHLY_REPORT_CRON || '0 8 1 * *';

  cron.schedule(schedule, async () => {
    console.log('Running monthly report email job...');
    const now = new Date();
    // Report for the month that just ended
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = prevMonthDate.getFullYear();
    const month = prevMonthDate.getMonth() + 1;

    const users = await User.find({ emailReportsEnabled: true });
    for (const user of users) {
      try {
        await sendReportToUser(user, year, month);
      } catch (err) {
        console.error(`Failed to email report to ${user.email}:`, err.message);
      }
    }
  });

  console.log(`Monthly report cron scheduled: "${schedule}"`);
}

module.exports = { scheduleMonthlyReports, sendReportToUser };
