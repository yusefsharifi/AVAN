import { useCallback } from 'react';
import { hasPermission } from '../utils';
import type { Role } from '../types';

export function usePermission(role: Role = 'company_user') {
  const check = useCallback((resource: string, action: string, dataScope?: string) => {
    return hasPermission(role, resource, action, dataScope);
  }, [role]);

  return { check, role };
}
