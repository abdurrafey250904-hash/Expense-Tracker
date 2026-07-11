import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiSave, FiLock, FiSun, FiMoon } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AUD', 'CAD', 'JPY', 'AED', 'SAR'];

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    currency: user?.currency || 'USD',
    emailReportsEnabled: user?.emailReportsEnabled ?? true,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/me', profile);
      updateUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', passwordForm);
      toast.success('Password updated');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Profile</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              name="name"
              className="input"
              value={profile.name}
              onChange={handleProfileChange}
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <select
              name="currency"
              className="input"
              value={profile.currency}
              onChange={handleProfileChange}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              name="emailReportsEnabled"
              checked={profile.emailReportsEnabled}
              onChange={handleProfileChange}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Send me an automated monthly report email
          </label>
          <button type="submit" disabled={savingProfile} className="btn-primary">
            <FiSave size={16} /> {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Appearance</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            {darkMode ? <FiMoon size={18} /> : <FiSun size={18} />}
            Dark Mode
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              darkMode ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <FiLock size={16} /> Change Password
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              required
              className="input"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={6}
              className="input"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
            />
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
