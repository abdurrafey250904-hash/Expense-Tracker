import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FiHome,
  FiList,
  FiPieChart,
  FiTarget,
  FiSettings,
  FiLogOut,
  FiSun,
  FiMoon,
  FiDollarSign,
} from 'react-icons/fi';

const links = [
  { to: '/', label: 'Dashboard', icon: FiHome },
  { to: '/expenses', label: 'Expenses', icon: FiList },
  { to: '/reports', label: 'Reports', icon: FiPieChart },
  { to: '/budget', label: 'Budget', icon: FiTarget },
  { to: '/settings', label: 'Settings', icon: FiSettings },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="card sticky top-0 z-20 mx-4 mt-4 flex items-center justify-between px-4 py-3 md:mx-6">
      <div className="flex items-center gap-2 font-bold text-primary-600">
        <FiDollarSign size={22} />
        <span className="hidden sm:inline">Expense Tracker</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`
            }
          >
            <Icon size={16} />
            <span className="hidden md:inline">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Toggle dark mode"
        >
          {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>
        <span className="hidden text-sm text-gray-600 dark:text-gray-300 lg:inline">
          {user?.name}
        </span>
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-900/30"
          title="Logout"
        >
          <FiLogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
