import { useState, useEffect, useCallback } from 'react';
import { AdminListItem } from '../types/admin-permissions';
import { getAdmins, getAdminById } from '../api/adminApi';

interface UseAdminUsersResult {
  admins: AdminListItem[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setPage: (page: number) => void;
}

export function useAdminUsers(): UseAdminUsersResult {
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdmins({ page, limit: 20 });
      const result = response.data as { data: any[]; total: number };

      // Fetch permissions for each admin
      const adminsWithPerms = await Promise.all(
        (result.data || []).map(async (admin: any) => {
          try {
            const detail = (await getAdminById(admin.id)).data as any;
            return { ...admin, permissions: detail.permissions || [] };
          } catch {
            return { ...admin, permissions: [] };
          }
        }),
      );

      setAdmins(adminsWithPerms);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  return {
    admins,
    total,
    page,
    loading,
    error,
    refetch: fetchAdmins,
    setPage,
  };
}