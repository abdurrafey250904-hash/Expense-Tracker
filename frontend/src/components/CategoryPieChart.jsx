import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#84cc16',
  '#06b6d4',
  '#a855f7',
];

export default function CategoryPieChart({ categoryTotals = [], currency }) {
  const { darkMode } = useTheme();
  const textColor = darkMode ? '#d1d5db' : '#374151';

  const data = {
    labels: categoryTotals.map((c) => c.category),
    datasets: [
      {
        data: categoryTotals.map((c) => c.total),
        backgroundColor: COLORS,
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: textColor, boxWidth: 12, padding: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${currency} ${ctx.parsed.toFixed(2)}`,
        },
      },
    },
  };

  if (categoryTotals.length === 0) {
    return (
      <div className="card flex h-72 items-center justify-center p-5 text-sm text-gray-400">
        No expense data for this period yet.
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
        Spending by Category
      </h3>
      <div style={{ height: 280 }}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
