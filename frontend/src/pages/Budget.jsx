import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiTrash2, FiSave } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Budget() {
  const { user, updateUser } = useAuth();
  const currency = user?.currency || 'USD';

  const [overallBudget, setOverallBudget] = useState(user?.monthlyBudget || 0);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        api.get('/budget'),
        api.get('/expenses/meta/categories'),
      ]);
      setBudgets(budgetsRes.data.budgets);
      setOverallBudget(budgetsRes.data.overallBudget || 0);
      setCategories(categoriesRes.data.categories);
      setNewCategory((prev) => prev || categoriesRes.data.categories[0]);
    } catch (err) {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveOverall = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/budget/overall', { monthlyBudget: Number(overallBudget) });
      updateUser({ monthlyBudget: data.monthlyBudget });
      toast.success('Overall budget updated');
    } catch (err) {
      toast.error('Failed to update overall budget');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!newCategory || !newLimit) return;
    try {
      await api.post('/budget', { category: newCategory, monthlyLimit: Number(newLimit) });
      toast.success('Category budget saved');
      setNewLimit('');
      load();
    } catch (err) {
      toast.error('Failed to save category budget');
    }
  };

  const handleDeleteBudget = async (id) => {
    try {
      await api.delete(`/budget/${id}`);
      toast.success('Budget removed');
      load();
    } catch (err) {
      toast.error('Failed to remove budget');
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Budget Settings</h1>

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
          Overall Monthly Budget
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          You'll get an alert when you reach 80% and 100% of this amount.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            className="input"
            value={overallBudget}
            onChange={(e) => setOverallBudget(e.target.value)}
            placeholder="e.g. 2000"
          />
          <button onClick={handleSaveOverall} disabled={saving} className="btn-primary shrink-0">
            <FiSave size={16} /> Save
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">Currency: {currency}</p>
      </div>

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
          Per-Category Budgets
        </h2>

        <form onSubmit={handleAddBudget} className="mb-4 flex flex-wrap gap-2">
          <select
            className="input w-auto"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            className="input w-32"
            placeholder="Limit"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
          />
          <button type="submit" className="btn-secondary">
            Set Budget
          </button>
        </form>

        <div className="space-y-2">
          {budgets.length === 0 && (
            <p className="text-sm text-gray-400">No category budgets set yet.</p>
          )}
          {budgets.map((b) => (
            <div
              key={b._id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2 dark:border-gray-700"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {b.category}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {currency} {b.monthlyLimit.toFixed(2)} / month
                </span>
                <button
                  onClick={() => handleDeleteBudget(b._id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                >
                  <FiTrash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
