import React, { useEffect, useState } from 'react';
import {
  Save,
  Database,
  PenTool,
  Upload } from
'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { Select } from '../components/ui/Select';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { api, auditService, authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type AuditLogRow = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
  status: string;
};

type NlrdRecordRow = {
  id: number;
  name: string;
  idNo: string;
  type: string;
  status: string;
};

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [nlrdLoading, setNlrdLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.name) setProfileName(user.name);
    if (user?.email) setProfileEmail(user.email);
  }, [user?.name, user?.email]);

  useEffect(() => {
    auditService.list(100).then((rows) => {
      setLogs(
        (rows as Array<Record<string, unknown>>).map((r, i) => ({
          id: String(r.id ?? i),
          timestamp: String(r.at ?? r.timestamp ?? '—'),
          user: String(r.userName ?? r.user ?? 'System'),
          action: String(r.action ?? '—'),
          ip: String(r.ip ?? '—'),
          status: String(r.status ?? 'Success'),
        })),
      );
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parts = profileName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ') || firstName;
    if (!firstName || !profileEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSavingProfile(true);
    try {
      await authService.updateProfile({
        firstName,
        lastName,
        email: profileEmail.trim(),
      });
      await auditService.log(
        'PROFILE_UPDATE',
        'user',
        user?.id ?? 'self',
        `Profile saved for ${profileEmail}`,
      );
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Could not save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Could not update password — check your current password');
    } finally {
      setSavingPassword(false);
    }
  };
  const handleNLRDSubmit = async () => {
    setNlrdLoading(true);
    try {
      await api.nlrd.submit({});
      toast.success('NLRD Batch Submitted Successfully');
    } catch (e) {
      toast.error('Submission Failed');
    } finally {
      setNlrdLoading(false);
    }
  };
  const logColumns = [
  {
    header: 'Timestamp',
    accessorKey: 'timestamp' as const
  },
  {
    header: 'User',
    accessorKey: 'user' as const
  },
  {
    header: 'Action',
    accessorKey: 'action' as const
  },
  {
    header: 'IP Address',
    accessorKey: 'ip' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: AuditLogRow) =>
    <Badge
      variant={
      row.status === 'Success' ?
      'success' :
      row.status === 'Failed' ?
      'danger' :
      'warning'
      }>
      
          {row.status}
        </Badge>

  }];

  const nlrdRecords = [
  {
    id: 1,
    name: 'Thabo Mbeki',
    idNo: '9501015890089',
    type: 'Registration',
    status: 'Ready'
  },
  {
    id: 2,
    name: 'Lerato Kganyago',
    idNo: '9605120000000',
    type: 'Registration',
    status: 'Ready'
  },
  {
    id: 3,
    name: 'Sipho Nkosi',
    idNo: '9402025000000',
    type: 'Achievement',
    status: 'Validation Error'
  }];

  const nlrdColumns = [
  {
    header: 'Learner',
    accessorKey: 'name' as const
  },
  {
    header: 'ID Number',
    accessorKey: 'idNo' as const
  },
  {
    header: 'Type',
    accessorKey: 'type' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: NlrdRecordRow) =>
    <Badge variant={row.status === 'Ready' ? 'success' : 'danger'}>
          {row.status}
        </Badge>

  }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your account preferences and system configuration.
        </p>
      </div>

      <Tabs
        tabs={[
        {
          id: 'profile',
          label: 'Profile'
        },
        {
          id: 'security',
          label: 'Security'
        },
        {
          id: 'notifications',
          label: 'Notifications'
        },
        {
          id: 'logs',
          label: 'Access Logs'
        },
        {
          id: 'nlrd',
          label: 'NLRD'
        },
        {
          id: 'system',
          label: 'System'
        }]
        }
        activeTab={activeTab}
        onChange={setActiveTab} />
      

      <div className="max-w-4xl">
        {activeTab === 'profile' &&
        <Card title="Personal Information">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center space-x-6 mb-6">
                <div className="h-24 w-24 rounded-full bg-brand-navy flex items-center justify-center text-3xl font-bold text-white">
                  {(profileName || 'U').slice(0, 2).toUpperCase()}
                </div>
                <Button variant="outline" size="sm">
                  Change Avatar
                </Button>
              </div>

              {/* Digital Signature Section */}
              <div className="pt-6 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3">
                  Digital Signature
                </h4>
                <div className="border-2 border-dashed border-gray-300 rounded-lg w-[200px] h-[100px] flex items-center justify-center bg-gray-50 mb-3">
                  <span className="text-sm text-gray-400 italic">
                    No signature uploaded
                  </span>
                </div>
                <div className="flex space-x-3 mb-2">
                  <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Upload className="h-4 w-4" />}
                  disabled
                  title="Signature upload is not configured in this release">
                  
                    Upload Signature
                  </Button>
                  <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<PenTool className="h-4 w-4" />}
                  disabled
                  title="Signature pad is not configured in this release">
                  
                    Draw Signature
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Your digital signature will be used for signing documents,
                  assessments, and compliance forms.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                />
                <Input label="Phone Number" placeholder="Optional" disabled />
              </div>

              <Input label="Job Title" placeholder="Optional" disabled />
              <Input
                label="Organisation"
                value={user?.organisation ?? ''}
                disabled />
            

              <div className="flex justify-end pt-4">
                <Button type="submit" leftIcon={<Save className="h-4 w-4" />} disabled={savingProfile}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        }

        {activeTab === 'security' &&
        <div className="space-y-6">
            <Card title="Change Password">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={savingPassword}>
                    Update Password
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        }

        {activeTab === 'notifications' &&
        <Card title="Notification Preferences">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Email Notifications
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-navy rounded border-gray-300"
                    defaultChecked />
                  
                    <span className="text-sm text-gray-700">
                      Assessment submissions
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-navy rounded border-gray-300"
                    defaultChecked />
                  
                    <span className="text-sm text-gray-700">
                      Compliance alerts
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-navy rounded border-gray-300" />
                  
                    <span className="text-sm text-gray-700">
                      Marketing updates
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-4">
                  SMS Notifications
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-navy rounded border-gray-300"
                    defaultChecked />
                  
                    <span className="text-sm text-gray-700">
                      Security alerts
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-navy rounded border-gray-300" />
                  
                    <span className="text-sm text-gray-700">
                      Urgent compliance issues
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit">Save Preferences</Button>
              </div>
            </form>
          </Card>
        }

        {activeTab === 'logs' &&
        <Card title="System Access Logs" noPadding>
            <div className="p-4 border-b border-gray-200 flex space-x-4">
              <Input type="date" className="max-w-xs" />
              <Input type="date" className="max-w-xs" />
              <Button variant="outline">Export Logs</Button>
            </div>
            <DataTable data={logs} columns={logColumns} keyField="id" />
          </Card>
        }

        {activeTab === 'nlrd' &&
        <div className="space-y-6">
            <Card title="NLRD Batch Submission">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Select
                label="Programme"
                options={[
                {
                  value: '1',
                  label: 'NC: Systems Development'
                }]
                } />
              
                <Select
                label="Submission Type"
                options={[
                {
                  value: 'reg',
                  label: 'Learner Registration'
                },
                {
                  value: 'ach',
                  label: 'Learner Achievement'
                }]
                } />
              
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Batch Preview
                </h4>
                <DataTable
                data={nlrdRecords}
                columns={nlrdColumns}
                keyField="id"
                pagination={false} />
              
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline">Validate Batch</Button>
                <Button
                onClick={handleNLRDSubmit}
                isLoading={nlrdLoading}
                leftIcon={<Database className="h-4 w-4" />}>
                
                  Submit to NLRD
                </Button>
              </div>
            </Card>

            <Card title="Submission History" noPadding>
              <div className="p-6 text-center text-gray-500 text-sm">
                No previous submissions found.
              </div>
            </Card>
          </div>
        }

        {activeTab === 'system' &&
        <Card title="System Preferences">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                label="Language"
                options={[
                {
                  value: 'en',
                  label: 'English'
                },
                {
                  value: 'af',
                  label: 'Afrikaans'
                },
                {
                  value: 'zu',
                  label: 'isiZulu'
                }]
                } />
              
                <Select
                label="Timezone"
                options={[
                {
                  value: 'sa',
                  label: '(GMT+02:00) South Africa Standard Time'
                }]
                } />
              
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">
                  Data Management
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  Download a copy of your personal data as required by POPIA.
                </p>
                <Button variant="outline">Request Data Export</Button>
              </div>
            </form>
          </Card>
        }
      </div>
    </div>);

}