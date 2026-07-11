const Expense = require('../models/Expense');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/expenses
// Supports: page, limit, category, startDate, endDate, search, minAmount, maxAmount, sortBy, order
const getExpenses = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    startDate,
    endDate,
    search,
    minAmount,
    maxAmount,
    paymentMethod,
    sortBy = 'date',
    order = 'desc',
  } = req.query;

  const query = { user: req.user._id };

  if (category) query.category = category;
  if (paymentMethod) query.paymentMethod = paymentMethod;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  if (minAmount || maxAmount) {
    query.amount = {};
    if (minAmount) query.amount.$gte = Number(minAmount);
    if (maxAmount) query.amount.$lte = Number(maxAmount);
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  const sortOrder = order === 'asc' ? 1 : -1;
  const sortField = ['date', 'amount', 'title', 'category'].includes(sortBy) ? sortBy : 'date';

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const [expenses, total] = await Promise.all([
    Expense.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Expense.countDocuments(query),
  ]);

  res.json({
    expenses,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    },
  });
});

// @route  GET /api/expenses/:id
const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json({ expense });
});

// @route  POST /api/expenses
const createExpense = asyncHandler(async (req, res) => {
  const { title, amount, category, notes, date, paymentMethod } = req.body;

  if (!title || amount === undefined) {
    return res.status(400).json({ message: 'Title and amount are required' });
  }

  const expense = await Expense.create({
    user: req.user._id,
    title,
    amount,
    category,
    notes,
    date: date || Date.now(),
    paymentMethod,
  });

  res.status(201).json({ expense });
});

// @route  PUT /api/expenses/:id
const updateExpense = asyncHandler(async (req, res) => {
  let expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });

  const fields = ['title', 'amount', 'category', 'notes', 'date', 'paymentMethod'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) expense[f] = req.body[f];
  });

  await expense.save();
  res.json({ expense });
});

// @route  DELETE /api/expenses/:id
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json({ message: 'Expense deleted', id: req.params.id });
});

// @route  GET /api/expenses/meta/categories
const getCategories = asyncHandler(async (req, res) => {
  res.json({ categories: Expense.CATEGORIES });
});

module.exports = {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getCategories,
};
