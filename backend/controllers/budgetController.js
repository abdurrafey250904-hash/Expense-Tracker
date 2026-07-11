const Budget = require('../models/Budget');
const asyncHandler = require('../utils/asyncHandler');

// @route GET /api/budget
const getBudgets = asyncHandler(async (req, res) => {
  const budgets = await Budget.find({ user: req.user._id }).sort({ category: 1 });
  res.json({ budgets, overallBudget: req.user.monthlyBudget });
});

// @route POST /api/budget  { category, monthlyLimit }
const upsertBudget = asyncHandler(async (req, res) => {
  const { category, monthlyLimit } = req.body;
  if (!category || monthlyLimit === undefined) {
    return res.status(400).json({ message: 'category and monthlyLimit are required' });
  }

  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, category },
    { monthlyLimit },
    { new: true, upsert: true, runValidators: true }
  );

  res.json({ budget });
});

// @route DELETE /api/budget/:id
const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  res.json({ message: 'Budget removed', id: req.params.id });
});

// @route PUT /api/budget/overall  { monthlyBudget }
const setOverallBudget = asyncHandler(async (req, res) => {
  const { monthlyBudget } = req.body;
  if (monthlyBudget === undefined || monthlyBudget < 0) {
    return res.status(400).json({ message: 'A valid monthlyBudget is required' });
  }
  req.user.monthlyBudget = monthlyBudget;
  await req.user.save();
  res.json({ monthlyBudget: req.user.monthlyBudget });
});

module.exports = { getBudgets, upsertBudget, deleteBudget, setOverallBudget };
