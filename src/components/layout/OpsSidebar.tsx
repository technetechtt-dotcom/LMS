import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderOpen,
  FileText,
  Mail,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Select } from '../ui/Select';
import { useOpsOrganisation } from '../../hooks/useOpsOrganisation';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard, end: true },
  { name: 'Users', path: '/users', icon: Users },
  { name: 'Organisations', path: '/organisations', icon: Building2 },
  { name: 'Programmes', path: '/programmes', icon: FolderOpen },
  { name: 'Materials', path: '/materials', icon: FileText },
  { name: 'Invitations', path: '/invitations', icon: Mail },
];

export function OpsSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    organisations,
    selectedOrgId,
    selectOrganisation,
    isPlatformAdmin,
    loading,
  } = useOpsOrganisation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-100 flex flex-col min-h-screen">
      <div className="p-5 border-b border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          SkillForge Ops
        </p>
        <h1 className="text-lg font-bold text-white mt-1">Backend Console</h1>
        <p className="text-xs text-slate-400 mt-1 truncate">{user?.email}</p>
      </div>

      {(isPlatformAdmin || organisations.length > 1) && (
        <div className="p-4 border-b border-slate-700">
          <label className="text-xs text-slate-400 block mb-1">
            Active organisation
          </label>
          <Select
            value={selectedOrgId}
            onChange={(e) => selectOrganisation(e.target.value)}
            disabled={loading || organisations.length === 0}
            className="bg-slate-800 border-slate-600 text-white text-sm"
            options={organisations.map((org) => ({
              value: org.id,
              label: org.name,
            }))}
          />
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-navy text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }>
            <item.icon size={18} />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700 space-y-1">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
