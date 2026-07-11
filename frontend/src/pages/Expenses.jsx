import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiDownload, FiFilter } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';

const emptyFilters = {
  search: '',
  category: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: '',
  sortBy: 'date',
  order: 'desc',
};

export default function Expenses() {
  const { user } = useAuth();
  const currency = user?.currency || 'USD';

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/expenses/meta/categories').then(({ data }) => setCategories(data.categories));
  }, []);

  const fetchExpenses = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: 10, ...filters };
        Object.keys(params).forEach((k) => {
          if (params[k] === '') delete params[k];
        });
        const { data } = await api.get('/expenses', { params });
        setExpenses(data.expenses);
        setPagination(data.pagination);
      } catch (err) {
        toast.error('Failed to load expenses');
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchExpenses(1), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => setFilters(emptyFilters);

  const openAddForm = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const openEditForm = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense._id}`, formData);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', formData);
        toast.success('Expense added');
      }
      setShowForm(false);
      fetchExpenses(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete "${expense.title}"?`)) return;
    try {
      await api.delete(`/expenses/${expense._id}`);
      toast.success('Expense deleted');
      fetchExpenses(pagination.page);
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/reports/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'expenses.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exported');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Expenses</h1>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-secondary">
            <FiDownload size={16} /> Export CSV
          </button>
          <button onClick={openAddForm} className="btn-primary">
            <FiPlus size={16} /> Add Expense
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="search"
              className="input pl-9"
              placeholder="Search by title or notes..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          <select name="category" className="input w-auto" value={filters.category} onChange={handleFilterChange}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="btn-secondary"
          >
            <FiFilter size={16} /> More Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 dark:border-gray-700 md:grid-cols-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                name="startDate"
                className="input"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                name="endDate"
                className="input"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label className="label">Min Amount</label>
              <input
                type="number"
                name="minAmount"
                className="input"
                value={filters.minAmount}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label className="label">Max Amount</label>
              <input
                type="number"
                name="maxAmount"
                className="input"
                value={filters.maxAmount}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label className="label">Sort By</label>
              <select name="sortBy" className="input" value={filters.sortBy} onChange={handleFilterChange}>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="title">Title</option>
                <option value="category">Category</option>
              </select>
            </div>
            <div>
              <label className="label">Order</label>
              <select name="order" className="input" value={filters.order} onChange={handleFilterChange}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={resetFilters} className="btn-secondary w-full">
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <ExpenseList
            expenses={expenses}
            currency={currency}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchExpenses(pagination.page - 1)}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchExpenses(pagination.page + 1)}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <ExpenseForm
          categories={categories}
          initialData={editingExpense}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
