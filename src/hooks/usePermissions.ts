import { useState, useEffect, useCallback } from 'react';
import { PermissionName } from '../types/admin-permissions';
import { getAdminById as apiGetAdminById } from '../api/adminApi';

interface UsePermissionsResult {
  permissions: PermissionName[];
  hasPermission: (permission: PermissionName) => boolean;
  hasAnyPermission: (permissions: PermissionName[]) => boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePermissions(userId?: string): UsePermissionsResult {
  const [permissions, setPermissions] = useState<PermissionName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiGetAdminById(userId);
      const perms = (response.data as any).permissions || [];
      setPermissions(perms);
    } catch (err: any) {
      setError(err?.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (permission: PermissionName): boolean => {
      return permissions.includes(permission);
    },
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (perms: PermissionName[]): boolean => {
      return perms.some((p) => permissions.includes(p));
    },
    [permissions],
  );

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    loading,
    error,
    refetch: fetchPermissions,
  };
}