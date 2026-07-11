const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMonthlySummary,
  getTrend,
  getBudgetAlerts,
  exportPDF,
  exportCSV,
  emailMonthlyReport,
} = require('../controllers/reportController');

router.use(protect);

router.get('/summary', getMonthlySummary);
router.get('/trend', getTrend);
router.get('/budget-alerts', getBudgetAlerts);
router.get('/export/pdf', exportPDF);
router.get('/export/csv', exportCSV);
router.post('/email', emailMonthlyReport);

module.exports = router;
