import React from 'react';
import { FiAlertTriangle, FiAlertOctagon } from 'react-icons/fi';

export default function BudgetAlert({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, idx) => {
        const isDanger = alert.level === 'danger';
        const Icon = isDanger ? FiAlertOctagon : FiAlertTriangle;
        return (
          <div
            key={idx}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
              isDanger
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300'
            }`}
          >
            <Icon size={18} className="shrink-0" />
            <span>{alert.message}</span>
          </div>
        );
      })}
    </div>
  );
}
