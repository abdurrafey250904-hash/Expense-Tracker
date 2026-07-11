import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Mobile Wallet', 'Other'];

export default function ExpenseForm({ categories, initialData, onSubmit, onClose, submitting }) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: categories[0] || 'Other',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        amount: initialData.amount ?? '',
        category: initialData.category || categories[0] || 'Other',
        date: initialData.date
          ? new Date(initialData.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        paymentMethod: initialData.paymentMethod || 'Cash',
        notes: initialData.notes || '',
      });
    }
  }, [initialData, categories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, amount: parseFloat(form.amount) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {initialData ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              name="title"
              required
              className="input"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Grocery shopping"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="input"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                name="date"
                type="date"
                required
                className="input"
                value={form.date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select
                name="category"
                className="input"
                value={form.category}
                onChange={handleChange}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select
                name="paymentMethod"
                className="input"
                value={form.paymentMethod}
                onChange={handleChange}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              name="notes"
              className="input"
              rows={2}
              value={form.notes}
              onChange={handleChange}
              placeholder="Any additional details..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : initialData ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
