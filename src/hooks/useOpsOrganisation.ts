import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setStoredOrganisationId } from '../config/authStorage';
import { organisationService } from '../services/api';

export type OpsOrganisation = {
  id: string;
  name: string;
  type: string;
};

export function useOpsOrganisation() {
  const { user } = useAuth();
  const [organisations, setOrganisations] = useState<OpsOrganisation[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(user?.organisationId ?? '');
  const [loading, setLoading] = useState(true);

  const isPlatformAdmin = user?.role === 'Platform Admin';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await organisationService.list();
        if (cancelled) return;
        const list = res.data ?? [];
        setOrganisations(list);
        const current =
          list.find((o) => o.id === user?.organisationId)?.id ??
          list[0]?.id ??
          '';
        if (current) {
          const org = list.find((o) => o.id === current);
          setSelectedOrgId(current);
          setStoredOrganisationId(current, org?.name);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.organisationId]);

  const selectOrganisation = useCallback(
    (orgId: string) => {
      const org = organisations.find((o) => o.id === orgId);
      setSelectedOrgId(orgId);
      setStoredOrganisationId(orgId, org?.name);
    },
    [organisations],
  );

  const selectedOrg = organisations.find((o) => o.id === selectedOrgId);

  return {
    organisations,
    selectedOrgId,
    selectedOrg,
    selectOrganisation,
    isPlatformAdmin,
    loading,
  };
}
