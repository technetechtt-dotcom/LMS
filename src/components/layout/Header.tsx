import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Bell,
  Search,
  Globe,
  Menu,
  Settings,
  LogOut,
  User
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { NotificationPanel } from './NotificationPanel';
import { GlobalSearch } from './GlobalSearch';
import { useAuth } from '../../contexts/AuthContext';
import { resolveLearnerProfilePath } from '../../utils/learnerNav';
import { Link, useNavigate } from 'react-router-dom';
import type { Notification as DomainNotification } from '../../types';
import { getStoredAccessToken } from '../../config/authStorage';
import { messagingService } from '../../services/api';

type PanelNotification = {
  id: string;
  type: 'assessment' | 'compliance' | 'system' | 'moderation';
  title: string;
  description: string;
  time: string;
  read: boolean;
};

function toPanelNotifications(
  rows: DomainNotification[]
): PanelNotification[] {
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    description: n.description,
    time: n.time,
    read: n.read,
    type:
    n.type === 'moderation' ?
    'moderation' :
    n.type === 'compliance' ?
    'compliance' :
    n.type === 'assessment' ?
    'assessment' :
    'system'
  }));
}

interface HeaderProps {
  onMenuToggle: () => void;
}
export function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout, linkedLearnerId, accessToken } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const reloadNotifications = useCallback(() => {
    if (!getStoredAccessToken()) {
      setNotifications([]);
      return;
    }
    messagingService
      .getNotifications()
      .then((res) => {
        if (res.success) setNotifications(toPanelNotifications(res.data));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    reloadNotifications();
  }, [reloadNotifications, accessToken]);

  const profileHref = (() => {
    if (!user) return '/settings';
    if (user.role === 'Learner') {
      return (
        resolveLearnerProfilePath(user, linkedLearnerId) ?? '/learner-dashboard'
      );
    }
    return linkedLearnerId ? `/learner/${linkedLearnerId}` : '/settings';
  })();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => messagingService.markRead(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
      notificationRef.current &&
      !notificationRef.current.contains(event.target as Node))
      {
        setIsNotificationsOpen(false);
      }
      if (
      userMenuRef.current &&
      !userMenuRef.current.contains(event.target as Node))
      {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  return (
    <>
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)} />
      

      <header className="bg-white border-b border-gray-200 h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-2 mr-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
            
            <Menu className="h-6 w-6" />
          </button>

          <div className="w-full max-w-xs lg:max-w-md hidden md:block">
            <div
              className="relative cursor-pointer"
              onClick={() => setIsSearchOpen(true)}>
              
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                readOnly
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-navy focus:border-brand-navy sm:text-sm transition duration-150 ease-in-out cursor-pointer"
                placeholder="Search (Cmd+K)..." />
              
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <button className="hidden sm:flex p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 items-center space-x-1">
            <Globe className="h-5 w-5" />
            <span className="text-sm font-medium text-gray-600">EN</span>
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 relative focus:outline-none">
              
              <Bell className="h-5 w-5" />
              {unreadCount > 0 &&
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              }
            </button>

            <NotificationPanel
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              notifications={notifications}
              onMarkAllRead={handleMarkAllRead} />
            
          </div>

          <div
            className="relative ml-2 pl-2 border-l border-gray-200"
            ref={userMenuRef}>
            
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 focus:outline-none">
              
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name ?? 'Signed in'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role ?? ''}
                </p>
              </div>
              <Avatar initials={user?.initials ?? '?'} size="md" />
            </button>

            {isUserMenuOpen &&
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                <Link
                to={profileHref}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                onClick={() => setIsUserMenuOpen(false)}>
                
                  <User className="mr-3 h-4 w-4 text-gray-400" />
                  Your Profile
                </Link>
                <Link
                to="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                onClick={() => setIsUserMenuOpen(false)}>
                
                  <Settings className="mr-3 h-4 w-4 text-gray-400" />
                  Settings
                </Link>
                <button
                type="button"
                onClick={async () => {
                  await logout();
                  setIsUserMenuOpen(false);
                  navigate('/login', { replace: true });
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                
                  <LogOut className="mr-3 h-4 w-4 text-gray-400" />
                  Sign out
                </button>
              </div>
            }
          </div>
        </div>
      </header>
    </>);

}
