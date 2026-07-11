const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { generateMonthlyReportPDF } = require('../utils/generatePDF');
const { generateExpensesCSV } = require('../utils/generateCSV');
const { sendEmail } = require('../utils/sendEmail');

// Helper: get start/end of a given month (1-indexed) & year
function monthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function currentYearMonth(query) {
  const now = new Date();
  const year = parseInt(query.year) || now.getFullYear();
  const month = parseInt(query.month) || now.getMonth() + 1;
  return { year, month };
}

async function buildMonthlyReportData(userId, year, month) {
  const { start, end } = monthRange(year, month);

  const expenses = await Expense.find({
    user: userId,
    date: { $gte: start, $lte: end },
  }).sort({ date: -1 });

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });
  const categoryTotals = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return { expenses, grandTotal, categoryTotals, start, end };
}

// @route GET /api/reports/summary?year=&month=
// Overall stats for dashboard + monthly report page
const getMonthlySummary = asyncHandler(async (req, res) => {
  const { year, month } = currentYearMonth(req.query);
  const { expenses, grandTotal, categoryTotals } = await buildMonthlyReportData(
    req.user._id,
    year,
    month
  );

  const dailyMap = {};
  expenses.forEach((e) => {
    const day = new Date(e.date).toISOString().split('T')[0];
    dailyMap[day] = (dailyMap[day] || 0) + e.amount;
  });
  const dailyTotals = Object.entries(dailyMap)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  res.json({
    year,
    month,
    grandTotal,
    transactionCount: expenses.length,
    categoryTotals,
    dailyTotals,
    budget: req.user.monthlyBudget,
    budgetRemaining: req.user.monthlyBudget ? req.user.monthlyBudget - grandTotal : null,
    budgetPercentUsed: req.user.monthlyBudget
      ? Math.round((grandTotal / req.user.monthlyBudget) * 100)
      : null,
  });
});

// @route GET /api/reports/trend?months=6
// Last N months totals, for trend line chart
const getTrend = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(1, parseInt(req.query.months) || 6));
  const now = new Date();
  const results = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const { start, end } = monthRange(year, month);

    const agg = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    results.push({
      year,
      month,
      label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
      total: agg[0]?.total || 0,
    });
  }

  res.json({ trend: results });
});

// @route GET /api/reports/budget-alerts
// Checks overall budget + per-category budgets against current month spend
const getBudgetAlerts = asyncHandler(async (req, res) => {
  const { year, month } = currentYearMonth(req.query);
  const { grandTotal, categoryTotals } = await buildMonthlyReportData(req.user._id, year, month);

  const alerts = [];

  if (req.user.monthlyBudget > 0) {
    const pct = (grandTotal / req.user.monthlyBudget) * 100;
    if (pct >= 100) {
      alerts.push({
        type: 'overall',
        level: 'danger',
        message: `You've exceeded your overall monthly budget (${pct.toFixed(0)}% used).`,
      });
    } else if (pct >= 80) {
      alerts.push({
        type: 'overall',
        level: 'warning',
        message: `You've used ${pct.toFixed(0)}% of your overall monthly budget.`,
      });
    }
  }

  const budgets = await Budget.find({ user: req.user._id });
  budgets.forEach((b) => {
    const spent = categoryTotals.find((c) => c.category === b.category)?.total || 0;
    if (b.monthlyLimit <= 0) return;
    const pct = (spent / b.monthlyLimit) * 100;
    if (pct >= 100) {
      alerts.push({
        type: 'category',
        category: b.category,
        level: 'danger',
        message: `${b.category}: exceeded budget (${pct.toFixed(0)}% used).`,
      });
    } else if (pct >= 80) {
      alerts.push({
        type: 'category',
        category: b.category,
        level: 'warning',
        message: `${b.category}: ${pct.toFixed(0)}% of budget used.`,
      });
    }
  });

  res.json({ alerts });
});

// @route GET /api/reports/export/pdf?year=&month=
const exportPDF = asyncHandler(async (req, res) => {
  const { year, month } = currentYearMonth(req.query);
  const { expenses, grandTotal, categoryTotals } = await buildMonthlyReportData(
    req.user._id,
    year,
    month
  );

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="expense-report-${year}-${month}.pdf"`
  );

  generateMonthlyReportPDF(res, {
    userName: req.user.name,
    month: monthLabel,
    currency: req.user.currency || 'USD',
    expenses,
    categoryTotals,
    grandTotal,
    budget: req.user.monthlyBudget,
  });
});

// @route GET /api/reports/export/csv?year=&month=  (omit year/month to export ALL expenses)
const exportCSV = asyncHandler(async (req, res) => {
  let expenses;
  let filename = 'expenses.csv';

  if (req.query.year && req.query.month) {
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);
    const data = await buildMonthlyReportData(req.user._id, year, month);
    expenses = data.expenses;
    filename = `expenses-${year}-${month}.csv`;
  } else {
    expenses = await Expense.find({ user: req.user._id }).sort({ date: -1 });
  }

  const csv = generateExpensesCSV(expenses);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// @route POST /api/reports/email
// Sends the current (or specified) month's report to the logged-in user's email immediately
const emailMonthlyReport = asyncHandler(async (req, res) => {
  const { year, month } = currentYearMonth(req.body);
  const { expenses, grandTotal, categoryTotals } = await buildMonthlyReportData(
    req.user._id,
    year,
    month
  );

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const currency = req.user.currency || 'USD';

  const rows = categoryTotals
    .map(
      (c) =>
        `<tr><td style="padding:4px 8px;">${c.category}</td><td style="padding:4px 8px;">${currency} ${c.total.toFixed(
          2
        )}</td></tr>`
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2 style="color:#4f46e5;">Your ${monthLabel} Expense Report</h2>
      <p>Hi ${req.user.name},</p>
      <p>Here's a summary of your spending for <strong>${monthLabel}</strong>:</p>
      <p style="font-size:18px;"><strong>Total spent: ${currency} ${grandTotal.toFixed(2)}</strong></p>
      <table style="border-collapse:collapse; width:100%;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:4px 8px; text-align:left;">Category</th>
            <th style="padding:4px 8px; text-align:left;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px; color:#6b7280; font-size:12px;">This report was generated automatically by Expense Tracker.</p>
    </div>
  `;

  // Build PDF into a buffer for attachment
  const chunks = [];
  const { PassThrough } = require('stream');
  const pass = new PassThrough();
  pass.on('data', (chunk) => chunks.push(chunk));

  await new Promise((resolve, reject) => {
    pass.on('end', resolve);
    pass.on('error', reject);
    generateMonthlyReportPDF(pass, {
      userName: req.user.name,
      month: monthLabel,
      currency,
      expenses,
      categoryTotals,
      grandTotal,
      budget: req.user.monthlyBudget,
    });
  });

  await sendEmail({
    to: req.user.email,
    subject: `Your ${monthLabel} Expense Report`,
    html,
    attachments: [
      {
        filename: `expense-report-${year}-${month}.pdf`,
        content: Buffer.concat(chunks),
      },
    ],
  });

  res.json({ message: `Report emailed to ${req.user.email}` });
});

module.exports = {
  getMonthlySummary,
  getTrend,
  getBudgetAlerts,
  exportPDF,
  exportCSV,
  emailMonthlyReport,
};
