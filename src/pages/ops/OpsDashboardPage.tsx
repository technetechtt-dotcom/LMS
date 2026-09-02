import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  FolderOpen,
  FileText,
  Mail,
  GraduationCap,
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { Card } from '../../components/ui/Card';
import { opsService } from '../../services/api';
import { useOpsOrganisation } from '../../hooks/useOpsOrganisation';

export function OpsDashboardPage() {
  const { selectedOrg, isPlatformAdmin } = useOpsOrganisation();
  const [stats, setStats] = useState({
    organisations: 0,
    users: 0,
    programmes: 0,
    materials: 0,
    pendingInvitations: 0,
    activeEnrollments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await opsService.overview();
        if (!cancelled && res.data) setStats(res.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOrg?.id]);

  const quickLinks = [
    { label: 'Manage users', path: '/users', icon: Users },
    { label: 'Organisations', path: '/organisations', icon: Building2 },
    { label: 'Programmes', path: '/programmes', icon: FolderOpen },
    { label: 'Learning materials', path: '/materials', icon: FileText },
    { label: 'Pending invitations', path: '/invitations', icon: Mail },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ops Overview</h1>
        <p className="text-gray-500 mt-1">
          {isPlatformAdmin
            ? 'Platform-wide LMS administration'
            : `Managing ${selectedOrg?.name ?? 'organisation'}`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-28 bg-white rounded-lg border border-gray-200 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isPlatformAdmin && (
            <StatCard
              title="Organisations"
              value={stats.organisations}
              icon={<Building2 size={24} />}
            />
          )}
          <StatCard
            title="Users"
            value={stats.users}
            icon={<Users size={24} />}
          />
          <StatCard
            title="Programmes"
            value={stats.programmes}
            icon={<FolderOpen size={24} />}
          />
          <StatCard
            title="Materials"
            value={stats.materials}
            icon={<FileText size={24} />}
          />
          <StatCard
            title="Active enrollments"
            value={stats.activeEnrollments}
            icon={<GraduationCap size={24} />}
          />
          <StatCard
            title="Pending invitations"
            value={stats.pendingInvitations}
            icon={<Mail size={24} />}
          />
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-white hover:border-brand-navy hover:shadow-sm transition-all">
              <link.icon className="text-brand-navy" size={20} />
              <span className="font-medium text-gray-800">{link.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
