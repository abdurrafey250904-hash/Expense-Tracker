import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiMail, FiFileText } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CategoryPieChart from '../components/CategoryPieChart';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Reports() {
  const { user } = useAuth();
  const currency = user?.currency || 'USD';
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/reports/summary', { params: { year, month } });
        setSummary(data);
      } catch (err) {
        toast.error('Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, month]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/reports/export/pdf', {
        params: { year, month },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expense-report-${year}-${month}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await api.get('/reports/export/csv', {
        params: { year, month },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses-${year}-${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error('Failed to generate CSV');
    }
  };

  const handleEmailReport = async () => {
    setEmailing(true);
    try {
      const { data } = await api.post('/reports/email', { year, month });
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email. Check email config in .env');
    } finally {
      setEmailing(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Monthly Report</h1>
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {monthNames.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={handleDownloadPDF} disabled={downloading} className="btn-primary">
          <FiFileText size={16} /> {downloading ? 'Generating...' : 'Export PDF'}
        </button>
        <button onClick={handleDownloadCSV} className="btn-secondary">
          <FiDownload size={16} /> Export CSV
        </button>
        <button onClick={handleEmailReport} disabled={emailing} className="btn-secondary">
          <FiMail size={16} /> {emailing ? 'Sending...' : 'Email Me This Report'}
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {currency} {summary.grandTotal.toFixed(2)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {summary.transactionCount}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Budget Used</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {summary.budget ? `${summary.budgetPercentUsed}%` : 'No budget set'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CategoryPieChart categoryTotals={summary.categoryTotals} currency={currency} />
            <div className="card p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Category Breakdown
              </h3>
              <div className="space-y-2">
                {summary.categoryTotals.length === 0 && (
                  <p className="text-sm text-gray-400">No expenses for this period.</p>
                )}
                {summary.categoryTotals.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{c.category}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {currency} {c.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
