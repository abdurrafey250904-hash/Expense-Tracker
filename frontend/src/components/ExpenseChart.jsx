import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function ExpenseChart({ trend = [], currency }) {
  const { darkMode } = useTheme();
  const gridColor = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textColor = darkMode ? '#d1d5db' : '#374151';

  const data = {
    labels: trend.map((t) => t.label),
    datasets: [
      {
        label: `Spending (${currency})`,
        data: trend.map((t) => t.total),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#6366f1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${currency} ${ctx.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor } },
    },
  };

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
        Spending Trend
      </h3>
      <div style={{ height: 280 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
