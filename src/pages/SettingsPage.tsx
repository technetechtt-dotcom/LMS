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
import { api, auditService, authService, complianceService, privacyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { downloadJson } from '../utils/downloadJson';

type UserPrefs = {
  notifyAssessment: boolean;
  notifyCompliance: boolean;
  notifyMarketing: boolean;
  notifySmsSecurity: boolean;
  notifySmsUrgent: boolean;
  language: string;
  timezone: string;
};

const DEFAULT_PREFS: UserPrefs = {
  notifyAssessment: true,
  notifyCompliance: true,
  notifyMarketing: false,
  notifySmsSecurity: true,
  notifySmsUrgent: false,
  language: 'en',
  timezone: 'sa',
};

type AuditLogRow = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
  status: string;
};

type NlrdRecordRow = {
  id: string;
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
  const [profilePhone, setProfilePhone] = useState(user?.phone ?? '');
  const [profileJobTitle, setProfileJobTitle] = useState(user?.jobTitle ?? '');
  const [hasSignature, setHasSignature] = useState(Boolean(user?.hasSignature));
  const signatureInputRef = React.useRef<HTMLInputElement>(null);
  const drawCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(Boolean(user?.mfaEnabled));
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaPassword, setMfaPassword] = useState('');
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [logFrom, setLogFrom] = useState('');
  const [logTo, setLogTo] = useState('');

  useEffect(() => {
    if (user?.name) setProfileName(user.name);
    if (user?.email) setProfileEmail(user.email);
    if (user?.phone) setProfilePhone(user.phone);
    if (user?.jobTitle) setProfileJobTitle(user.jobTitle);
    if (user?.hasSignature) setHasSignature(true);
  }, [user?.name, user?.email, user?.phone, user?.jobTitle, user?.hasSignature]);

  useEffect(() => {
    if (!user?.id) return;
    authService
      .getPreferences<UserPrefs>()
      .then((res) => setPrefs({ ...DEFAULT_PREFS, ...res.data }))
      .catch(() => toast.error('Could not load saved preferences'));
  }, [user?.id]);

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
    complianceService.getSubmissions().then((res) => {
      setNlrdRecords(
        (res.data ?? []).map((s) => ({
          id: s.id,
          name: s.reference,
          idNo: s.reference,
          type: s.type,
          status: s.status,
        })),
      );
    }).catch(() => undefined);
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
        phone: profilePhone.trim(),
        jobTitle: profileJobTitle.trim(),
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

  const persistPrefs = async () => {
    setSavingPrefs(true);
    try {
      await authService.updatePreferences(prefs);
      toast.success('Preferences saved');
    } catch {
      toast.error('Could not save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const beginMfa = async () => {
    try {
      const setup = await authService.beginMfaEnrollment();
      setMfaSetup(setup);
      setMfaCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start MFA enrollment');
    }
  };

  const confirmMfa = async () => {
    try {
      await authService.confirmMfaEnrollment(mfaCode);
      setMfaEnabled(true);
      setMfaSetup(null);
      setMfaCode('');
      toast.success('Multi-factor authentication enabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid authenticator code');
    }
  };

  const disableMfa = async () => {
    try {
      await authService.disableMfa(mfaPassword, mfaCode);
      setMfaEnabled(false);
      setMfaPassword('');
      setMfaCode('');
      toast.success('Multi-factor authentication disabled; sign in again on other devices');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not disable MFA');
    }
  };

  const handleExportLogs = () => {
    const from = logFrom ? new Date(logFrom) : null;
    const to = logTo ? new Date(`${logTo}T23:59:59`) : null;
    const filtered = logs.filter((row) => {
      const t = Date.parse(row.timestamp);
      if (Number.isNaN(t)) return true;
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
      return true;
    });
    downloadJson(`access-logs-${new Date().toISOString().slice(0, 10)}.json`, filtered);
  };

  const handleRequestDataExport = async () => {
    try {
      await privacyService.requestAccessExport();
      toast.success('POPIA access request submitted');
    } catch {
      toast.error('Could not submit data export request');
    }
  };

  const handleNLRDSubmit = async () => {
    setNlrdLoading(true);
    try {
      const res = await api.nlrd.submit({});
      const subs = await complianceService.getSubmissions();
      setNlrdRecords(
        (subs.data ?? []).map((s) => ({
          id: s.id,
          name: s.reference,
          idNo: s.reference,
          type: s.type,
          status: s.status,
        })),
      );
      toast.success(
        res.success
          ? `Internal NLRD export ${res.batchId ?? ''} generated (not SETA-certified)`
          : 'Internal NLRD export generated (not SETA-certified)',
      );
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

  const [nlrdRecords, setNlrdRecords] = useState<NlrdRecordRow[]>([]);

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
                <p className="text-sm text-gray-500">
                  Profile photo uses your initials. Upload a signature below for
                  document signing.
                </p>
              </div>

              {/* Digital Signature Section */}
              <div className="pt-6 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3">
                  Digital Signature
                </h4>
                <div className="border-2 border-dashed border-gray-300 rounded-lg w-[200px] h-[100px] flex items-center justify-center bg-gray-50 mb-3 overflow-hidden">
                  {hasSignature ? (
                    <span className="text-sm text-green-700">Signature on file</span>
                  ) : (
                    <canvas
                      ref={drawCanvasRef}
                      width={200}
                      height={100}
                      className="cursor-crosshair"
                      onMouseDown={(e) => {
                        setDrawing(true);
                        const ctx = drawCanvasRef.current?.getContext('2d');
                        if (!ctx) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        ctx.beginPath();
                        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                      }}
                      onMouseMove={(e) => {
                        if (!drawing) return;
                        const ctx = drawCanvasRef.current?.getContext('2d');
                        if (!ctx) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                        ctx.stroke();
                      }}
                      onMouseUp={() => setDrawing(false)}
                      onMouseLeave={() => setDrawing(false)}
                    />
                  )}
                </div>
                <div className="flex space-x-3 mb-2">
                  <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Upload className="h-4 w-4" />}
                  onClick={() => signatureInputRef.current?.click()}>
                    Upload Signature
                  </Button>
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void authService
                        .uploadSignature(file)
                        .then(() => {
                          setHasSignature(true);
                          toast.success('Signature uploaded');
                        })
                        .catch(() => toast.error('Could not upload signature'));
                    }}
                  />
                  <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<PenTool className="h-4 w-4" />}
                  onClick={() => {
                    const canvas = drawCanvasRef.current;
                    if (!canvas) {
                      toast.error('Draw a signature first');
                      return;
                    }
                    canvas.toBlob((blob) => {
                      if (!blob) return;
                      const file = new File([blob], 'signature.png', {
                        type: 'image/png',
                      });
                      void authService
                        .uploadSignature(file)
                        .then(() => {
                          setHasSignature(true);
                          toast.success('Signature saved');
                        })
                        .catch(() => toast.error('Could not save signature'));
                    }, 'image/png');
                  }}>
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
                <Input
                  label="Phone Number"
                  placeholder="Optional"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                />
              </div>

              <Input
                label="Job Title"
                placeholder="Optional"
                value={profileJobTitle}
                onChange={(e) => setProfileJobTitle(e.target.value)}
              />
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
            <Card title="Authenticator MFA">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Status: <strong>{mfaEnabled ? 'Enabled' : 'Not enabled'}</strong>.
                  Privileged accounts must enable MFA before production readiness can pass.
                </p>
                {!mfaEnabled && !mfaSetup && (
                  <Button onClick={() => void beginMfa()}>Set up authenticator</Button>
                )}
                {mfaSetup && (
                  <div className="space-y-3 rounded-md border border-gray-200 p-4">
                    <p className="text-sm">Add this key in your authenticator app, then enter its six-digit code.</p>
                    <code className="block break-all rounded bg-gray-100 p-2 text-xs">{mfaSetup.secret}</code>
                    <details className="text-xs text-gray-500">
                      <summary>Authenticator URI</summary>
                      <code className="block break-all pt-2">{mfaSetup.otpauthUri}</code>
                    </details>
                    <Input
                      label="Verification code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <Button disabled={mfaCode.length !== 6} onClick={() => void confirmMfa()}>
                      Verify and enable
                    </Button>
                  </div>
                )}
                {mfaEnabled && (
                  <div className="space-y-3">
                    <Input
                      label="Current password"
                      type="password"
                      value={mfaPassword}
                      onChange={(e) => setMfaPassword(e.target.value)}
                    />
                    <Input
                      label="Authenticator code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <Button
                      variant="outline"
                      disabled={mfaPassword.length < 8 || mfaCode.length !== 6}
                      onClick={() => void disableMfa()}>
                      Disable MFA
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        }

        {activeTab === 'notifications' &&
        <Card title="Notification Preferences">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void persistPrefs();
              }}
              className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Email Notifications
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-navy rounded border-gray-300"
                    checked={prefs.notifyAssessment}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, notifyAssessment: e.target.checked }))
                    } />
                    <span className="text-sm text-gray-700">
                      Assessment submissions
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-navy rounded border-gray-300"
                    checked={prefs.notifyCompliance}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, notifyCompliance: e.target.checked }))
                    } />
                    <span className="text-sm text-gray-700">
                      Compliance alerts
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-navy rounded border-gray-300"
                    checked={prefs.notifyMarketing}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, notifyMarketing: e.target.checked }))
                    } />
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
                    checked={prefs.notifySmsSecurity}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, notifySmsSecurity: e.target.checked }))
                    } />
                    <span className="text-sm text-gray-700">
                      Security alerts
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-navy rounded border-gray-300"
                    checked={prefs.notifySmsUrgent}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, notifySmsUrgent: e.target.checked }))
                    } />
                    <span className="text-sm text-gray-700">
                      Urgent compliance issues
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" isLoading={savingPrefs}>Save Preferences</Button>
              </div>
            </form>
          </Card>
        }

        {activeTab === 'logs' &&
        <Card title="System Access Logs" noPadding>
            <div className="p-4 border-b border-gray-200 flex space-x-4">
              <Input type="date" className="max-w-xs" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} />
              <Input type="date" className="max-w-xs" value={logTo} onChange={(e) => setLogTo(e.target.value)} />
              <Button type="button" variant="outline" onClick={handleExportLogs}>Export Logs</Button>
            </div>
            <DataTable data={logs} columns={logColumns} keyField="id" />
          </Card>
        }

        {activeTab === 'nlrd' &&
        <div className="space-y-6">
            <Card title="NLRD Batch Submission">
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3 mb-6">
                Internal LMS export only — not a certified SETA/QCTO NLRD
                submission.
              </p>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNLRDSubmit}
                  isLoading={nlrdLoading}>
                  Validate Batch
                </Button>
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                persistPrefs();
              }}
              className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                label="Language"
                value={prefs.language}
                onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
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
                value={prefs.timezone}
                onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))}
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
                <Button type="button" variant="outline" onClick={() => void handleRequestDataExport()}>Request Data Export</Button>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Save Preferences</Button>
              </div>
            </form>
          </Card>
        }
      </div>
    </div>);

}
