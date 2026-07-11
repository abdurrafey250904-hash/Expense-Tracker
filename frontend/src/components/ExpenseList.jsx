import React from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const CATEGORY_COLORS = {
  Food: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Transportation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Housing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Utilities: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  Entertainment: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  Healthcare: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Shopping: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  Education: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  Travel: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  Groceries: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Bills: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function ExpenseList({ expenses, currency, onEdit, onDelete }) {
  if (expenses.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-gray-400">
        No expenses found. Try adjusting your filters or add a new expense.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr
              key={exp._id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/30"
            >
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                {new Date(exp.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                {exp.title}
                {exp.notes && (
                  <p className="text-xs font-normal text-gray-400">{exp.notes}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Other
                  }`}
                >
                  {exp.category}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{exp.paymentMethod}</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                {currency} {exp.amount.toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => onEdit(exp)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-700"
                    title="Edit"
                  >
                    <FiEdit2 size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(exp)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                    title="Delete"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
