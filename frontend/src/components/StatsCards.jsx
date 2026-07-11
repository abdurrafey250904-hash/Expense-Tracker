import React from 'react';
import { FiTrendingUp, FiTarget, FiHash, FiPercent } from 'react-icons/fi';

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`rounded-lg p-3 ${accent}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

export default function StatsCards({ summary, currency }) {
  if (!summary) return null;

  const {
    grandTotal = 0,
    transactionCount = 0,
    budget,
    budgetRemaining,
    budgetPercentUsed,
  } = summary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={FiTrendingUp}
        label="Total Spent This Month"
        value={`${currency} ${grandTotal.toFixed(2)}`}
        accent="bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
      />
      <StatCard
        icon={FiHash}
        label="Transactions"
        value={transactionCount}
        accent="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      />
      <StatCard
        icon={FiTarget}
        label="Budget Remaining"
        value={budget ? `${currency} ${budgetRemaining.toFixed(2)}` : 'No budget set'}
        accent="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
      />
      <StatCard
        icon={FiPercent}
        label="Budget Used"
        value={budget ? `${budgetPercentUsed}%` : '—'}
        accent="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      />
    </div>
  );
}
