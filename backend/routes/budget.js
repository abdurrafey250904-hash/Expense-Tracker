const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getBudgets,
  upsertBudget,
  deleteBudget,
  setOverallBudget,
} = require('../controllers/budgetController');

router.use(protect);

router.get('/', getBudgets);
router.post('/', upsertBudget);
router.put('/overall', setOverallBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
