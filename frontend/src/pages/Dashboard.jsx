import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatsCards from '../components/StatsCards';
import BudgetAlert from '../components/BudgetAlert';
import ExpenseChart from '../components/ExpenseChart';
import CategoryPieChart from '../components/CategoryPieChart';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const currency = user?.currency || 'USD';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [summaryRes, trendRes, alertsRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/reports/trend?months=6'),
          api.get('/reports/budget-alerts'),
        ]);
        setSummary(summaryRes.data);
        setTrend(trendRes.data.trend);
        setAlerts(alertsRes.data.alerts);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Here's what's happening with your money this month.
        </p>
      </div>

      <BudgetAlert alerts={alerts} />

      <StatsCards summary={summary} currency={currency} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExpenseChart trend={trend} currency={currency} />
        <CategoryPieChart categoryTotals={summary?.categoryTotals || []} currency={currency} />
      </div>
    </div>
  );
}
