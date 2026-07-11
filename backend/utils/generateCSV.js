/**
 * Converts an array of expense objects into a CSV string.
 * Handles escaping of commas, quotes, and newlines.
 */
function escapeCsvField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateExpensesCSV(expenses) {
  const headers = ['Date', 'Title', 'Category', 'Amount', 'Payment Method', 'Notes'];
  const rows = expenses.map((e) =>
    [
      new Date(e.date).toISOString().split('T')[0],
      e.title,
      e.category,
      e.amount,
      e.paymentMethod || '',
      e.notes || '',
    ]
      .map(escapeCsvField)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

module.exports = { generateExpensesCSV };
