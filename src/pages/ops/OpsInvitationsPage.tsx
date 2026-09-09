import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  invitationService,
  opsService,
  userService,
} from '../../services/api';
import { useOpsOrganisation } from '../../hooks/useOpsOrganisation';

type InviteRow = {
  id: string;
  email: string;
  role: string;
  organisation: string;
  expiresAt: string;
  mailStatus: string;
};

export function OpsInvitationsPage() {
  const { isPlatformAdmin } = useOpsOrganisation();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [roles, setRoles] = useState<
    Array<{ id: string; code: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, rolesRes] = await Promise.all([
        opsService.listInvitations(),
        userService.listRoles(),
      ]);
      setInvites(
        (invRes.data ?? []).map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role.name,
          organisation: i.organisation.name,
          expiresAt: new Date(i.expiresAt).toLocaleDateString(),
          mailStatus: i.mailStatus,
        })),
      );
      setRoles(
        (rolesRes.data ?? []).filter((r) => r.code !== 'PLATFORM_ADMIN'),
      );
    } catch {
      toast.error('Could not load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns = [
    { header: 'Email', accessorKey: 'email' as const },
    { header: 'Role', accessorKey: 'role' as const },
    ...(isPlatformAdmin
      ? [{ header: 'Organisation', accessorKey: 'organisation' as const }]
      : []),
    {
      header: 'Expires',
      accessorKey: 'expiresAt' as const,
      className: 'hidden sm:table-cell',
    },
    {
      header: 'Mail',
      accessorKey: 'mailStatus' as const,
      cell: (row: InviteRow) => (
        <Badge
          variant={
            row.mailStatus === 'SENT'
              ? 'success'
              : row.mailStatus === 'FAILED'
                ? 'danger'
                : 'neutral'
          }>
          {row.mailStatus}
        </Badge>
      ),
    },
    {
      header: '',
      accessorKey: 'id' as const,
      cell: (row: InviteRow) =>
        row.mailStatus === 'FAILED' ? (
          <button
            type="button"
            onClick={async () => {
              try {
                await invitationService.retryMail(row.id);
                toast.success('Mail retry queued');
                await load();
              } catch {
                toast.error('Retry failed');
              }
            }}
            className="text-brand-navy hover:underline text-sm inline-flex items-center gap-1">
            <RefreshCw size={14} />
            Retry
          </button>
        ) : null,
    },
  ];

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '');
    const roleId = String(fd.get('roleId') ?? '');
    try {
      const result = await invitationService.create({ email, roleId });
      toast[result.data.mailStatus === 'SENT' ? 'success' : 'error'](
        result.data.mailStatus === 'SENT'
          ? 'Invitation sent.'
          : 'Invitation created, but delivery failed and was queued for retry.',
      );
      setShowModal(false);
      await load();
    } catch {
      toast.error('Could not send invitation');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invitations</h1>
          <p className="text-gray-500 mt-1">
            Invite staff and learners to register via email link.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Send invitation
        </Button>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={invites} keyField="id" />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Send invitation">
        <form onSubmit={handleInvite} className="space-y-4">
          <Input name="email" type="email" label="Email" required />
          <Select
            name="roleId"
            label="Role"
            required
            options={[
              { value: '', label: 'Select role…' },
              ...roles.map((r) => ({ value: r.id, label: r.name })),
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Send</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
