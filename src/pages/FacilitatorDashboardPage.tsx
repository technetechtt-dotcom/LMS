import React from 'react';
import {
  Users,
  FileCheck,
  TrendingUp,
  ShieldCheck,
  Plus,
  Upload,
  FileText,
  MessageSquare,
  Bot } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { FACILITATOR_ROLE_LABELS } from '../utils/facilitatorRoles';

export function FacilitatorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const facilitatorRoleLabel =
    user?.role === 'Facilitator' && user.facilitatorRole
      ? FACILITATOR_ROLE_LABELS[user.facilitatorRole]
      : null;
  const stats = [
  {
    label: 'Active Learners',
    value: '247',
    icon: <Users className="h-5 w-5 text-gray-500" />,
    trend: '+12% from last month',
    trendColor: 'text-green-600'
  },
  {
    label: 'Pending Assessments',
    value: '18',
    icon: <FileCheck className="h-5 w-5 text-gray-500" />,
    trend: 'Urgent  Due this week',
    trendColor: 'text-amber-600'
  },
  {
    label: 'Course Completion',
    value: '78%',
    icon: <TrendingUp className="h-5 w-5 text-gray-500" />,
    trend: '+5% from last week',
    trendColor: 'text-green-600'
  },
  {
    label: 'SETA Compliance',
    value: '94%',
    icon: <ShieldCheck className="h-5 w-5 text-gray-500" />,
    trend: 'On track  All documents up to date',
    trendColor: 'text-green-600'
  }];

  const activities = [
  {
    name: 'Thandi Mokoena',
    action: 'submitted assessment',
    detail: 'IT Skills Program - Module 3 Assessment',
    time: '2 hours ago',
    status: 'Pending Review',
    statusVariant: 'warning' as const
  },
  {
    name: 'Michael Ndaba',
    action: 'completed module',
    detail: 'Business Administration - Communication Skills',
    time: '4 hours ago',
    status: 'Completed',
    statusVariant: 'success' as const
  },
  {
    name: 'Nomsa Khumalo',
    action: 'needs assistance',
    detail: 'Workplace Safety - Risk Assessment',
    time: '6 hours ago',
    status: 'Help Needed',
    statusVariant: 'danger' as const
  }];

  const quickActions = [
  {
    icon: <Plus className="h-5 w-5" />,
    label: 'Create Assessment',
    desc: 'Design new assessment tasks',
    action: () => navigate('/facilitator-assessments')
  },
  {
    icon: <Upload className="h-5 w-5" />,
    label: 'Upload Materials',
    desc: 'Add training resources',
    action: () => navigate('/facilitator-training-materials')
  },
  {
    icon: <FileText className="h-5 w-5" />,
    label: 'SETA Report',
    desc: 'Generate compliance report',
    action: () => navigate('/facilitator-seta-compliance')
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    label: 'Message Learners',
    desc: 'Send announcements',
    action: () => navigate('/facilitator-communication')
  }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Facilitator Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Welcome back, {user?.name ?? 'Facilitator'}
          {facilitatorRoleLabel ? ` · ${facilitatorRoleLabel}` : ''}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) =>
        <div
          key={i}
          className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded-full">{stat.icon}</div>
            </div>
            <p className={`text-xs ${stat.trendColor}`}>{stat.trend}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Activities"
            action={
            <button
              onClick={() => navigate('/facilitator-communication')}
              className="text-sm text-brand-blue hover:underline">
              
                View all
              </button>
            }>
            
            <div className="space-y-0 -mx-6">
              {activities.map((activity, i) =>
              <div
                key={i}
                className="flex items-start justify-between px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  if (activity.status === 'Pending Review')
                  navigate('/facilitator-assessments');else
                  if (activity.status === 'Help Needed')
                  navigate('/facilitator-communication');else
                  navigate('/facilitator-learners');
                }}>
                
                  <div className="flex items-start">
                    <Avatar
                    name={activity.name}
                    className="h-10 w-10 mr-3 flex-shrink-0" />
                  
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.name}</span>{' '}
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.detail}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={activity.statusVariant}>
                      {activity.status}
                    </Badge>
                    {activity.status === 'Pending Review' &&
                  <Bot className="h-4 w-4 text-gray-400" />
                  }
                    {activity.status === 'Help Needed' &&
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  }
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card title="Quick Actions">
            <div className="space-y-3">
              {quickActions.map((action, i) =>
              <button
                key={i}
                onClick={action.action}
                className="w-full flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-brand-navy hover:bg-gray-100 transition-all text-left">
                
                  <div className="p-2 bg-white rounded-md mr-3 text-gray-600">
                    {action.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500">{action.desc}</p>
                  </div>
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>);

}